package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Ce que la famille voit d'elle-même : sa zone (jamais une adresse), ses enfants, le nombre qu'elle déclare. */
@Repository
public class FamilleCompteRepository {

    public record ZonePoint(long id, String code, String nom, double lat, double lon) {
    }

    public record EnfantLigne(String code, String statut, LocalDate naissance, LocalDate terme, String acte) {
    }

    private final JdbcClient jdbc;

    public FamilleCompteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public ZonePoint zoneDeLaFamille(long familleId) {
        return jdbc.sql("""
                SELECT z.id, z.code, z.nom, z.latitude, z.longitude FROM famille f JOIN zone z ON z.id = f.zone_id
                WHERE f.id = :f""")
                .param("f", familleId)
                .query((rs, n) -> new ZonePoint(rs.getLong("id"), rs.getString("code"), rs.getString("nom"),
                        rs.getDouble("latitude"), rs.getDouble("longitude")))
                .single();
    }

    public Optional<ZonePoint> zoneParCode(String code) {
        return jdbc.sql("SELECT id, code, nom, latitude, longitude FROM zone WHERE code = :c")
                .param("c", code)
                .query((rs, n) -> new ZonePoint(rs.getLong("id"), rs.getString("code"), rs.getString("nom"),
                        rs.getDouble("latitude"), rs.getDouble("longitude")))
                .optional();
    }

    public List<EnfantLigne> enfants(long familleId) {
        return jdbc.sql("""
                SELECT code_enfant, statut, date_naissance, date_terme_prevue, acte_externe FROM enfant
                WHERE famille_id = :f ORDER BY id""")
                .param("f", familleId)
                .query((rs, n) -> new EnfantLigne(rs.getString("code_enfant"), rs.getString("statut"),
                        rs.getObject("date_naissance", LocalDate.class),
                        rs.getObject("date_terme_prevue", LocalDate.class), rs.getString("acte_externe")))
                .list();
    }

    public int enfantsDeclares(long familleId) {
        return jdbc.sql("SELECT COALESCE(enfants_declares, 0) FROM famille WHERE id = :f")
                .param("f", familleId).query(Integer.class).single();
    }

    public void declarerEnfants(long familleId, int nombre) {
        jdbc.sql("UPDATE famille SET enfants_declares = :n WHERE id = :f")
                .param("n", nombre).param("f", familleId).update();
    }

    /** Déménagement demandé par la famille : le carnet suit, l'historique garde la trace (sans agent). */
    public void transferer(long familleId, long deZone, long versZone) {
        jdbc.sql("UPDATE famille SET zone_id = :z WHERE id = :f").param("z", versZone).param("f", familleId).update();
        jdbc.sql("INSERT INTO transfert_famille (famille_id, de_zone_id, vers_zone_id) VALUES (:f, :a, :b)")
                .param("f", familleId).param("a", deZone).param("b", versZone).update();
    }
}
