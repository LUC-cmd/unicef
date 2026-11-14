package tg.fildor.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.domain.Dtos.DeclarationDto;

@Repository
public class DeclarationRepository {

    private static final String SELECT = """
            SELECT d.id, e.code_enfant, d.statut, d.lieu_naissance, d.certificat_accouchement, d.numero_recu,
                   d.envoyee_le, d.dans_delai_gratuit, d.motif_rejet, e.date_naissance, z.nom AS zone
            FROM declaration_naissance d
            JOIN enfant e ON e.id = d.enfant_id
            JOIN famille f ON f.id = e.famille_id
            JOIN zone z ON z.id = f.zone_id
            """;

    private final JdbcClient jdbc;

    public DeclarationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static DeclarationDto map(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        return new DeclarationDto(rs.getLong("id"), rs.getString("code_enfant"), rs.getString("statut"),
                rs.getString("lieu_naissance"), rs.getBoolean("certificat_accouchement"), rs.getString("numero_recu"),
                Lignes.horodatage(rs, "envoyee_le"), rs.getBoolean("dans_delai_gratuit"), rs.getString("motif_rejet"),
                Lignes.date(rs, "date_naissance"), rs.getString("zone"));
    }

    public Optional<DeclarationDto> parEnfant(long enfantId) {
        return jdbc.sql(SELECT + " WHERE d.enfant_id = :id").param("id", enfantId)
                .query(DeclarationRepository::map).optional();
    }

    public List<DeclarationDto> lister(String statut) {
        if (statut == null || statut.isBlank()) {
            return jdbc.sql(SELECT + " ORDER BY d.envoyee_le DESC, d.id DESC LIMIT 200")
                    .query(DeclarationRepository::map).list();
        }
        return jdbc.sql(SELECT + " WHERE d.statut = :s ORDER BY d.envoyee_le DESC, d.id DESC LIMIT 200")
                .param("s", statut).query(DeclarationRepository::map).list();
    }

    /** Insertion idempotente (une seule déclaration par enfant). Renvoie false si elle existait déjà. */
    public boolean creer(long enfantId, String lieu, boolean certificat, String numeroRecu, boolean dansDelai) {
        return jdbc.sql("""
                INSERT INTO declaration_naissance (enfant_id, statut, lieu_naissance, certificat_accouchement,
                                                   numero_recu, dans_delai_gratuit)
                VALUES (:e, 'ENVOYEE', :lieu, :cert, :recu, :delai)
                ON CONFLICT (enfant_id) DO NOTHING""")
                .param("e", enfantId).param("lieu", lieu).param("cert", certificat)
                .param("recu", numeroRecu).param("delai", dansDelai)
                .update() > 0;
    }

    public record ContexteFamille(long familleId, String codeEnfant, boolean aTelephone, boolean consentement) {
    }

    /** Pour prévenir la famille après la décision de la mairie, sans exposer de nom ni de numéro. */
    public Optional<ContexteFamille> contexte(long declarationId) {
        return jdbc.sql("""
                SELECT f.id AS famille_id, e.code_enfant, f.a_telephone, f.consentement
                FROM declaration_naissance d
                JOIN enfant e ON e.id = d.enfant_id
                JOIN famille f ON f.id = e.famille_id
                WHERE d.id = :id""")
                .param("id", declarationId)
                .query((rs, n) -> new ContexteFamille(rs.getLong("famille_id"), rs.getString("code_enfant"),
                        rs.getBoolean("a_telephone"), rs.getBoolean("consentement")))
                .optional();
    }

    /** Une déclaration ne se traite qu'une fois : seules les déclarations « envoyées » changent d'état. */
    public boolean traiter(long id, String nouveauStatut, long userId, String motif) {
        return jdbc.sql("""
                UPDATE declaration_naissance
                SET statut = :s, traitee_le = now(), traitee_par = :u, motif_rejet = :m
                WHERE id = :id AND statut = 'ENVOYEE'""")
                .param("s", nouveauStatut).param("u", userId).param("m", motif).param("id", id)
                .update() > 0;
    }
}
