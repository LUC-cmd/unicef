package tg.fildor.repo;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ProchesRepository {

    /** Un proche, sans son numéro : seuls le rôle et la date d'ajout sont affichés. */
    public record Proche(long id, String role, OffsetDateTime ajouteLe) {
    }

    private final JdbcClient jdbc;

    public ProchesRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Proche> lister(long familleId) {
        return jdbc.sql("""
                SELECT id, role, cree_le FROM contact_famille
                WHERE famille_id = :f AND actif ORDER BY id""")
                .param("f", familleId)
                .query((rs, n) -> new Proche(rs.getLong("id"), rs.getString("role"), Lignes.horodatage(rs, "cree_le")))
                .list();
    }

    public int compter(long familleId) {
        return jdbc.sql("SELECT count(*) FROM contact_famille WHERE famille_id = :f AND actif")
                .param("f", familleId).query(Integer.class).single();
    }

    public boolean existe(long familleId, String hash) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM contact_famille WHERE famille_id = :f AND telephone_hash = :h)")
                .param("f", familleId).param("h", hash).query(Boolean.class).single();
    }

    public boolean estTelephoneDeLaFamille(long familleId, String hash) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM famille WHERE id = :f AND telephone_hash = :h)")
                .param("f", familleId).param("h", hash).query(Boolean.class).single();
    }

    public void ajouter(long familleId, String role, String hash) {
        jdbc.sql("""
                INSERT INTO contact_famille (famille_id, role, telephone_hash, consentement)
                VALUES (:f, :role, :hash, TRUE)""")
                .param("f", familleId).param("role", role).param("hash", hash).update();
    }

    /** Supprime le proche (et ses messages) : plus aucun message ne lui est envoyé. */
    public boolean supprimer(long familleId, long contactId) {
        return jdbc.sql("DELETE FROM contact_famille WHERE id = :id AND famille_id = :f")
                .param("id", contactId).param("f", familleId).update() > 0;
    }
}
