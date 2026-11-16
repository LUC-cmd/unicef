package tg.fildor.repo;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Suivi de l'acte de naissance jusqu'à son retrait, et poids de naissance. */
@Repository
public class ParcoursRepository {

    /** Une déclaration validée et l'état de son acte. Pas de nom, pas d'adresse. */
    public record LigneActe(long id, String codeEnfant, String zone, OffsetDateTime actePretLe,
                            OffsetDateTime acteRetireLe) {
    }

    public record ZoneActes(String zone, long validees, long retires) {
    }

    public record ContexteActe(long familleId, String codeEnfant, String numeroRecu, boolean aTelephone,
                               boolean consentement) {
    }

    private final JdbcClient jdbc;

    public ParcoursRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<LigneActe> actesValides() {
        return jdbc.sql("""
                SELECT d.id, e.code_enfant, z.nom AS zone, d.acte_pret_le, d.acte_retire_le
                FROM declaration_naissance d
                JOIN enfant e ON e.id = d.enfant_id
                JOIN famille f ON f.id = e.famille_id
                JOIN zone z ON z.id = f.zone_id
                WHERE d.statut = 'VALIDEE'
                ORDER BY d.id DESC
                LIMIT 300""")
                .query((rs, n) -> new LigneActe(rs.getLong("id"), rs.getString("code_enfant"), rs.getString("zone"),
                        rs.getObject("acte_pret_le", OffsetDateTime.class),
                        rs.getObject("acte_retire_le", OffsetDateTime.class)))
                .list();
    }

    public List<ZoneActes> parZone() {
        return jdbc.sql("""
                SELECT z.nom AS zone, COUNT(*) AS validees, COUNT(d.acte_retire_le) AS retires
                FROM declaration_naissance d
                JOIN enfant e ON e.id = d.enfant_id
                JOIN famille f ON f.id = e.famille_id
                JOIN zone z ON z.id = f.zone_id
                WHERE d.statut = 'VALIDEE'
                GROUP BY z.nom
                ORDER BY z.nom""")
                .query((rs, n) -> new ZoneActes(rs.getString("zone"), rs.getLong("validees"), rs.getLong("retires")))
                .list();
    }

    /** L'acte devient « prêt » une seule fois, et seulement pour une déclaration validée. */
    public boolean marquerPret(long id) {
        return jdbc.sql("""
                UPDATE declaration_naissance SET acte_pret_le = now()
                WHERE id = :id AND statut = 'VALIDEE' AND acte_pret_le IS NULL""")
                .param("id", id).update() > 0;
    }

    /** Un acte retiré a forcément été prêt. */
    public boolean marquerRetire(long id) {
        return jdbc.sql("""
                UPDATE declaration_naissance
                SET acte_retire_le = now(), acte_pret_le = COALESCE(acte_pret_le, now())
                WHERE id = :id AND statut = 'VALIDEE' AND acte_retire_le IS NULL""")
                .param("id", id).update() > 0;
    }

    public Optional<ContexteActe> contexte(long declarationId) {
        return jdbc.sql("""
                SELECT f.id AS famille_id, e.code_enfant, d.numero_recu, f.a_telephone, f.consentement
                FROM declaration_naissance d
                JOIN enfant e ON e.id = d.enfant_id
                JOIN famille f ON f.id = e.famille_id
                WHERE d.id = :id""")
                .param("id", declarationId)
                .query((rs, n) -> new ContexteActe(rs.getLong("famille_id"), rs.getString("code_enfant"),
                        rs.getString("numero_recu"), rs.getBoolean("a_telephone"), rs.getBoolean("consentement")))
                .optional();
    }

    public void fixerPoidsNaissance(long enfantId, int grammes) {
        jdbc.sql("UPDATE enfant SET poids_naissance_g = :g WHERE id = :id")
                .param("g", grammes).param("id", enfantId).update();
    }

    public Optional<Integer> poidsNaissance(long enfantId) {
        return jdbc.sql("SELECT poids_naissance_g FROM enfant WHERE id = :id AND poids_naissance_g IS NOT NULL")
                .param("id", enfantId)
                .query((rs, n) -> rs.getInt("poids_naissance_g"))
                .optional();
    }
}
