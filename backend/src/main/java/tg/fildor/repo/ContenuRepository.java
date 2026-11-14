package tg.fildor.repo;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ContenuRepository {

    public record Contenu(String sujet, String langue, String titre, String texte, boolean aValider) {
    }

    private final JdbcClient jdbc;

    public ContenuRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Contenu> trouver(String sujet, String langue) {
        return jdbc.sql("SELECT sujet, langue, titre, texte, a_valider FROM contenu WHERE sujet = :s AND langue = :l")
                .param("s", sujet).param("l", langue)
                .query((rs, n) -> new Contenu(rs.getString("sujet"), rs.getString("langue"), rs.getString("titre"),
                        rs.getString("texte"), rs.getBoolean("a_valider")))
                .optional();
    }
}
