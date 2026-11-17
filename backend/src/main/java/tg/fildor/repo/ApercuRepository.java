package tg.fildor.repo;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Chiffres agrégés pour le tableau de bord de l'administrateur. Aucun nom, aucun code famille : que des totaux. */
@Repository
public class ApercuRepository {

    private final JdbcClient jdbc;

    public ApercuRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private List<Map<String, Object>> liste(String sql) {
        return jdbc.sql(sql).query().listOfRows();
    }

    public Map<String, Object> apercu() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("totaux", jdbc.sql("""
                SELECT (SELECT COUNT(*) FROM famille) AS familles,
                       (SELECT COUNT(*) FROM enfant WHERE statut = 'ENFANT') AS enfants,
                       (SELECT COUNT(*) FROM enfant WHERE statut = 'GROSSESSE') AS grossesses,
                       (SELECT COUNT(*) FROM visite) AS visites,
                       (SELECT COUNT(*) FROM declaration_naissance) AS declarations,
                       (SELECT COUNT(*) FROM app_user WHERE actif) AS utilisateurs,
                       (SELECT COUNT(*) FROM structure) AS structures,
                       (SELECT COUNT(*) FROM rappel) AS rappels,
                       (SELECT COUNT(*) FROM journal_acces WHERE cree_le > now() - interval '24 hours') AS acces24h
                """).query().singleRow());
        r.put("serie", liste("""
                SELECT to_char(j.d, 'YYYY-MM-DD') AS jour,
                       (SELECT COUNT(*) FROM visite v WHERE v.date_visite = j.d) AS visites,
                       (SELECT COUNT(*) FROM famille f WHERE CAST(f.cree_le AS DATE) = j.d) AS inscriptions,
                       (SELECT COUNT(*) FROM declaration_naissance x WHERE CAST(x.envoyee_le AS DATE) = j.d) AS declarations,
                       (SELECT COUNT(*) FROM journal_acces a WHERE CAST(a.cree_le AS DATE) = j.d) AS acces
                FROM (SELECT (current_date - 29 + n) AS d FROM generate_series(0, 29) AS n) j
                ORDER BY j.d"""));
        r.put("declarationsParStatut", liste("SELECT statut AS nom, COUNT(*) AS n FROM declaration_naissance GROUP BY statut ORDER BY n DESC"));
        r.put("declarationsParSource", liste("SELECT source AS nom, COUNT(*) AS n FROM declaration_naissance GROUP BY source ORDER BY n DESC"));
        r.put("utilisateursParRole", liste("SELECT role AS nom, COUNT(*) AS n FROM app_user WHERE actif GROUP BY role ORDER BY n DESC"));
        r.put("rappelsParStatut", liste("SELECT statut AS nom, COUNT(*) AS n FROM rappel GROUP BY statut ORDER BY n DESC"));
        r.put("rendezVousParStatut", liste("SELECT statut AS nom, COUNT(*) AS n FROM rendez_vous GROUP BY statut ORDER BY n DESC"));
        r.put("famillesParZone", liste("""
                SELECT z.nom AS nom, COUNT(f.id) AS n FROM zone z LEFT JOIN famille f ON f.zone_id = z.id
                GROUP BY z.nom ORDER BY n DESC"""));
        r.put("muac", liste("""
                SELECT CASE WHEN muac_mm < 115 THEN 'ROUGE' WHEN muac_mm < 125 THEN 'JAUNE' ELSE 'VERT' END AS nom,
                       COUNT(*) AS n
                FROM visite WHERE muac_mm IS NOT NULL GROUP BY 1 ORDER BY n DESC"""));
        r.put("actionsFrequentes", liste("""
                SELECT action AS nom, COUNT(*) AS n FROM journal_acces
                WHERE cree_le > now() - interval '14 days' GROUP BY action ORDER BY n DESC LIMIT 6"""));
        r.put("derniersEvenements", liste("""
                SELECT username, action, ressource,
                       to_char(cree_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS le
                FROM journal_acces ORDER BY cree_le DESC LIMIT 12"""));
        return r;
    }
}
