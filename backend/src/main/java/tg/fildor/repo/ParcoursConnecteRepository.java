package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Les faits dont on a besoin pour relier les six étapes d'un enfant, et pour repérer où il se perd. */
@Repository
public class ParcoursConnecteRepository {

    public record Faits(int consultationsFaites, int vaccinsFaits, int vaccinsManques, int activitesEveil,
                        int visites, Integer dernierMuacMm, String statutDeclaration, boolean acteRetire,
                        LocalDate actePretLe, LocalDate prescolaireLe, Integer poidsNaissanceG,
                        boolean visiteSemaine1) {
    }

    public record Rupture(String zone, long familles, long grossesseSansNaissance, long naissanceSansDeclaration,
                          long acteNonRetire, long vaccineSansEveil, long troisCinqAns, long troisCinqAnsAuPrescolaire,
                          long petitPoidsSansVisite) {
    }

    public record Fragile(String codeEnfant, String codeFamille, String zone, LocalDate dateNaissance, int poidsG,
                          boolean j1, boolean j3, boolean j7) {
    }

    public record Progres(String zone, String trimestre, int hygiene, int vaccination, int nutrition) {
    }

    private final JdbcClient jdbc;

    public ParcoursConnecteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Faits faits(long enfantId) {
        return jdbc.sql("""
                SELECT
                  (SELECT count(*) FROM rendez_vous r WHERE r.enfant_id = e.id AND r.type = 'CONSULTATION_PRENATALE' AND r.statut = 'REALISE') AS cpn,
                  (SELECT count(*) FROM rendez_vous r WHERE r.enfant_id = e.id AND r.type = 'VACCIN' AND r.statut = 'REALISE') AS vac_faits,
                  (SELECT count(*) FROM rendez_vous r WHERE r.enfant_id = e.id AND r.type = 'VACCIN' AND r.statut = 'MANQUE') AS vac_manques,
                  (SELECT count(*) FROM activite_eveil a WHERE a.enfant_id = e.id) AS eveil,
                  (SELECT count(*) FROM visite v WHERE v.enfant_id = e.id) AS visites,
                  (SELECT v.muac_mm FROM visite v WHERE v.enfant_id = e.id AND v.muac_mm IS NOT NULL ORDER BY v.date_visite DESC LIMIT 1) AS muac,
                  COALESCE(d.statut, CASE WHEN e.acte_externe IS NOT NULL THEN 'VALIDEE' END) AS decl,
                  (d.acte_retire_le IS NOT NULL OR e.acte_externe = 'RETIRE') AS retire,
                  COALESCE(d.acte_pret_le::date, CASE WHEN e.acte_externe = 'ETABLI' THEN e.date_naissance END) AS pret,
                  e.prescolaire_le, e.poids_naissance_g,
                  EXISTS (SELECT 1 FROM visite v WHERE v.enfant_id = e.id AND e.date_naissance IS NOT NULL
                          AND v.date_visite <= e.date_naissance + 7) AS sem1
                FROM enfant e LEFT JOIN declaration_naissance d ON d.enfant_id = e.id
                WHERE e.id = :id""")
                .param("id", enfantId)
                .query((rs, n) -> new Faits(rs.getInt("cpn"), rs.getInt("vac_faits"), rs.getInt("vac_manques"),
                        rs.getInt("eveil"), rs.getInt("visites"), (Integer) rs.getObject("muac"), rs.getString("decl"),
                        rs.getBoolean("retire"), rs.getObject("pret", LocalDate.class),
                        rs.getObject("prescolaire_le", LocalDate.class), (Integer) rs.getObject("poids_naissance_g"),
                        rs.getBoolean("sem1")))
                .single();
    }

    public void fixerPrescolaire(long enfantId, LocalDate date) {
        jdbc.sql("UPDATE enfant SET prescolaire_le = :d WHERE id = :id").param("d", date).param("id", enfantId).update();
    }

    public List<String> besoins(long familleId) {
        return jdbc.sql("SELECT type FROM besoin_social WHERE famille_id = :f AND traite_le IS NULL ORDER BY type")
                .param("f", familleId).query(String.class).list();
    }

    public void remplacerBesoins(long familleId, List<String> types, LocalDate aujourdhui) {
        for (String actuel : besoins(familleId)) {
            if (!types.contains(actuel)) {
                jdbc.sql("UPDATE besoin_social SET traite_le = :d WHERE famille_id = :f AND type = :t")
                        .param("d", aujourdhui).param("f", familleId).param("t", actuel).update();
            }
        }
        for (String t : types) {
            jdbc.sql("""
                    INSERT INTO besoin_social (famille_id, type, signale_le) VALUES (:f, :t, :d)
                    ON CONFLICT (famille_id, type) DO UPDATE SET traite_le = NULL""")
                    .param("f", familleId).param("t", t).param("d", aujourdhui).update();
        }
    }

    /** Les ruptures entre étapes, zone par zone (comptages seulement). */
    public List<Rupture> ruptures(LocalDate auj, String region) {
        return jdbc.sql("""
                SELECT z.nom AS zone,
                  (SELECT count(*) FROM famille f WHERE f.zone_id = z.id AND f.consentement) AS familles,
                  count(*) FILTER (WHERE e.statut = 'GROSSESSE' AND e.date_terme_prevue < CAST(:auj AS DATE) - 30) AS gsn,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.date_naissance < CAST(:auj AS DATE) - 45 AND d.id IS NULL AND e.acte_externe IS NULL) AS nsd,
                  count(*) FILTER (WHERE (d.statut = 'VALIDEE' AND d.acte_pret_le IS NOT NULL AND d.acte_retire_le IS NULL) OR e.acte_externe = 'ETABLI') AS anr,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.date_naissance <= CAST(:auj AS DATE) - 180 AND e.date_naissance > CAST(:auj AS DATE) - 1095
                       AND EXISTS (SELECT 1 FROM rendez_vous r WHERE r.enfant_id = e.id AND r.type = 'VACCIN' AND r.statut = 'REALISE')
                       AND NOT EXISTS (SELECT 1 FROM activite_eveil a WHERE a.enfant_id = e.id)) AS vse,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.date_naissance <= CAST(:auj AS DATE) - 1095 AND e.date_naissance > CAST(:auj AS DATE) - 2190) AS t35,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.date_naissance <= CAST(:auj AS DATE) - 1095 AND e.date_naissance > CAST(:auj AS DATE) - 2190
                       AND e.prescolaire_le IS NOT NULL) AS t35p,
                  count(*) FILTER (WHERE e.poids_naissance_g < 2500 AND e.date_naissance <= CAST(:auj AS DATE) - 7
                       AND NOT EXISTS (SELECT 1 FROM visite v WHERE v.enfant_id = e.id AND v.date_visite <= e.date_naissance + 7)) AS pps
                FROM zone z
                JOIN famille f ON f.zone_id = z.id AND f.consentement
                JOIN enfant e ON e.famille_id = f.id
                LEFT JOIN declaration_naissance d ON d.enfant_id = e.id
                WHERE (CAST(:region AS VARCHAR) IS NULL OR z.region = CAST(:region AS VARCHAR))
                GROUP BY z.id, z.nom ORDER BY z.nom""")
                .param("auj", auj).param("region", region)
                .query((rs, n) -> new Rupture(rs.getString("zone"), rs.getLong("familles"), rs.getLong("gsn"),
                        rs.getLong("nsd"), rs.getLong("anr"), rs.getLong("vse"), rs.getLong("t35"), rs.getLong("t35p"),
                        rs.getLong("pps")))
                .list();
    }

    public List<Progres> progres(String region) {
        return jdbc.sql("""
                SELECT z.nom, p.trimestre, p.hygiene, p.vaccination, p.nutrition
                FROM progres_trimestre p JOIN zone z ON z.id = p.zone_id
                WHERE (CAST(:region AS VARCHAR) IS NULL OR z.region = CAST(:region AS VARCHAR)) ORDER BY z.nom, p.trimestre""")
                .param("region", region)
                .query((rs, n) -> new Progres(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getInt(4), rs.getInt(5)))
                .list();
    }

    /** Nouveau-nés de petit poids nés depuis moins de 15 jours, dans la zone de l'agent. */
    public List<Fragile> fragiles(Long zoneId, LocalDate auj) {
        return jdbc.sql("""
                SELECT e.code_enfant, f.code_famille, z.nom AS zone, e.date_naissance, e.poids_naissance_g,
                  EXISTS (SELECT 1 FROM visite v WHERE v.enfant_id = e.id AND v.date_visite BETWEEN e.date_naissance AND e.date_naissance + 1) AS j1,
                  EXISTS (SELECT 1 FROM visite v WHERE v.enfant_id = e.id AND v.date_visite BETWEEN e.date_naissance + 2 AND e.date_naissance + 3) AS j3,
                  EXISTS (SELECT 1 FROM visite v WHERE v.enfant_id = e.id AND v.date_visite BETWEEN e.date_naissance + 4 AND e.date_naissance + 8) AS j7
                FROM enfant e JOIN famille f ON f.id = e.famille_id AND f.consentement JOIN zone z ON z.id = f.zone_id
                WHERE e.poids_naissance_g < 2500 AND e.date_naissance >= CAST(:auj AS DATE) - 14
                  AND (CAST(:zone AS BIGINT) IS NULL OR f.zone_id = CAST(:zone AS BIGINT))
                ORDER BY e.date_naissance DESC""")
                .param("auj", auj).param("zone", zoneId)
                .query((rs, n) -> new Fragile(rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getObject(4, LocalDate.class), rs.getInt(5), rs.getBoolean(6), rs.getBoolean(7), rs.getBoolean(8)))
                .list();
    }
}
