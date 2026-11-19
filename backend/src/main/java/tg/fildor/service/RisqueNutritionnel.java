package tg.fildor.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Calcule le score de risque nutritionnel composite pour un enfant.
 * Les règles combinent la mesure anthropométrique (MUAC), le respect des rendez-vous,
 * l'historique des rappels, la régularité des pesées et les facteurs de vulnérabilité familiale.
 *
 * Principes :
 * - Les raisons sont toujours explicitées pour guider l'agent de santé ou le soignant.
 * - Aucune donnée superflue n'est manipulée (privacy-by-design).
 * - Orientation et aide à la décision : ne remplace pas un avis médical.
 */
@Service
public class RisqueNutritionnel {

    public enum Niveau {
        CRITIQUE,
        A_RISQUE,
        A_SURVEILLER,
        NORMAL
    }

    /**
     * Résultat de l'évaluation du risque nutritionnel.
     *
     * @param score score composite calculé
     * @param niveau niveau de risque (CRITIQUE, A_RISQUE, A_SURVEILLER, NORMAL)
     * @param raisons liste explicative des critères ayant contribué au score
     * @param recommandation consigne d'action adaptée au niveau de risque
     */
    public record Evaluation(int score, Niveau niveau, List<String> raisons, String recommandation) {
        public int getScore() { return score; }
        public Niveau getNiveau() { return niveau; }
        public List<String> getRaisons() { return raisons; }
        public String getRecommandation() { return recommandation; }
    }

    /**
     * Données d'indicateurs nutritionnels nécessaires au calcul.
     */
    public record DonneesNutritionnelles(Integer muacMm, int retardMaxJours, int rappelsSansReponse,
                                         boolean absencePoids60Jours, boolean mereAdolescente) {
    }

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    @Autowired
    public RisqueNutritionnel(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    public RisqueNutritionnel(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, Clock.system(ZoneId.of("Africa/Lome")));
    }

    public RisqueNutritionnel() {
        this(null, Clock.system(ZoneId.of("Africa/Lome")));
    }

    /**
     * Calcule le score de risque nutritionnel de façon pure à partir des critères fournis.
     */
    public Evaluation calculer(Integer muacMm, int retardMaxJours, int rappelsSansReponse,
                               boolean absencePoids60Jours, boolean mereAdolescente) {
        int score = 0;
        List<String> raisons = new ArrayList<>();

        // 1. Périmètre brachial (MUAC) : <115mm = +40, 115-125mm = +25
        if (muacMm != null) {
            if (muacMm < 115) {
                score += 40;
                raisons.add("Périmètre brachial critique (" + muacMm + " mm) : malnutrition aiguë sévère");
            } else if (muacMm <= 125) {
                score += 25;
                raisons.add("Périmètre brachial bas (" + muacMm + " mm) : malnutrition modérée");
            }
        }

        // 2. Retard de rendez-vous >30 jours = +15
        if (retardMaxJours > 30) {
            score += 15;
            raisons.add("Retard de rendez-vous supérieur à 30 jours");
        }

        // 3. Nombre de rappels sans réponse : +5 par rappel (max 20)
        if (rappelsSansReponse > 0) {
            int pointsRappels = Math.min(rappelsSansReponse * 5, 20);
            score += pointsRappels;
            raisons.add(rappelsSansReponse == 1
                    ? "Un rappel est resté sans réponse"
                    : rappelsSansReponse + " rappels sont restés sans réponse");
        }

        // 4. Absence de poids mesuré dans les 60 derniers jours = +10
        if (absencePoids60Jours) {
            score += 10;
            raisons.add("Absence de poids mesuré dans les 60 derniers jours");
        }

        // 5. Mère adolescente (<18 ans) = +10
        if (mereAdolescente) {
            score += 10;
            raisons.add("Mère adolescente (<18 ans) : vulnérabilité accrue");
        }

        // Détermination du niveau selon les seuils établis
        Niveau niveau;
        if (score >= 60) {
            niveau = Niveau.CRITIQUE;
        } else if (score >= 35) {
            niveau = Niveau.A_RISQUE;
        } else if (score >= 15) {
            niveau = Niveau.A_SURVEILLER;
        } else {
            niveau = Niveau.NORMAL;
        }

        // Recommandations personnalisées par niveau
        String recommandation = switch (niveau) {
            case CRITIQUE -> "Référer immédiatement vers un centre de récupération nutritionnelle";
            case A_RISQUE -> "Renforcer le suivi nutritionnel, peser chaque semaine";
            case A_SURVEILLER -> "Maintenir les rendez-vous et surveiller l'alimentation";
            case NORMAL -> "Continuer le suivi habituel";
        };

        return new Evaluation(score, niveau, List.copyOf(raisons), recommandation);
    }

    /**
     * Variante acceptant l'objet DonneesNutritionnelles.
     */
    public Evaluation calculer(DonneesNutritionnelles d) {
        return calculer(d.muacMm(), d.retardMaxJours(), d.rappelsSansReponse(),
                d.absencePoids60Jours(), d.mereAdolescente());
    }

    /**
     * Évalue le risque nutritionnel d'un enfant en lisant les données en base via son code enfant.
     */
    public Evaluation evaluer(String codeEnfant, LocalDate aujourdhui) {
        if (jdbcTemplate == null) {
            throw new IllegalStateException("JdbcTemplate n'est pas configuré");
        }
        String sql = """
                SELECT e.id, f.mere_adolescente,
                       (SELECT v.muac_mm FROM visite v WHERE v.enfant_id = e.id AND v.muac_mm IS NOT NULL
                        ORDER BY v.date_visite DESC, v.id DESC LIMIT 1) AS dernier_muac_mm,
                       (SELECT COALESCE(max(CAST(? AS DATE) - r.date_prevue), 0) FROM rendez_vous r
                        WHERE r.enfant_id = e.id AND (r.statut = 'MANQUE' OR (r.statut = 'PLANIFIE' AND r.date_prevue < CAST(? AS DATE)))) AS retard_max_jours,
                       (SELECT count(*) FROM rappel ra JOIN rendez_vous r ON r.id = ra.rendez_vous_id
                        WHERE r.enfant_id = e.id AND ra.statut = 'SANS_REPONSE') AS rappels_sans_reponse,
                       (SELECT max(v.date_visite) FROM visite v WHERE v.enfant_id = e.id AND v.poids_g IS NOT NULL) AS derniere_pesee
                FROM enfant e
                JOIN famille f ON f.id = e.famille_id
                WHERE e.code_enfant = ?
                """;

        List<Evaluation> resultats = jdbcTemplate.query(sql, (rs, rowNum) -> {
            Integer muac = rs.getObject("dernier_muac_mm", Integer.class);
            int retard = rs.getInt("retard_max_jours");
            int rappels = rs.getInt("rappels_sans_reponse");
            LocalDate dernierePesee = rs.getObject("derniere_pesee", LocalDate.class);
            boolean absencePoids = dernierePesee == null || dernierePesee.isBefore(aujourdhui.minusDays(60));
            boolean mereAdo = rs.getBoolean("mere_adolescente");
            return calculer(muac, retard, rappels, absencePoids, mereAdo);
        }, aujourdhui, aujourdhui, codeEnfant);

        if (resultats.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Enfant introuvable : " + codeEnfant);
        }
        return resultats.get(0);
    }

    /**
     * Évalue le risque pour la date du jour courante de l'horloge.
     */
    public Evaluation evaluer(String codeEnfant) {
        return evaluer(codeEnfant, LocalDate.now(clock));
    }

    /**
     * Évalue le risque nutritionnel d'un enfant en lisant les données en base via son identifiant technique.
     */
    public Evaluation evaluer(long enfantId, LocalDate aujourdhui) {
        if (jdbcTemplate == null) {
            throw new IllegalStateException("JdbcTemplate n'est pas configuré");
        }
        String sql = """
                SELECT e.id, f.mere_adolescente,
                       (SELECT v.muac_mm FROM visite v WHERE v.enfant_id = e.id AND v.muac_mm IS NOT NULL
                        ORDER BY v.date_visite DESC, v.id DESC LIMIT 1) AS dernier_muac_mm,
                       (SELECT COALESCE(max(CAST(? AS DATE) - r.date_prevue), 0) FROM rendez_vous r
                        WHERE r.enfant_id = e.id AND (r.statut = 'MANQUE' OR (r.statut = 'PLANIFIE' AND r.date_prevue < CAST(? AS DATE)))) AS retard_max_jours,
                       (SELECT count(*) FROM rappel ra JOIN rendez_vous r ON r.id = ra.rendez_vous_id
                        WHERE r.enfant_id = e.id AND ra.statut = 'SANS_REPONSE') AS rappels_sans_reponse,
                       (SELECT max(v.date_visite) FROM visite v WHERE v.enfant_id = e.id AND v.poids_g IS NOT NULL) AS derniere_pesee
                FROM enfant e
                JOIN famille f ON f.id = e.famille_id
                WHERE e.id = ?
                """;

        List<Evaluation> resultats = jdbcTemplate.query(sql, (rs, rowNum) -> {
            Integer muac = rs.getObject("dernier_muac_mm", Integer.class);
            int retard = rs.getInt("retard_max_jours");
            int rappels = rs.getInt("rappels_sans_reponse");
            LocalDate dernierePesee = rs.getObject("derniere_pesee", LocalDate.class);
            boolean absencePoids = dernierePesee == null || dernierePesee.isBefore(aujourdhui.minusDays(60));
            boolean mereAdo = rs.getBoolean("mere_adolescente");
            return calculer(muac, retard, rappels, absencePoids, mereAdo);
        }, aujourdhui, aujourdhui, enfantId);

        if (resultats.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Enfant introuvable : " + enfantId);
        }
        return resultats.get(0);
    }
}
