package tg.fildor.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Modèles de messages par langue. Une traduction ne part chez les familles qu'une fois validée. */
@Repository
public class ModeleRepository {

    public record Modele(String code, String langue, String texte, boolean aValider) {
    }

    private final JdbcClient jdbc;

    public ModeleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Modele> tous() {
        return jdbc.sql("SELECT code, langue, texte, a_valider FROM modele_message ORDER BY code, langue")
                .query((rs, n) -> new Modele(rs.getString("code"), rs.getString("langue"), rs.getString("texte"),
                        rs.getBoolean("a_valider")))
                .list();
    }

    public Optional<Modele> trouver(String code, String langue) {
        return jdbc.sql("SELECT code, langue, texte, a_valider FROM modele_message WHERE code = :c AND langue = :l")
                .param("c", code).param("l", langue)
                .query((rs, n) -> new Modele(rs.getString("code"), rs.getString("langue"), rs.getString("texte"),
                        rs.getBoolean("a_valider")))
                .optional();
    }

    public void enregistrer(String code, String langue, String texte, boolean aValider, long userId) {
        jdbc.sql("""
                INSERT INTO modele_message (code, langue, texte, a_valider, mis_a_jour_par)
                VALUES (:c, :l, :t, :v, :u)
                ON CONFLICT (code, langue) DO UPDATE
                  SET texte = EXCLUDED.texte, a_valider = EXCLUDED.a_valider, mis_a_jour_le = now(),
                      mis_a_jour_par = EXCLUDED.mis_a_jour_par""")
                .param("c", code).param("l", langue).param("t", texte).param("v", aValider).param("u", userId)
                .update();
    }

    public boolean codeExiste(String code) {
        return jdbc.sql("SELECT count(*) FROM modele_message WHERE code = :c AND langue = 'fr'").param("c", code)
                .query(Long.class).single() > 0;
    }
}
