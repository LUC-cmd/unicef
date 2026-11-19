package tg.fildor.repo;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Alertes « mode urgence » : visibles par l'agent de la zone de la famille (toutes pour l'administrateur). */
@Repository
public class AlerteRepository {

    public record Alerte(long id, Long familleId, String codeFamille, Long zoneId, String motif,
                         String statut, OffsetDateTime creeLe) {
    }

    private final JdbcClient jdbc;

    public AlerteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void creer(Long familleId, String telephoneHash, String motif) {
        jdbc.sql("""
                INSERT INTO alerte_urgence (famille_id, telephone_hash, motif)
                VALUES (:f, :h, :m)""")
                .param("f", familleId).param("h", telephoneHash).param("m", motif).update();
    }

    public List<Alerte> lister(Long zoneId, int limite) {
        return jdbc.sql("""
                SELECT a.id, a.famille_id, f.code_famille, f.zone_id, a.motif, a.statut, a.cree_le
                FROM alerte_urgence a
                LEFT JOIN famille f ON f.id = a.famille_id
                WHERE (CAST(:zone AS bigint) IS NULL OR f.zone_id = :zone)
                ORDER BY a.cree_le DESC
                LIMIT :limite""")
                .param("zone", zoneId).param("limite", limite)
                .query((rs, n) -> new Alerte(rs.getLong("id"),
                        rs.getObject("famille_id") == null ? null : rs.getLong("famille_id"),
                        rs.getString("code_famille"),
                        rs.getObject("zone_id") == null ? null : rs.getLong("zone_id"),
                        rs.getString("motif"), rs.getString("statut"),
                        Lignes.horodatage(rs, "cree_le")))
                .list();
    }

    public int compterNouvelles(Long zoneId) {
        return jdbc.sql("""
                SELECT count(*) FROM alerte_urgence a
                LEFT JOIN famille f ON f.id = a.famille_id
                WHERE a.statut = 'NOUVELLE' AND (CAST(:zone AS bigint) IS NULL OR f.zone_id = :zone)""")
                .param("zone", zoneId).query(Integer.class).single();
    }

    /** Change le statut ; la zone de l'agent est vérifiée pour ne pas traiter l'alerte d'une autre zone. */
    public boolean changerStatut(long id, String statut, Long zoneId) {
        return jdbc.sql("""
                UPDATE alerte_urgence a SET statut = :s, traite_le = CASE WHEN :s = 'NOUVELLE' THEN NULL ELSE now() END
                WHERE a.id = :id AND a.statut <> 'CLOTUREE'
                  AND (CAST(:zone AS bigint) IS NULL OR EXISTS (SELECT 1 FROM famille f WHERE f.id = a.famille_id AND f.zone_id = :zone))""")
                .param("s", statut).param("id", id).param("zone", zoneId).update() > 0;
    }
}
