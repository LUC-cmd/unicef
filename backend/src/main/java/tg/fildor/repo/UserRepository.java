package tg.fildor.repo;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    public record Utilisateur(long id, String username, String passwordHash, String nomComplet, String role,
                              Long zoneId, Long structureId, boolean actif, String region) {
    }

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Utilisateur> parUsername(String username) {
        return jdbc.sql("""
                SELECT id, username, password_hash, nom_complet, role, zone_id, structure_id, actif, region
                FROM app_user WHERE username = :u""")
                .param("u", username)
                .query((rs, n) -> new Utilisateur(rs.getLong("id"), rs.getString("username"),
                        rs.getString("password_hash"), rs.getString("nom_complet"), rs.getString("role"),
                        rs.getObject("zone_id", Long.class), rs.getObject("structure_id", Long.class),
                        rs.getBoolean("actif"), rs.getString("region")))
                .optional();
    }

    public long compter() {
        return jdbc.sql("SELECT count(*) FROM app_user").query(Long.class).single();
    }

    public void creer(String username, String hash, String nom, String role, String codeZone, String codeStructure) {
        jdbc.sql("""
                INSERT INTO app_user (username, password_hash, nom_complet, role, zone_id, structure_id)
                VALUES (:u, :h, :n, :r, (SELECT id FROM zone WHERE code = :z), (SELECT id FROM structure WHERE code = :s))""")
                .param("u", username).param("h", hash).param("n", nom).param("r", role).param("z", codeZone)
                .param("s", codeStructure)
                .update();
    }

    public void creerAvecRegion(String username, String hash, String nom, String role, String codeZone, String codeStructure, String region) {
        jdbc.sql("""
                INSERT INTO app_user (username, password_hash, nom_complet, role, zone_id, structure_id, region)
                VALUES (:u, :h, :n, :r, (SELECT id FROM zone WHERE code = :z), (SELECT id FROM structure WHERE code = :s), :reg)""")
                .param("u", username).param("h", hash).param("n", nom).param("r", role).param("z", codeZone)
                .param("s", codeStructure).param("reg", region)
                .update();
    }

    public void desactiver(long id) {
        jdbc.sql("UPDATE app_user SET actif = FALSE WHERE id = :id").param("id", id).update();
    }

    public void activer(long id) {
        jdbc.sql("UPDATE app_user SET actif = TRUE WHERE id = :id").param("id", id).update();
    }
}
