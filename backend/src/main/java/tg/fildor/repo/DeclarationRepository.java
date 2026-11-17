package tg.fildor.repo;

import java.time.LocalDate;
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

    public Optional<DeclarationDto> parId(long id) {
        return jdbc.sql(SELECT + " WHERE d.id = :id").param("id", id)
                .query(DeclarationRepository::map).optional();
    }

    public Optional<DeclarationDto> parNumero(String numeroRecu) {
        return jdbc.sql(SELECT + " WHERE d.numero_recu = :n").param("n", numeroRecu)
                .query(DeclarationRepository::map).optional();
    }

    /** Jour où la mairie a traité la déclaration. */
    public Optional<LocalDate> dateTraitement(long id) {
        return jdbc.sql("SELECT CAST(traitee_le AS DATE) AS jour FROM declaration_naissance"
                        + " WHERE id = :id AND traitee_le IS NOT NULL")
                .param("id", id)
                .query((rs, n) -> Lignes.date(rs, "jour")).optional();
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

    /** Dossier vu par l'état civil : la déclaration, sa provenance, son avancement et ce que la famille a choisi de communiquer. */
    public record DossierMairie(long id, String codeEnfant, String statut, String lieuNaissance,
                                boolean certificatAccouchement, String numeroRecu, java.time.OffsetDateTime envoyeeLe,
                                boolean dansDelaiGratuit, String motifRejet, LocalDate dateNaissance, String zone,
                                String source, java.time.OffsetDateTime traiteeLe, java.time.OffsetDateTime actePretLe,
                                java.time.OffsetDateTime acteRetireLe, boolean identiteDemandee, String mereNom,
                                String pereNom, String enfantPrenom, boolean accordMere, boolean accordPere,
                                String pieceType, String pieceNumero, String nationaliteMere,
                                String nationaliteConjoint, LocalDate prenomAttenduLe, boolean prenomDonne,
                                boolean prisEnGrossesse) {
    }

    public List<DossierMairie> dossiers(String statut) {
        String sql = """
                SELECT d.id, e.code_enfant, d.statut, d.lieu_naissance, d.certificat_accouchement, d.numero_recu,
                       d.envoyee_le, d.dans_delai_gratuit, d.motif_rejet, e.date_naissance, z.nom AS zone,
                       d.source, d.traitee_le, d.acte_pret_le, d.acte_retire_le,
                       (i.declaration_id IS NOT NULL OR p.enfant_id IS NOT NULL) AS identite_demandee,
                       COALESCE(i.mere_nom, CASE WHEN p.accord_mere THEN p.mere_nom END) AS mere_nom,
                       COALESCE(i.pere_nom, CASE WHEN p.accord_conjoint THEN p.conjoint_nom END) AS pere_nom,
                       COALESCE(d.prenom_enfant, i.enfant_prenom) AS enfant_prenom,
                       (COALESCE(i.accord_mere, FALSE) OR COALESCE(p.accord_mere, FALSE)) AS accord_mere,
                       (COALESCE(i.accord_pere, FALSE) OR COALESCE(p.accord_conjoint, FALSE)) AS accord_pere,
                       p.piece_type, p.piece_numero, p.nationalite_mere, p.nationalite_conjoint,
                       (d.prenom_enfant IS NOT NULL) AS prenom_donne,
                       (p.enfant_id IS NOT NULL) AS pris_en_grossesse
                FROM declaration_naissance d
                JOIN enfant e ON e.id = d.enfant_id
                JOIN famille f ON f.id = e.famille_id
                JOIN zone z ON z.id = f.zone_id
                LEFT JOIN identite_naissance i ON i.declaration_id = d.id
                LEFT JOIN identite_parents p ON p.enfant_id = e.id
                """ + (statut == null || statut.isBlank() ? "" : " WHERE d.statut = :s ")
                + " ORDER BY d.envoyee_le DESC, d.id DESC LIMIT 200";
        var requete = jdbc.sql(sql);
        if (statut != null && !statut.isBlank()) {
            requete = requete.param("s", statut);
        }
        return requete.query((rs, n) -> {
            LocalDate naissance = Lignes.date(rs, "date_naissance");
            return new DossierMairie(rs.getLong("id"), rs.getString("code_enfant"),
                    rs.getString("statut"), rs.getString("lieu_naissance"), rs.getBoolean("certificat_accouchement"),
                    rs.getString("numero_recu"), rs.getObject("envoyee_le", java.time.OffsetDateTime.class),
                    rs.getBoolean("dans_delai_gratuit"), rs.getString("motif_rejet"), naissance,
                    rs.getString("zone"), rs.getString("source"), rs.getObject("traitee_le", java.time.OffsetDateTime.class),
                    rs.getObject("acte_pret_le", java.time.OffsetDateTime.class),
                    rs.getObject("acte_retire_le", java.time.OffsetDateTime.class), rs.getBoolean("identite_demandee"),
                    rs.getString("mere_nom"), rs.getString("pere_nom"), rs.getString("enfant_prenom"),
                    rs.getBoolean("accord_mere"), rs.getBoolean("accord_pere"),
                    rs.getString("piece_type"), rs.getString("piece_numero"), rs.getString("nationalite_mere"),
                    rs.getString("nationalite_conjoint"), naissance == null ? null : naissance.plusDays(8),
                    rs.getBoolean("prenom_donne"), rs.getBoolean("pris_en_grossesse"));
        }).list();
    }

    public void definirPrenom(long enfantId, String prenom) {
        jdbc.sql("UPDATE declaration_naissance SET prenom_enfant = :p, prenom_donne_le = now() WHERE enfant_id = :e")
                .param("p", prenom).param("e", enfantId).update();
    }

    public Optional<String> prenom(long enfantId) {
        return jdbc.sql("SELECT prenom_enfant FROM declaration_naissance WHERE enfant_id = :e AND prenom_enfant IS NOT NULL")
                .param("e", enfantId).query(String.class).optional();
    }

    public void definirSource(long declarationId, String source) {
        jdbc.sql("UPDATE declaration_naissance SET source = :s WHERE id = :id")
                .param("s", source).param("id", declarationId).update();
    }

    /** Ce que la famille a choisi de communiquer pour l'acte. Une seule fois par déclaration. */
    public void enregistrerIdentite(long declarationId, String mere, String pere, String prenom, boolean accordMere,
                                    boolean accordPere, String source, long userId) {
        jdbc.sql("""
                INSERT INTO identite_naissance (declaration_id, mere_nom, pere_nom, enfant_prenom, accord_mere,
                                                accord_pere, source, saisi_par)
                VALUES (:d, :m, :p, :n, :am, :ap, :src, :u)
                ON CONFLICT (declaration_id) DO NOTHING""")
                .param("d", declarationId).param("m", mere).param("p", pere).param("n", prenom)
                .param("am", accordMere).param("ap", accordPere).param("src", source).param("u", userId)
                .update();
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
