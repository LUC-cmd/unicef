package tg.fildor.repo;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Gestion des comptes professionnels et des structures par l'administrateur. */
@Repository
public class ComptesRepository {

    public record CompteDto(long id, String username, String nomComplet, String role, boolean actif, String region,
                            String codeZone, String nomZone, String regionZone, String codeStructure,
                            String nomStructure, OffsetDateTime creeLe) {
    }

    public record StructureAdmin(String code, String type, String nom, String codeZone, String nomZone,
                                 String region, boolean actif) {
    }

    private final JdbcClient jdbc;

    public ComptesRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<CompteDto> lister() {
        return jdbc.sql("""
                SELECT u.id, u.username, u.nom_complet, u.role, u.actif, u.region, u.cree_le,
                       z.code AS zone_code, z.nom AS zone_nom, z.region AS zone_region,
                       s.code AS structure_code, s.nom AS structure_nom
                FROM app_user u
                LEFT JOIN zone z ON z.id = u.zone_id
                LEFT JOIN structure s ON s.id = u.structure_id
                ORDER BY CASE u.role WHEN 'ADMIN' THEN 1 WHEN 'DECIDEUR' THEN 2 WHEN 'MAIRIE' THEN 3
                                     WHEN 'STRUCTURE' THEN 4 ELSE 5 END, u.username""")
                .query((rs, n) -> new CompteDto(rs.getLong("id"), rs.getString("username"), rs.getString("nom_complet"),
                        rs.getString("role"), rs.getBoolean("actif"), rs.getString("region"),
                        rs.getString("zone_code"), rs.getString("zone_nom"), rs.getString("zone_region"),
                        rs.getString("structure_code"), rs.getString("structure_nom"),
                        rs.getObject("cree_le", OffsetDateTime.class)))
                .list();
    }

    public boolean existe(String username) {
        return jdbc.sql("SELECT count(*) FROM app_user WHERE username = :u").param("u", username)
                .query(Long.class).single() > 0;
    }

    public boolean zoneExiste(String code) {
        return jdbc.sql("SELECT count(*) FROM zone WHERE code = :c").param("c", code).query(Long.class).single() > 0;
    }

    public Optional<String> typeStructure(String code) {
        return jdbc.sql("SELECT type FROM structure WHERE code = :c").param("c", code).query(String.class).optional();
    }

    public Optional<String> regionDeZone(String code) {
        return jdbc.sql("SELECT region FROM zone WHERE code = :c").param("c", code).query(String.class).optional();
    }

    public void creer(String username, String hash, String nom, String role, String codeZone, String region,
                      String codeStructure) {
        jdbc.sql("""
                INSERT INTO app_user (username, password_hash, nom_complet, role, zone_id, structure_id, region, doit_changer_mdp)
                VALUES (:u, :h, :n, :r, (SELECT id FROM zone WHERE code = :z), (SELECT id FROM structure WHERE code = :s),
                        :reg, TRUE)""")
                .param("u", username).param("h", hash).param("n", nom).param("r", role).param("z", codeZone)
                .param("s", codeStructure).param("reg", region)
                .update();
    }

    public int definirActif(long id, boolean actif) {
        return jdbc.sql("UPDATE app_user SET actif = :a WHERE id = :id").param("a", actif).param("id", id).update();
    }

    public int changerMotDePasse(long id, String hash, boolean aChanger) {
        return jdbc.sql("UPDATE app_user SET password_hash = :h, doit_changer_mdp = :c WHERE id = :id")
                .param("h", hash).param("c", aChanger).param("id", id).update();
    }

    public List<StructureAdmin> structures() {
        return jdbc.sql("""
                SELECT s.code, s.type, s.nom, z.code AS zone_code, z.nom AS zone_nom, z.region, s.actif
                FROM structure s JOIN zone z ON z.id = s.zone_id
                ORDER BY z.region, z.nom, s.type, s.nom""")
                .query((rs, n) -> new StructureAdmin(rs.getString("code"), rs.getString("type"), rs.getString("nom"),
                        rs.getString("zone_code"), rs.getString("zone_nom"), rs.getString("region"),
                        rs.getBoolean("actif")))
                .list();
    }

    public void creerStructure(String code, String type, String nom, String codeZone, String telephone) {
        jdbc.sql("""
                INSERT INTO structure (code, type, nom, zone_id, telephone)
                VALUES (:c, :t, :n, (SELECT id FROM zone WHERE code = :z), :tel)""")
                .param("c", code).param("t", type).param("n", nom).param("z", codeZone).param("tel", telephone)
                .update();
    }

    public long compterStructures(String type, String codeZone) {
        return jdbc.sql("""
                SELECT count(*) FROM structure s JOIN zone z ON z.id = s.zone_id
                WHERE s.type = :t AND z.code = :z""").param("t", type).param("z", codeZone).query(Long.class).single();
    }
}
