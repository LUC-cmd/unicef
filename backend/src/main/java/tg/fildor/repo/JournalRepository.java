package tg.fildor.repo;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Journal des accès : qui a consulté quoi. Obligatoire pour les données de santé. */
@Repository
public class JournalRepository {

    private final JdbcClient jdbc;

    public JournalRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void ajouter(String username, String action, String ressource) {
        jdbc.sql("INSERT INTO journal_acces (username, action, ressource) VALUES (:u, :a, :r)")
                .param("u", username).param("a", action).param("r", ressource).update();
    }
}
