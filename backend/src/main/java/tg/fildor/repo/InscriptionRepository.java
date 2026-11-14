package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.service.PlanRendezVous.Prevu;

@Repository
public class InscriptionRepository {

    public record FamilleCodes(long id, String codeFamille, List<String> codesEnfants) {
    }

    private final JdbcClient jdbc;

    public InscriptionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Long> zoneIdParCode(String codeZone) {
        return jdbc.sql("SELECT id FROM zone WHERE code = :c").param("c", codeZone).query(Long.class).optional();
    }

    private record Ligne(long id, String code) {
    }

    /** Une inscription déjà reçue (même identifiant client) : on renvoie les codes déjà attribués. */
    public Optional<FamilleCodes> parClientUuid(UUID clientUuid) {
        return jdbc.sql("SELECT id, code_famille FROM famille WHERE client_uuid = :u")
                .param("u", clientUuid)
                .query((rs, n) -> new Ligne(rs.getLong("id"), rs.getString("code_famille")))
                .optional()
                .map(l -> new FamilleCodes(l.id(), l.code(), codesEnfants(l.id())));
    }

    public List<String> codesEnfants(long familleId) {
        return jdbc.sql("SELECT code_enfant FROM enfant WHERE famille_id = :f ORDER BY id")
                .param("f", familleId).query(String.class).list();
    }

    public boolean telephoneExiste(String hash) {
        return jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM famille WHERE telephone_hash = :h)""")
                .param("h", hash).query(Boolean.class).single();
    }

    public long prochainIdFamille() {
        return jdbc.sql("SELECT nextval('famille_id_seq')").query(Long.class).single();
    }

    public void creerFamille(long id, String code, long zoneId, String langue, String porte, boolean aTelephone,
                             String hash, UUID clientUuid) {
        jdbc.sql("""
                INSERT INTO famille (id, code_famille, zone_id, langue, porte, a_telephone, telephone_hash,
                                     consentement, consentement_le, client_uuid)
                VALUES (:id, :code, :zone, :langue, :porte, :tel, :hash, TRUE, now(), :uuid)""")
                .param("id", id).param("code", code).param("zone", zoneId).param("langue", langue)
                .param("porte", porte).param("tel", aTelephone).param("hash", hash).param("uuid", clientUuid)
                .update();
    }

    public long creerEnfant(long familleId, String code, String statut, LocalDate naissance, LocalDate terme,
                            String sexe) {
        return jdbc.sql("""
                INSERT INTO enfant (famille_id, code_enfant, statut, date_naissance, date_terme_prevue, sexe)
                VALUES (:f, :code, :statut, :naissance, :terme, :sexe) RETURNING id""")
                .param("f", familleId).param("code", code).param("statut", statut)
                .param("naissance", naissance).param("terme", terme).param("sexe", sexe)
                .query(Long.class).single();
    }

    public void creerRendezVous(long enfantId, Prevu p) {
        jdbc.sql("""
                INSERT INTO rendez_vous (enfant_id, type, libelle, date_prevue, statut, date_realisation)
                VALUES (:e, :type, :libelle, :date, :statut, :realisation)""")
                .param("e", enfantId).param("type", p.type()).param("libelle", p.libelle())
                .param("date", p.date()).param("statut", p.statut()).param("realisation", p.dateRealisation())
                .update();
    }

    public void creerContact(long familleId, String role, String hash) {
        jdbc.sql("""
                INSERT INTO contact_famille (famille_id, role, telephone_hash, consentement)
                VALUES (:f, :role, :hash, TRUE)""")
                .param("f", familleId).param("role", role).param("hash", hash).update();
    }

    /** La grossesse devient un enfant né. Renvoie false si l'enfant n'était plus en « grossesse ». */
    public boolean convertirEnEnfant(long enfantId, LocalDate naissance) {
        return jdbc.sql("""
                UPDATE enfant SET statut = 'ENFANT', date_naissance = :d
                WHERE id = :id AND statut = 'GROSSESSE'""")
                .param("d", naissance).param("id", enfantId).update() > 0;
    }

    /** Après la naissance, les consultations prénatales encore à venir n'ont plus lieu d'être. */
    public int supprimerConsultationsPrenatalesAVenir(long enfantId) {
        return jdbc.sql("""
                DELETE FROM rendez_vous
                WHERE enfant_id = :id AND type = 'CONSULTATION_PRENATALE' AND statut = 'PLANIFIE'""")
                .param("id", enfantId).update();
    }

    /**
     * Retrait du consentement : la famille n'apparaît plus dans les listes, ne reçoit plus rien,
     * son téléphone et ses proches sont supprimés. L'effacement complet des dossiers suit la procédure
     * convenue avec l'IPDCP.
     */
    public int retirerConsentement(long familleId) {
        jdbc.sql("DELETE FROM contact_famille WHERE famille_id = :f").param("f", familleId).update();
        return jdbc.sql("""
                UPDATE famille SET consentement = FALSE, telephone_hash = NULL, a_telephone = FALSE
                WHERE id = :f""").param("f", familleId).update();
    }
}
