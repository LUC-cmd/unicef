package tg.fildor.repo;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Carte de famille : retrouver une famille d'une autre zone, puis la transférer. */
@Repository
public class CarteRepository {

    public record FamilleCarte(long id, String codeFamille, String codeCarte, long zoneId, String zone, String region,
                               String langue) {
    }

    public record EnfantBrut(long id, String codeEnfant, String statut, LocalDate dateNaissance, LocalDate dateTermePrevue) {
    }

    public record Transfert(String de, String vers, OffsetDateTime le) {
    }

    private final JdbcClient jdbc;

    public CarteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<FamilleCarte> trouver(String codeFamille) {
        return jdbc.sql("""
                SELECT f.id, f.code_famille, f.code_carte, f.zone_id, z.nom AS zone, z.region, f.langue
                FROM famille f JOIN zone z ON z.id = f.zone_id
                WHERE f.code_famille = :c AND f.consentement""")
                .param("c", codeFamille)
                .query((rs, i) -> new FamilleCarte(rs.getLong("id"), rs.getString("code_famille"), rs.getString("code_carte"),
                        rs.getLong("zone_id"), rs.getString("zone"), rs.getString("region"), rs.getString("langue")))
                .optional();
    }

    public List<EnfantBrut> enfants(long familleId) {
        return jdbc.sql("SELECT id, code_enfant, statut, date_naissance, date_terme_prevue FROM enfant WHERE famille_id = :f ORDER BY id")
                .param("f", familleId)
                .query((rs, i) -> new EnfantBrut(rs.getLong("id"), rs.getString("code_enfant"), rs.getString("statut"),
                        Lignes.date(rs, "date_naissance"), Lignes.date(rs, "date_terme_prevue")))
                .list();
    }

    public List<Transfert> transferts(long familleId) {
        return jdbc.sql("""
                SELECT a.nom AS de, b.nom AS vers, t.le
                FROM transfert_famille t JOIN zone a ON a.id = t.de_zone_id JOIN zone b ON b.id = t.vers_zone_id
                WHERE t.famille_id = :f ORDER BY t.le DESC""")
                .param("f", familleId)
                .query((rs, i) -> new Transfert(rs.getString("de"), rs.getString("vers"), rs.getObject("le", OffsetDateTime.class)))
                .list();
    }

    public Optional<Long> zoneParCode(String code) {
        return jdbc.sql("SELECT id FROM zone WHERE code = :c").param("c", code).query(Long.class).optional();
    }

    public void transferer(long familleId, long deZone, long versZone, long userId) {
        jdbc.sql("UPDATE famille SET zone_id = :z WHERE id = :f").param("z", versZone).param("f", familleId).update();
        jdbc.sql("INSERT INTO transfert_famille (famille_id, de_zone_id, vers_zone_id, par_user_id) VALUES (:f, :a, :b, :u)")
                .param("f", familleId).param("a", deZone).param("b", versZone).param("u", userId).update();
    }
}
