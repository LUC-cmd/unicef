package tg.fildor.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.domain.Dtos.DemandeDto;
import tg.fildor.domain.Dtos.StructureDto;

@Repository
public class AnnuaireRepository {

    public record StructureRef(long id, String code, String nom, String telephone, String horaires, long zoneId) {
    }

    public record DemandeRef(long id, long structureId, long familleId, String statut) {
    }

    private static final String SELECT_STRUCTURE = """
            SELECT s.code, s.type, s.nom, z.nom AS zone, s.telephone, s.horaires, s.services,
                   s.besoins_specifiques, s.actif, s.mis_a_jour_le
            FROM structure s JOIN zone z ON z.id = s.zone_id
            """;

    private static final String SELECT_DEMANDE = """
            SELECT d.id, s.code AS code_structure, s.nom AS nom_structure, f.code_famille, z.nom AS zone, f.langue,
                   d.motif, d.origine, d.statut, d.reponse, d.cree_le
            FROM demande_structure d
            JOIN structure s ON s.id = d.structure_id
            JOIN famille f ON f.id = d.famille_id
            JOIN zone z ON z.id = f.zone_id
            """;

    private final JdbcClient jdbc;

    public AnnuaireRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static StructureDto structure(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        return new StructureDto(rs.getString("code"), rs.getString("type"), rs.getString("nom"), rs.getString("zone"),
                rs.getString("telephone"), rs.getString("horaires"), rs.getString("services"),
                rs.getBoolean("besoins_specifiques"), rs.getBoolean("actif"), Lignes.horodatage(rs, "mis_a_jour_le"));
    }

    private static DemandeDto demande(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        return new DemandeDto(rs.getLong("id"), rs.getString("code_structure"), rs.getString("nom_structure"),
                rs.getString("code_famille"), rs.getString("zone"), rs.getString("langue"), rs.getString("motif"),
                rs.getString("origine"), rs.getString("statut"), rs.getString("reponse"),
                Lignes.horodatage(rs, "cree_le"));
    }

    /** Structures actives, filtrées par zone, type et accueil des besoins spécifiques (filtres facultatifs). */
    public List<StructureDto> lister(String codeZone, String type, boolean seulementBesoinsSpecifiques) {
        StringBuilder sql = new StringBuilder(SELECT_STRUCTURE).append(" WHERE s.actif");
        if (codeZone != null && !codeZone.isBlank()) {
            sql.append(" AND z.code = :zone");
        }
        if (type != null && !type.isBlank()) {
            sql.append(" AND s.type = :type");
        }
        if (seulementBesoinsSpecifiques) {
            sql.append(" AND s.besoins_specifiques");
        }
        sql.append(" ORDER BY z.nom, s.type, s.nom");
        JdbcClient.StatementSpec spec = jdbc.sql(sql.toString());
        if (codeZone != null && !codeZone.isBlank()) {
            spec = spec.param("zone", codeZone);
        }
        if (type != null && !type.isBlank()) {
            spec = spec.param("type", type);
        }
        return spec.query(AnnuaireRepository::structure).list();
    }

    public List<StructureDto> listerParZoneId(long zoneId, String type) {
        String sql = SELECT_STRUCTURE + " WHERE s.actif AND s.zone_id = :z"
                + (type != null && !type.isBlank() ? " AND s.type = :type" : "") + " ORDER BY s.type, s.nom";
        JdbcClient.StatementSpec spec = jdbc.sql(sql).param("z", zoneId);
        if (type != null && !type.isBlank()) {
            spec = spec.param("type", type);
        }
        return spec.query(AnnuaireRepository::structure).list();
    }

    public Optional<StructureRef> parCode(String code) {
        return jdbc.sql("SELECT id, code, nom, telephone, horaires, zone_id FROM structure WHERE code = :c AND actif")
                .param("c", code)
                .query((rs, n) -> new StructureRef(rs.getLong("id"), rs.getString("code"), rs.getString("nom"),
                        rs.getString("telephone"), rs.getString("horaires"), rs.getLong("zone_id")))
                .optional();
    }

    public Optional<StructureRef> parId(long id) {
        return jdbc.sql("SELECT id, code, nom, telephone, horaires, zone_id FROM structure WHERE id = :i")
                .param("i", id)
                .query((rs, n) -> new StructureRef(rs.getLong("id"), rs.getString("code"), rs.getString("nom"),
                        rs.getString("telephone"), rs.getString("horaires"), rs.getLong("zone_id")))
                .optional();
    }

    public Optional<StructureDto> maStructure(long structureId) {
        return jdbc.sql(SELECT_STRUCTURE + " WHERE s.id = :i").param("i", structureId)
                .query(AnnuaireRepository::structure).optional();
    }

    public void mettreAJour(long structureId, String telephone, String horaires, String services,
                            boolean besoinsSpecifiques, boolean actif) {
        jdbc.sql("""
                UPDATE structure SET telephone = :t, horaires = :h, services = :s, besoins_specifiques = :b,
                       actif = :a, mis_a_jour_le = now()
                WHERE id = :id""")
                .param("t", telephone).param("h", horaires).param("s", services).param("b", besoinsSpecifiques)
                .param("a", actif).param("id", structureId).update();
    }

    /** Une seule demande ouverte par famille et par structure. Renvoie false s'il y en a déjà une. */
    public boolean creerDemande(long structureId, long familleId, String motif, String origine) {
        return jdbc.sql("""
                INSERT INTO demande_structure (structure_id, famille_id, motif, origine)
                VALUES (:s, :f, :m, :o) ON CONFLICT DO NOTHING""")
                .param("s", structureId).param("f", familleId).param("m", motif).param("o", origine)
                .update() > 0;
    }

    public List<DemandeDto> demandesDeStructure(long structureId, String statut) {
        String sql = SELECT_DEMANDE + " WHERE d.structure_id = :s"
                + (statut != null && !statut.isBlank() ? " AND d.statut = :st" : "")
                + " ORDER BY d.cree_le DESC, d.id DESC LIMIT 200";
        JdbcClient.StatementSpec spec = jdbc.sql(sql).param("s", structureId);
        if (statut != null && !statut.isBlank()) {
            spec = spec.param("st", statut);
        }
        return spec.query(AnnuaireRepository::demande).list();
    }

    public List<DemandeDto> demandesDeFamille(long familleId) {
        return jdbc.sql(SELECT_DEMANDE + " WHERE d.famille_id = :f ORDER BY d.cree_le DESC, d.id DESC LIMIT 10")
                .param("f", familleId).query(AnnuaireRepository::demande).list();
    }

    public Optional<DemandeRef> demandeParId(long id) {
        return jdbc.sql("SELECT id, structure_id, famille_id, statut FROM demande_structure WHERE id = :i")
                .param("i", id)
                .query((rs, n) -> new DemandeRef(rs.getLong("id"), rs.getLong("structure_id"),
                        rs.getLong("famille_id"), rs.getString("statut")))
                .optional();
    }

    /** Ne répond qu'à une demande encore ouverte et de sa propre structure. */
    public boolean repondre(long id, long structureId, String reponse, long userId) {
        return jdbc.sql("""
                UPDATE demande_structure SET statut = 'TRAITEE', reponse = :r, traitee_le = now(), traitee_par = :u
                WHERE id = :id AND structure_id = :s AND statut = 'NOUVELLE'""")
                .param("r", reponse).param("u", userId).param("id", id).param("s", structureId).update() > 0;
    }

    /** La famille peut-elle recevoir un SMS ? (téléphone propre et consentement). */
    public boolean familleJoignableParSms(long familleId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM famille WHERE id = :f AND a_telephone AND consentement)")
                .param("f", familleId).query(Boolean.class).single();
    }

    public Optional<Long> zoneDeLaFamille(long familleId) {
        return jdbc.sql("SELECT zone_id FROM famille WHERE id = :f").param("f", familleId)
                .query(Long.class).optional();
    }
}
