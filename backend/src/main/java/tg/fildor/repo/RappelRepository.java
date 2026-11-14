package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.domain.Dtos.SmsRecu;

@Repository
public class RappelRepository {

    /**
     * Qui est derrière ce numéro : la famille elle-même (contactIds vide) ou un proche (un ou plusieurs rôles,
     * si le même numéro relaie plusieurs familles).
     */
    public record Identite(long familleId, String codeFamille, String langue, boolean consentement,
                           List<Long> contactIds, String roleProche) {
        public boolean estProche() {
            return !contactIds.isEmpty();
        }
    }

    private final JdbcClient jdbc;

    public RappelRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** 1. Un rendez-vous dont la date est passée et qui n'a pas été fait devient « manqué ». */
    public int marquerManques(LocalDate aujourdhui) {
        return jdbc.sql("""
                UPDATE rendez_vous SET statut = 'MANQUE'
                WHERE statut = 'PLANIFIE' AND date_prevue < :today""")
                .param("today", aujourdhui).update();
    }

    /** 2. Un rappel sans réponse depuis plus de 2 jours passe « sans réponse » : la famille remonte dans la liste. */
    public int marquerSansReponse(LocalDate aujourdhui) {
        return jdbc.sql("""
                UPDATE rappel SET statut = 'SANS_REPONSE'
                WHERE statut = 'ENVOYE' AND envoye_le < :limite""")
                .param("limite", aujourdhui.minusDays(2).atStartOfDay().atOffset(java.time.ZoneOffset.UTC))
                .update();
    }

    /** 3. Un rappel SMS est créé pour les rendez-vous des 2 prochains jours, famille avec téléphone et consentement. */
    public int creerRappelsAVenir(LocalDate aujourdhui) {
        return jdbc.sql("""
                INSERT INTO rappel (rendez_vous_id, canal, message, envoye_le, statut)
                SELECT r.id, 'SMS',
                       'Fil d''Or : rendez-vous le ' || to_char(r.date_prevue, 'DD/MM') || ' au centre de santé ('
                           || r.libelle || '). Apportez le carnet.',
                       now(), 'ENVOYE'
                FROM rendez_vous r
                JOIN enfant e ON e.id = r.enfant_id
                JOIN famille f ON f.id = e.famille_id
                WHERE r.statut = 'PLANIFIE'
                  AND r.date_prevue BETWEEN :today AND :limite
                  AND f.a_telephone AND f.consentement
                  AND NOT EXISTS (SELECT 1 FROM rappel ra WHERE ra.rendez_vous_id = r.id)""")
                .param("today", aujourdhui).param("limite", aujourdhui.plusDays(2))
                .update();
    }

    public Optional<Identite> identiteParTelephone(String hash) {
        Optional<Identite> famille = jdbc.sql("""
                SELECT id, code_famille, langue, consentement FROM famille WHERE telephone_hash = :h""")
                .param("h", hash)
                .query((rs, n) -> new Identite(rs.getLong("id"), rs.getString("code_famille"), rs.getString("langue"),
                        rs.getBoolean("consentement"), List.of(), null))
                .optional();
        if (famille.isPresent()) {
            return famille;
        }
        record Proche(long contactId, long familleId, String codeFamille, String langue, String role) {
        }
        List<Proche> proches = jdbc.sql("""
                SELECT c.id, f.id AS famille_id, f.code_famille, f.langue, c.role
                FROM contact_famille c JOIN famille f ON f.id = c.famille_id
                WHERE c.telephone_hash = :h AND c.actif AND c.consentement AND f.consentement
                ORDER BY c.id""")
                .param("h", hash)
                .query((rs, n) -> new Proche(rs.getLong("id"), rs.getLong("famille_id"), rs.getString("code_famille"),
                        rs.getString("langue"), rs.getString("role")))
                .list();
        if (proches.isEmpty()) {
            return Optional.empty();
        }
        Proche premier = proches.get(0);
        return Optional.of(new Identite(premier.familleId(), premier.codeFamille(), premier.langue(), true,
                proches.stream().map(Proche::contactId).toList(), premier.role()));
    }

    /** Messages reçus sur le téléphone de la famille : rappels de rendez-vous, jeux, réponses des structures. */
    public List<SmsRecu> messagesDeLaFamille(long familleId) {
        return jdbc.sql("""
                SELECT * FROM (
                    SELECT ra.id, 'RAPPEL' AS type, ra.message, ra.envoye_le, ra.statut
                    FROM rappel ra
                    JOIN rendez_vous r ON r.id = ra.rendez_vous_id
                    JOIN enfant e ON e.id = r.enfant_id
                    WHERE e.famille_id = :f AND ra.canal = 'SMS'
                    UNION ALL
                    SELECT m.id, m.type, m.message, m.envoye_le, 'INFO' AS statut
                    FROM message_famille m WHERE m.famille_id = :f AND m.contact_id IS NULL
                ) t ORDER BY envoye_le DESC, id DESC LIMIT 30""")
                .param("f", familleId)
                .query((rs, n) -> new SmsRecu(rs.getLong("id"), rs.getString("type"), rs.getString("message"),
                        Lignes.horodatage(rs, "envoye_le"), rs.getString("statut")))
                .list();
    }

    /** Messages reçus par un proche : uniquement des rappels généraux. */
    public List<SmsRecu> messagesDuProche(List<Long> contactIds) {
        return jdbc.sql("""
                SELECT id, type, message, envoye_le FROM message_famille
                WHERE contact_id IN (:ids) ORDER BY envoye_le DESC, id DESC LIMIT 30""")
                .param("ids", contactIds)
                .query((rs, n) -> new SmsRecu(rs.getLong("id"), rs.getString("type"), rs.getString("message"),
                        Lignes.horodatage(rs, "envoye_le"), "INFO"))
                .list();
    }

    /** La famille répond « OK » : le rappel est acquitté, seulement s'il appartient bien à cette famille. */
    public boolean acquitter(long rappelId, long familleId) {
        return jdbc.sql("""
                UPDATE rappel SET statut = 'ACQUITTE', acquitte_le = now()
                WHERE id = :id AND statut <> 'ACQUITTE' AND rendez_vous_id IN (
                    SELECT r.id FROM rendez_vous r JOIN enfant e ON e.id = r.enfant_id WHERE e.famille_id = :f)""")
                .param("id", rappelId).param("f", familleId).update() > 0;
    }

    public void enregistrerAppelManque(String hash) {
        jdbc.sql("INSERT INTO appel_manque (telephone_hash) VALUES (:h)").param("h", hash).update();
    }
}
