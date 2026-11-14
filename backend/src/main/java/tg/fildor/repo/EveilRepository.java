package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.domain.Jeu;

@Repository
public class EveilRepository {

    public record EnfantEveil(long id, String code, LocalDate dateNaissance) {
    }

    private final JdbcClient jdbc;

    public EveilRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Jeu> tousLesJeux() {
        return jdbc.sql("""
                SELECT id, code, titre, consigne, materiel, age_min_mois, age_max_mois, a_valider
                FROM jeu_eveil ORDER BY id""")
                .query((rs, n) -> new Jeu(rs.getLong("id"), rs.getString("code"), rs.getString("titre"),
                        rs.getString("consigne"), rs.getString("materiel"), rs.getInt("age_min_mois"),
                        rs.getInt("age_max_mois"), rs.getBoolean("a_valider")))
                .list();
    }

    /** Enfants nés de la famille (les grossesses n'ont pas de jeu). */
    public List<EnfantEveil> enfantsNes(long familleId) {
        return jdbc.sql("""
                SELECT id, code_enfant, date_naissance FROM enfant
                WHERE famille_id = :f AND statut = 'ENFANT' ORDER BY id""")
                .param("f", familleId)
                .query((rs, n) -> new EnfantEveil(rs.getLong("id"), rs.getString("code_enfant"),
                        Lignes.date(rs, "date_naissance")))
                .list();
    }

    /** Jeu fait aujourd'hui : un seul par enfant et par jour. Renvoie false s'il était déjà noté. */
    public boolean noterFait(long enfantId, long jeuId, LocalDate date) {
        return jdbc.sql("""
                INSERT INTO activite_eveil (enfant_id, jeu_id, date_activite) VALUES (:e, :j, :d)
                ON CONFLICT (enfant_id, date_activite) DO NOTHING""")
                .param("e", enfantId).param("j", jeuId).param("d", date).update() > 0;
    }

    public List<LocalDate> joursFaits(long enfantId, LocalDate depuis, LocalDate jusqua) {
        return jdbc.sql("""
                SELECT date_activite FROM activite_eveil
                WHERE enfant_id = :e AND date_activite BETWEEN :d AND :f ORDER BY date_activite""")
                .param("e", enfantId).param("d", depuis).param("f", jusqua)
                .query((rs, n) -> Lignes.date(rs, "date_activite")).list();
    }
}
