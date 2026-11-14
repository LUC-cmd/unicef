package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Messages envoyés aux familles et à leurs proches (SMS simulés, écrits en base). */
@Repository
public class MessageRepository {

    private final JdbcClient jdbc;

    public MessageRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Message à la famille elle-même (jeu, réponse d'une structure). */
    public void ajouterPourFamille(long familleId, String type, String message) {
        jdbc.sql("INSERT INTO message_famille (famille_id, contact_id, type, message) VALUES (:f, NULL, :t, :m)")
                .param("f", familleId).param("t", type).param("m", message).update();
    }

    /** Jeu de la semaine : un seul par famille et par semaine (index unique), donc sans risque si le cycle est rejoué. */
    public boolean ajouterJeuDeLaSemaine(long familleId, String message, LocalDate lundi) {
        return jdbc.sql("""
                INSERT INTO message_famille (famille_id, contact_id, type, message, semaine)
                VALUES (:f, NULL, 'JEU', :m, :s) ON CONFLICT DO NOTHING""")
                .param("f", familleId).param("m", message).param("s", lundi).update() > 0;
    }

    /**
     * Rappels généraux aux proches pour les rendez-vous des prochains jours, que la famille ait un téléphone
     * ou non (un proche relaie les familles sans téléphone). Sans nom, sans vaccin : « un rendez-vous approche ».
     * Un seul message par proche et par rendez-vous.
     */
    public int rappelsGenerauxAuxProches(LocalDate aujourdhui, LocalDate limite, String message) {
        return jdbc.sql("""
                INSERT INTO message_famille (famille_id, contact_id, type, message, rendez_vous_id)
                SELECT f.id, c.id, 'RAPPEL_GENERAL', :m, r.id
                FROM rendez_vous r
                JOIN enfant e ON e.id = r.enfant_id
                JOIN famille f ON f.id = e.famille_id AND f.consentement
                JOIN contact_famille c ON c.famille_id = f.id AND c.actif AND c.consentement
                WHERE r.statut = 'PLANIFIE' AND r.date_prevue BETWEEN :today AND :limite
                ON CONFLICT DO NOTHING""")
                .param("m", message).param("today", aujourdhui).param("limite", limite).update();
    }

    public record CibleJeu(long familleId, LocalDate naissanceDuPlusJeune) {
    }

    /** Familles avec téléphone et consentement ayant au moins un enfant de 0 à 59 mois : on prend le plus jeune. */
    public List<CibleJeu> ciblesJeuHebdomadaire(LocalDate aujourdhui) {
        return jdbc.sql("""
                SELECT f.id, max(e.date_naissance) AS naissance
                FROM famille f JOIN enfant e ON e.famille_id = f.id
                WHERE f.consentement AND f.a_telephone AND e.statut = 'ENFANT'
                  AND e.date_naissance > CAST(:today AS DATE) - INTERVAL '60 months'
                  AND e.date_naissance <= CAST(:today AS DATE)
                GROUP BY f.id ORDER BY f.id""")
                .param("today", aujourdhui)
                .query((rs, n) -> new CibleJeu(rs.getLong("id"), Lignes.date(rs, "naissance")))
                .list();
    }
}
