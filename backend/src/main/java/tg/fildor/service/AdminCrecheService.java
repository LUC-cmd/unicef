package tg.fildor.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ComptesRepository;

/**
 * Création des crèches par l'administrateur : la structure, ses conditions d'accueil et, si on le demande, le compte de
 * son responsable (mot de passe provisoire montré une seule fois). Une crèche créée apparaît tout de suite aux familles.
 */
@Service
public class AdminCrecheService {

    private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final List<String> JOURS = List.of("LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM");

    public record Nouvelle(String nom, String codeZone, String telephone, Double latitude, Double longitude,
                           int capacite, int ageMinMois, int ageMaxMois, String ouverture, String fermeture,
                           String jours, String tarif, String conditions, String aApporter, boolean besoinsSpecifiques,
                           String usernameResponsable, String nomResponsable) {
    }

    public record Ligne(String code, String nom, String codeZone, String nomZone, String telephone, int capacite,
                        int ageMinMois, int ageMaxMois, String horaires, boolean actif, long comptes) {
    }

    private final JdbcClient jdbc;
    private final ComptesRepository comptes;
    private final PasswordEncoder encoder;
    private final AccesService acces;
    private final SecureRandom hasard = new SecureRandom();

    public AdminCrecheService(JdbcClient jdbc, ComptesRepository comptes, PasswordEncoder encoder, AccesService acces) {
        this.jdbc = jdbc;
        this.comptes = comptes;
        this.encoder = encoder;
        this.acces = acces;
    }

    public List<Ligne> lister() {
        return jdbc.sql("""
                SELECT s.code, s.nom, z.code AS zone_code, z.nom AS zone_nom, s.telephone, o.capacite, o.age_min_mois,
                       o.age_max_mois, s.horaires, s.actif,
                       (SELECT COUNT(*) FROM app_user u WHERE u.structure_id = s.id) AS comptes
                FROM structure s JOIN zone z ON z.id = s.zone_id JOIN creche_offre o ON o.structure_id = s.id
                WHERE s.type = 'CRECHE' ORDER BY z.nom, s.nom""")
                .query((rs, n) -> new Ligne(rs.getString("code"), rs.getString("nom"), rs.getString("zone_code"),
                        rs.getString("zone_nom"), rs.getString("telephone"), rs.getInt("capacite"),
                        rs.getInt("age_min_mois"), rs.getInt("age_max_mois"), rs.getString("horaires"),
                        rs.getBoolean("actif"), rs.getLong("comptes")))
                .list();
    }

    @Transactional
    public Map<String, Object> creer(AppUser admin, Nouvelle c) {
        String nom = c.nom() == null ? "" : c.nom().trim();
        if (nom.length() < 3 || nom.length() > 120) {
            throw new IllegalArgumentException("Indiquez le nom de la crèche (3 à 120 caractères)");
        }
        if (c.codeZone() == null || !comptes.zoneExiste(c.codeZone())) {
            throw new IllegalArgumentException("Choisissez la préfecture de la crèche");
        }
        if (c.capacite() < 1 || c.capacite() > 200) {
            throw new IllegalArgumentException("Capacité invalide (1 à 200 enfants)");
        }
        if (c.ageMinMois() < 0 || c.ageMaxMois() > 72 || c.ageMinMois() >= c.ageMaxMois()) {
            throw new IllegalArgumentException("Âges invalides (en mois, de 0 à 72)");
        }
        LocalTime ouv = heure(c.ouverture(), "l'ouverture");
        LocalTime fer = heure(c.fermeture(), "la fermeture");
        if (!ouv.isBefore(fer)) {
            throw new IllegalArgumentException("La fermeture doit être après l'ouverture");
        }
        String jours = c.jours() == null ? "" : c.jours().trim().toUpperCase();
        if (jours.isEmpty() || !JOURS.containsAll(List.of(jours.split(",")))) {
            throw new IllegalArgumentException("Jours invalides : LUN,MAR,MER,JEU,VEN,SAM,DIM");
        }
        if (c.latitude() != null && (c.latitude() < 5 || c.latitude() > 12 || c.longitude() == null
                || c.longitude() < -1 || c.longitude() > 2)) {
            throw new IllegalArgumentException("Position hors du Togo : vérifiez la latitude et la longitude");
        }
        String username = c.usernameResponsable() == null ? "" : c.usernameResponsable().trim();
        boolean avecCompte = !username.isEmpty();
        if (avecCompte) {
            if (!username.matches("[a-z0-9._-]{3,40}")) {
                throw new IllegalArgumentException("Identifiant du responsable : 3 à 40 lettres minuscules, chiffres, . _ -");
            }
            if (comptes.existe(username)) {
                throw new IllegalArgumentException("Cet identifiant existe déjà");
            }
        }
        long n = comptes.compterStructures("CRECHE", c.codeZone()) + 1;
        String code = "CR-" + c.codeZone() + "-" + n;
        while (jdbc.sql("SELECT COUNT(*) FROM structure WHERE code = :c").param("c", code).query(Long.class).single() > 0) {
            n++;
            code = "CR-" + c.codeZone() + "-" + n;
        }
        String tel = c.telephone() == null || c.telephone().isBlank() ? null : c.telephone().trim();
        comptes.creerStructure(code, "CRECHE", nom, c.codeZone(), tel);
        jdbc.sql("""
                UPDATE structure SET horaires = :h, besoins_specifiques = :b, latitude = :lat, longitude = :lon
                WHERE code = :c""")
                .param("h", ouv + " - " + fer).param("b", c.besoinsSpecifiques())
                .param("lat", c.latitude() == null ? null : BigDecimal.valueOf(c.latitude()))
                .param("lon", c.longitude() == null ? null : BigDecimal.valueOf(c.longitude()))
                .param("c", code).update();
        jdbc.sql("""
                INSERT INTO creche_offre (structure_id, age_min_mois, age_max_mois, capacite, ouverture, fermeture, jours,
                                          conditions, a_apporter, tarif)
                VALUES ((SELECT id FROM structure WHERE code = :c), :amin, :amax, :cap, :ouv, :fer, :j, :cond, :app, :tar)""")
                .param("c", code).param("amin", c.ageMinMois()).param("amax", c.ageMaxMois()).param("cap", c.capacite())
                .param("ouv", java.sql.Time.valueOf(ouv)).param("fer", java.sql.Time.valueOf(fer)).param("j", jours)
                .param("cond", limiter(c.conditions(), 600)).param("app", limiter(c.aApporter(), 600))
                .param("tar", limiter(c.tarif(), 200)).update();
        Map<String, Object> retour = new LinkedHashMap<>();
        retour.put("code", code);
        if (avecCompte) {
            String provisoire = motDePasse();
            String responsable = c.nomResponsable() == null || c.nomResponsable().isBlank()
                    ? "Responsable " + nom : c.nomResponsable().trim();
            comptes.creer(username, encoder.encode(provisoire), responsable, "STRUCTURE", null, null, code);
            retour.put("username", username);
            retour.put("motDePasseProvisoire", provisoire);
        }
        acces.tracer(admin, "CREER_CRECHE", code);
        return retour;
    }

    @Transactional
    public void definirActif(AppUser admin, String code, boolean actif) {
        int n = jdbc.sql("UPDATE structure SET actif = :a, mis_a_jour_le = now() WHERE code = :c AND type = 'CRECHE'")
                .param("a", actif).param("c", code).update();
        if (n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Crèche introuvable");
        }
        acces.tracer(admin, actif ? "REACTIVER_CRECHE" : "DESACTIVER_CRECHE", code);
    }

    private static LocalTime heure(String h, String quoi) {
        try {
            return LocalTime.parse(h == null ? "" : h.trim());
        } catch (java.time.format.DateTimeParseException e) {
            throw new IllegalArgumentException("Heure invalide pour " + quoi + " (format HH:mm)");
        }
    }

    private static String limiter(String t, int max) {
        String s = t == null ? "" : t.trim();
        if (s.length() > max) {
            throw new IllegalArgumentException("Texte trop long (" + max + " caractères au plus)");
        }
        return s;
    }

    private String motDePasse() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(ALPHABET.charAt(hasard.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
