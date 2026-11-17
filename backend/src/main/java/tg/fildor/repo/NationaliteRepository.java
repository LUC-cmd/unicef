package tg.fildor.repo;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Dossiers de nationalité : un par naissance validée par l'état civil. */
@Repository
public class NationaliteRepository {

    public record Dossier(long declarationId, String codeEnfant, String zone, LocalDate dateNaissance, String voie,
                          int etape, String piecesOk, String note, OffsetDateTime ouvertLe,
                          OffsetDateTime misAJourLe, String enfantPrenom) {
    }

    private final JdbcClient jdbc;

    public NationaliteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Ouvre le dossier à la validation de la naissance. La voie est déduite de ce que la famille a accepté de dire. */
    public void ouvrir(long declarationId) {
        jdbc.sql("""
                INSERT INTO dossier_nationalite (declaration_id, voie)
                SELECT d.id,
                       CASE WHEN lower(coalesce(p.nationalite_mere, '') || ' ' || coalesce(p.nationalite_conjoint, '')) LIKE '%tog%' THEN 'FILIATION'
                            WHEN p.nationalite_mere IS NOT NULL OR p.nationalite_conjoint IS NOT NULL THEN 'PARENTS_ETRANGERS'
                            WHEN p.piece_type = 'AUCUNE' THEN 'SANS_PAPIERS'
                            ELSE 'A_PRECISER' END
                FROM declaration_naissance d
                LEFT JOIN identite_parents p ON p.enfant_id = d.enfant_id
                WHERE d.id = :d
                ON CONFLICT (declaration_id) DO NOTHING""")
                .param("d", declarationId).update();
    }

    public List<Dossier> lister() {
        return jdbc.sql("""
                SELECT n.declaration_id, e.code_enfant, z.nom AS zone, e.date_naissance, n.voie, n.etape, n.pieces_ok,
                       n.note, n.ouvert_le, n.mis_a_jour_le, d.prenom_enfant
                FROM dossier_nationalite n
                JOIN declaration_naissance d ON d.id = n.declaration_id
                JOIN enfant e ON e.id = d.enfant_id
                JOIN famille f ON f.id = e.famille_id
                JOIN zone z ON z.id = f.zone_id
                ORDER BY n.etape, n.ouvert_le DESC LIMIT 300""")
                .query((rs, i) -> new Dossier(rs.getLong("declaration_id"), rs.getString("code_enfant"),
                        rs.getString("zone"), Lignes.date(rs, "date_naissance"), rs.getString("voie"),
                        rs.getInt("etape"), rs.getString("pieces_ok"), rs.getString("note"),
                        rs.getObject("ouvert_le", OffsetDateTime.class), rs.getObject("mis_a_jour_le", OffsetDateTime.class),
                        rs.getString("prenom_enfant")))
                .list();
    }

    public boolean avancer(long declarationId, int etape, String piecesOk, String voie, String note, long userId) {
        return jdbc.sql("""
                UPDATE dossier_nationalite
                SET etape = :e, pieces_ok = :p, voie = COALESCE(:v, voie), note = :n, mis_a_jour_le = now(), mis_a_jour_par = :u
                WHERE declaration_id = :d""")
                .param("e", etape).param("p", piecesOk).param("v", voie).param("n", note).param("u", userId)
                .param("d", declarationId).update() > 0;
    }
}
