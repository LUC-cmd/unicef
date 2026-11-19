package tg.fildor.service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.RappelRepository.Identite;

/**
 * Naissance signalée par une famille. Elle n'a jamais la valeur d'une déclaration d'agent : l'agent de la zone la
 * vérifie (preuve, date, doublon) avant qu'elle ne parte à la mairie. Le motif d'un refus est expliqué à la famille.
 */
@Service
public class SignalementNaissanceService {

    public record Saisie(String telephone, String codeFamille, String codeEnfant, LocalDate dateNaissance,
                         String heureNaissance, String precisionDate, String lieu, String preuve, String mereNom,
                         String pereNom, String enfantPrenom, boolean accordNoms) {
    }

    /** Ce que voit la famille. */
    public record VueFamille(long id, String codeEnfant, LocalDate dateNaissance, String statut, String motif,
                             LocalDate envoyeLe) {
    }

    /** Ce que voit l'agent, avec les alertes calculées. */
    public record VueAgent(long id, String codeEnfant, String codeFamille, LocalDate dateNaissance, String heureNaissance,
                           String precisionDate, String lieu, String preuve, String mereNom, String pereNom,
                           String enfantPrenom, boolean accordNoms, String statut, String motif, LocalDate envoyeLe,
                           List<String> alertes) {
    }

    private final JdbcClient jdbc;
    private final AccesFamille accesFamille;
    private final AccesService acces;
    private final Clock clock;

    public SignalementNaissanceService(JdbcClient jdbc, AccesFamille accesFamille, AccesService acces, Clock clock) {
        this.jdbc = jdbc;
        this.accesFamille = accesFamille;
        this.acces = acces;
        this.clock = clock;
    }

    public VueFamille signaler(Saisie s) {
        Identite f = accesFamille.verifier(s.telephone(), s.codeFamille());
        LocalDate auj = LocalDate.now(clock);
        if (s.dateNaissance() == null || s.dateNaissance().isAfter(auj)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de naissance ne peut pas être dans le futur");
        }
        if (s.dateNaissance().isBefore(auj.minusYears(5))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Naissance trop ancienne : voyez votre agent de santé");
        }
        String precision = s.precisionDate() == null || s.precisionDate().isBlank() ? "EXACTE" : s.precisionDate();
        if (!List.of("EXACTE", "APPROXIMATIVE", "INCONNUE").contains(precision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Précision de la date invalide");
        }
        if (!List.of("CENTRE_SANTE", "DOMICILE").contains(s.lieu())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lieu de naissance invalide");
        }
        if (s.heureNaissance() != null && !s.heureNaissance().isBlank()
                && !s.heureNaissance().matches("([01][0-9]|2[0-3]):[0-5][0-9]")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Heure de naissance invalide (HH:mm)");
        }
        Integer appartient = jdbc.sql("SELECT COUNT(*) FROM enfant WHERE famille_id = :f AND code_enfant = :c")
                .param("f", f.familleId()).param("c", s.codeEnfant()).query(Integer.class).single();
        if (appartient == null || appartient == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cet enfant n'appartient pas à votre famille");
        }
        boolean noms = s.accordNoms();
        try {
            long id = jdbc.sql("""
                    INSERT INTO signalement_naissance (famille_id, code_enfant, date_naissance, heure_naissance,
                        precision_date, lieu, preuve, mere_nom, pere_nom, enfant_prenom, accord_noms)
                    VALUES (:f, :c, :d, :h, :p, :l, :pr, :m, :pe, :e, :a) RETURNING id""")
                    .param("f", f.familleId()).param("c", s.codeEnfant()).param("d", s.dateNaissance())
                    .param("h", vide(s.heureNaissance())).param("p", precision).param("l", s.lieu())
                    .param("pr", coupe(s.preuve(), 120)).param("m", noms ? coupe(s.mereNom(), 120) : null)
                    .param("pe", noms ? coupe(s.pereNom(), 120) : null).param("e", noms ? coupe(s.enfantPrenom(), 60) : null)
                    .param("a", noms).query(Long.class).single();
            return new VueFamille(id, s.codeEnfant(), s.dateNaissance(), "A_VERIFIER", null, auj);
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une déclaration de cet enfant attend déjà la vérification de l'agent");
        }
    }

    public List<VueFamille> deLaFamille(String telephone, String codeFamille) {
        Identite f = accesFamille.verifier(telephone, codeFamille);
        return jdbc.sql("""
                SELECT id, code_enfant, date_naissance, statut, motif, cree_le FROM signalement_naissance
                WHERE famille_id = :f ORDER BY id DESC""")
                .param("f", f.familleId())
                .query((rs, n) -> new VueFamille(rs.getLong("id"), rs.getString("code_enfant"),
                        rs.getObject("date_naissance", LocalDate.class), rs.getString("statut"), rs.getString("motif"),
                        rs.getTimestamp("cree_le").toLocalDateTime().toLocalDate()))
                .list();
    }

    public List<VueAgent> pourAgent(AppUser u) {
        LocalDate auj = LocalDate.now(clock);
        return jdbc.sql("""
                SELECT s.id, s.code_enfant, f.code_famille, s.date_naissance, s.heure_naissance, s.precision_date, s.lieu,
                       s.preuve, s.mere_nom, s.pere_nom, s.enfant_prenom, s.accord_noms, s.statut, s.motif, s.cree_le,
                       e.date_naissance AS date_carnet,
                       (SELECT COUNT(*) FROM declaration_naissance d JOIN enfant e2 ON e2.id = d.enfant_id
                         WHERE e2.code_enfant = s.code_enfant) AS deja
                FROM signalement_naissance s
                JOIN famille f ON f.id = s.famille_id
                LEFT JOIN enfant e ON e.code_enfant = s.code_enfant
                WHERE (CAST(:z AS BIGINT) IS NULL OR f.zone_id = CAST(:z AS BIGINT))
                  AND (s.statut = 'A_VERIFIER' OR s.traite_le > now() - INTERVAL '7 days')
                ORDER BY (s.statut = 'A_VERIFIER') DESC, s.id DESC""")
                .param("z", u.zoneId())
                .query((rs, n) -> {
                    LocalDate naissance = rs.getObject("date_naissance", LocalDate.class);
                    LocalDate carnet = rs.getObject("date_carnet", LocalDate.class);
                    List<String> alertes = new ArrayList<>();
                    if (rs.getString("preuve") == null) {
                        alertes.add("Aucune preuve indiquée (certificat ou centre de santé)");
                    }
                    if (rs.getInt("deja") > 0) {
                        alertes.add("Une déclaration existe déjà pour cet enfant");
                    }
                    if (carnet != null && !carnet.equals(naissance)) {
                        alertes.add("La date diffère de celle du carnet (" + carnet + ")");
                    }
                    if (ChronoUnit.DAYS.between(naissance, auj) > 45) {
                        alertes.add("Plus de 45 jours : la déclaration n'est plus gratuite");
                    }
                    if ("INCONNUE".equals(rs.getString("precision_date"))) {
                        alertes.add("Date inconnue : jugement supplétif probable");
                    }
                    return new VueAgent(rs.getLong("id"), rs.getString("code_enfant"), rs.getString("code_famille"),
                            naissance, rs.getString("heure_naissance"), rs.getString("precision_date"),
                            rs.getString("lieu"), rs.getString("preuve"), rs.getString("mere_nom"),
                            rs.getString("pere_nom"), rs.getString("enfant_prenom"), rs.getBoolean("accord_noms"),
                            rs.getString("statut"), rs.getString("motif"),
                            rs.getTimestamp("cree_le").toLocalDateTime().toLocalDate(), alertes);
                })
                .list();
    }

    /** L'agent confirme (après avoir déclaré à la mairie) ou refuse avec un motif lisible par la famille. */
    public void traiter(AppUser u, long id, boolean confirme, String motif) {
        if (!confirme && (motif == null || motif.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indiquez le motif du refus : la famille le verra");
        }
        int n = jdbc.sql("""
                UPDATE signalement_naissance s SET statut = :st, motif = :m, traite_le = :t
                FROM famille f
                WHERE s.id = :id AND f.id = s.famille_id AND s.statut = 'A_VERIFIER' AND (CAST(:z AS BIGINT) IS NULL OR f.zone_id = CAST(:z AS BIGINT))""")
                .param("st", confirme ? "CONFIRME" : "REFUSE").param("m", confirme ? null : coupe(motif, 200))
                .param("t", Timestamp.from(clock.instant())).param("id", id).param("z", u.zoneId()).update();
        if (n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Déclaration introuvable ou déjà traitée");
        }
        acces.tracer(u, confirme ? "CONFIRMER_NAISSANCE_FAMILLE" : "REFUSER_NAISSANCE_FAMILLE", String.valueOf(id));
    }

    private static String vide(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static String coupe(String s, int max) {
        String t = vide(s);
        return t == null ? null : t.length() > max ? t.substring(0, max) : t;
    }
}
