package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.domain.Dtos.CarnetEnfant;
import tg.fildor.domain.Dtos.RendezVousDto;
import tg.fildor.domain.Dtos.VisiteDto;
import tg.fildor.domain.Indicateurs;

@Repository
public class SuiviRepository {

    /** Enfant retrouvé par son code, avec la zone de sa famille (pour vérifier les droits de l'agent). */
    public record EnfantRef(long id, long familleId, long zoneId, String codeEnfant, String codeFamille,
                            String zone, String porte, String langue, String statut, LocalDate dateNaissance,
                            LocalDate dateTermePrevue, boolean familleSansTelephone) {
    }

    /** Une ligne brute de la liste de visites : l'enfant et ses indicateurs. */
    public record LigneBrute(String codeEnfant, String codeFamille, String zone, String porte, String statut,
                             LocalDate dateNaissance, LocalDate prochainRdv, Indicateurs indicateurs) {
    }

    private final JdbcClient jdbc;

    public SuiviRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<LigneBrute> lignesBrutes(Long zoneId, String codeEnfant, LocalDate aujourdhui) {
        String sql = """
                SELECT e.code_enfant, f.code_famille, z.nom AS zone, f.porte, e.statut, e.date_naissance,
                       NOT f.a_telephone AS sans_telephone, f.mere_adolescente,
                       (SELECT count(*) FROM rendez_vous r WHERE r.enfant_id = e.id AND r.statut = 'MANQUE') AS rdv_manques,
                       (SELECT COALESCE(max(CAST(:today AS DATE) - r.date_prevue), 0) FROM rendez_vous r
                         WHERE r.enfant_id = e.id AND r.statut = 'MANQUE') AS retard_max_jours,
                       (SELECT count(*) FROM rappel ra JOIN rendez_vous r ON r.id = ra.rendez_vous_id
                         WHERE r.enfant_id = e.id AND ra.statut = 'SANS_REPONSE' AND r.statut = 'MANQUE') AS rappels_sans_reponse,
                       (SELECT v.muac_mm FROM visite v WHERE v.enfant_id = e.id AND v.muac_mm IS NOT NULL
                         ORDER BY v.date_visite DESC, v.id DESC LIMIT 1) AS dernier_muac_mm,
                       COALESCE((SELECT d.statut FROM declaration_naissance d WHERE d.enfant_id = e.id),
                                CASE WHEN e.acte_externe IS NOT NULL THEN 'VALIDEE' END) AS statut_declaration,
                       (SELECT min(r.date_prevue) FROM rendez_vous r WHERE r.enfant_id = e.id
                         AND r.statut = 'PLANIFIE' AND r.date_prevue >= CAST(:today AS DATE)) AS prochain_rdv
                FROM enfant e
                JOIN famille f ON f.id = e.famille_id
                JOIN zone z ON z.id = f.zone_id
                WHERE f.consentement
                """ + (zoneId != null ? " AND f.zone_id = :zone" : "")
                + (codeEnfant != null ? " AND e.code_enfant = :code" : "") + " ORDER BY e.id";

        JdbcClient.StatementSpec spec = jdbc.sql(sql).param("today", aujourdhui);
        if (zoneId != null) {
            spec = spec.param("zone", zoneId);
        }
        if (codeEnfant != null) {
            spec = spec.param("code", codeEnfant);
        }
        return spec.query((rs, n) -> new LigneBrute(
                rs.getString("code_enfant"), rs.getString("code_famille"), rs.getString("zone"),
                rs.getString("porte"), rs.getString("statut"), Lignes.date(rs, "date_naissance"),
                Lignes.date(rs, "prochain_rdv"),
                new Indicateurs(rs.getString("statut"), Lignes.date(rs, "date_naissance"),
                        rs.getInt("rdv_manques"), rs.getInt("retard_max_jours"), rs.getInt("rappels_sans_reponse"),
                        Lignes.entier(rs, "dernier_muac_mm"), rs.getString("statut_declaration"),
                        rs.getBoolean("sans_telephone"), rs.getBoolean("mere_adolescente")))).list();
    }

    public Optional<EnfantRef> trouverEnfant(String codeEnfant) {
        return jdbc.sql("""
                SELECT e.id, e.famille_id, f.zone_id, e.code_enfant, f.code_famille, z.nom AS zone, f.porte,
                       f.langue, e.statut, e.date_naissance, e.date_terme_prevue, NOT f.a_telephone AS sans_telephone
                FROM enfant e JOIN famille f ON f.id = e.famille_id JOIN zone z ON z.id = f.zone_id
                WHERE e.code_enfant = :code""")
                .param("code", codeEnfant)
                .query((rs, n) -> new EnfantRef(rs.getLong("id"), rs.getLong("famille_id"), rs.getLong("zone_id"),
                        rs.getString("code_enfant"), rs.getString("code_famille"), rs.getString("zone"),
                        rs.getString("porte"), rs.getString("langue"), rs.getString("statut"),
                        Lignes.date(rs, "date_naissance"), Lignes.date(rs, "date_terme_prevue"),
                        rs.getBoolean("sans_telephone")))
                .optional();
    }

    public List<RendezVousDto> rendezVous(long enfantId) {
        return jdbc.sql("""
                SELECT id, type, libelle, date_prevue, statut, date_realisation
                FROM rendez_vous WHERE enfant_id = :id ORDER BY date_prevue, id""")
                .param("id", enfantId)
                .query((rs, n) -> new RendezVousDto(rs.getLong("id"), rs.getString("type"), rs.getString("libelle"),
                        Lignes.date(rs, "date_prevue"), rs.getString("statut"), Lignes.date(rs, "date_realisation")))
                .list();
    }

    public List<VisiteDto> dernieresVisites(long enfantId, int limite) {
        return jdbc.sql("""
                SELECT date_visite, muac_mm, poids_g, signes_danger FROM visite
                WHERE enfant_id = :id ORDER BY date_visite DESC, id DESC LIMIT :limite""")
                .param("id", enfantId).param("limite", limite)
                .query((rs, n) -> new VisiteDto(Lignes.date(rs, "date_visite"), Lignes.entier(rs, "muac_mm"),
                        Lignes.entier(rs, "poids_g"), rs.getBoolean("signes_danger")))
                .list();
    }

    public List<CarnetEnfant> carnetEnfants(long familleId) {
        List<EnfantCarnetBrut> enfants = jdbc.sql("""
                SELECT id, code_enfant, statut, date_naissance, date_terme_prevue
                FROM enfant WHERE famille_id = :id ORDER BY id""")
                .param("id", familleId)
                .query((rs, n) -> new EnfantCarnetBrut(rs.getLong("id"), rs.getString("code_enfant"),
                        rs.getString("statut"), Lignes.date(rs, "date_naissance"),
                        Lignes.date(rs, "date_terme_prevue")))
                .list();
        return enfants.stream()
                .map(e -> new CarnetEnfant(e.code(), e.statut(), e.naissance(), e.terme(), rendezVous(e.id()), List.of()))
                .toList();
    }

    private record EnfantCarnetBrut(long id, String code, String statut, LocalDate naissance, LocalDate terme) {
    }

    public Optional<Long> zoneDeFamille(String codeFamille) {
        return jdbc.sql("SELECT zone_id FROM famille WHERE code_famille = :c")
                .param("c", codeFamille).query(Long.class).optional();
    }

    public Optional<String> nomZoneDeFamille(String codeFamille) {
        return jdbc.sql("SELECT z.nom FROM famille f JOIN zone z ON z.id = f.zone_id WHERE f.code_famille = :c")
                .param("c", codeFamille).query(String.class).optional();
    }

    public Optional<String> languesFamille(String codeFamille) {
        return jdbc.sql("SELECT langue FROM famille WHERE code_famille = :c")
                .param("c", codeFamille).query(String.class).optional();
    }

    public boolean mereAdolescente(long familleId) {
        return jdbc.sql("SELECT mere_adolescente FROM famille WHERE id = :f").param("f", familleId)
                .query(Boolean.class).optional().orElse(false);
    }

    public Optional<String> codeCarte(String codeFamille) {
        return jdbc.sql("SELECT code_carte FROM famille WHERE code_famille = :c")
                .param("c", codeFamille).query(String.class).optional();
    }

    public Optional<Long> familleId(String codeFamille) {
        return jdbc.sql("SELECT id FROM famille WHERE code_famille = :c")
                .param("c", codeFamille).query(Long.class).optional();
    }

    /** Insertion idempotente : renvoie false si cette visite hors ligne a déjà été synchronisée. */
    public boolean insererVisite(UUID clientUuid, long enfantId, Long agentId, LocalDate date, Integer muacMm,
                                 Integer poidsG, boolean signesDanger) {
        return jdbc.sql("""
                INSERT INTO visite (client_uuid, enfant_id, agent_id, date_visite, muac_mm, poids_g, signes_danger)
                VALUES (:uuid, :enfant, :agent, :date, :muac, :poids, :danger)
                ON CONFLICT (client_uuid) DO NOTHING""")
                .param("uuid", clientUuid).param("enfant", enfantId).param("agent", agentId)
                .param("date", date).param("muac", muacMm).param("poids", poidsG).param("danger", signesDanger)
                .update() > 0;
    }

    public int marquerRealises(long enfantId, List<Long> rendezVousIds, LocalDate date) {
        if (rendezVousIds == null || rendezVousIds.isEmpty()) {
            return 0;
        }
        return jdbc.sql("""
                UPDATE rendez_vous SET statut = 'REALISE', date_realisation = :date
                WHERE enfant_id = :enfant AND id IN (:ids) AND statut <> 'REALISE'""")
                .param("date", date).param("enfant", enfantId).param("ids", rendezVousIds)
                .update();
    }
}
