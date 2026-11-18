package tg.fildor.repo;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Crèches : conditions d'accueil et réservations des familles. Aucun nom, aucune adresse. */
@Repository
public class CrecheRepository {

    public record Offre(int ageMinMois, int ageMaxMois, int capacite, LocalTime ouverture, LocalTime fermeture,
                        String jours, String conditions, String aApporter, String tarif) {
    }

    public record CrecheRef(long structureId, String code, String nom, String zone, String telephone, String horaires,
                            Offre offre, double lat, double lon) {
    }

    public record EnfantRef(long id, String code, LocalDate naissance) {
    }

    public record ReservationRef(long id, long structureId, long familleId, LocalDate dateJour, LocalTime arrivee,
                                 LocalTime depart, String statut, String nomCreche) {
    }

    public record LigneFamille(long id, String codeCreche, String nomCreche, String codeEnfant, LocalDate dateJour,
                               String formule, LocalTime arrivee, LocalTime depart, String statut, String note) {
    }

    public record LigneStructure(long id, String codeEnfant, LocalDate naissance, LocalDate dateJour, String formule,
                                 LocalTime arrivee, LocalTime depart, String statut, String note,
                                 java.time.OffsetDateTime creeLe, java.time.OffsetDateTime arriveeReelle,
                                 java.time.OffsetDateTime departReel) {
    }

    private static final String SELECT_CRECHE = """
            SELECT s.id, s.code, s.nom, z.nom AS zone,
                   COALESCE(s.latitude, z.latitude) AS lat, COALESCE(s.longitude, z.longitude) AS lon,
                   COALESCE(s.telephone, '') AS telephone,
                   COALESCE(s.horaires, '') AS horaires,
                   COALESCE(o.age_min_mois, 12) AS age_min, COALESCE(o.age_max_mois, 60) AS age_max,
                   COALESCE(o.capacite, 20) AS capacite,
                   COALESCE(o.ouverture, TIME '07:00') AS ouverture, COALESCE(o.fermeture, TIME '17:00') AS fermeture,
                   COALESCE(o.jours, 'LUN,MAR,MER,JEU,VEN') AS jours, COALESCE(o.conditions, '') AS conditions,
                   COALESCE(o.a_apporter, '') AS a_apporter, COALESCE(o.tarif, '') AS tarif
            FROM structure s
            JOIN zone z ON z.id = s.zone_id
            LEFT JOIN creche_offre o ON o.structure_id = s.id
            """;

    private final JdbcClient jdbc;

    public CrecheRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static CrecheRef creche(java.sql.ResultSet rs) throws java.sql.SQLException {
        Offre o = new Offre(rs.getInt("age_min"), rs.getInt("age_max"), rs.getInt("capacite"),
                rs.getObject("ouverture", LocalTime.class), rs.getObject("fermeture", LocalTime.class),
                rs.getString("jours"), rs.getString("conditions"), rs.getString("a_apporter"), rs.getString("tarif"));
        return new CrecheRef(rs.getLong("id"), rs.getString("code"), rs.getString("nom"), rs.getString("zone"),
                rs.getString("telephone"), rs.getString("horaires"), o, rs.getDouble("lat"), rs.getDouble("lon"));
    }

    public List<CrecheRef> creches() {
        return jdbc.sql(SELECT_CRECHE + " WHERE s.type = 'CRECHE' AND s.actif ORDER BY s.nom")
                .query((rs, n) -> creche(rs)).list();
    }

    public Optional<CrecheRef> crecheParCode(String code) {
        return jdbc.sql(SELECT_CRECHE + " WHERE s.type = 'CRECHE' AND s.actif AND s.code = :c")
                .param("c", code).query((rs, n) -> creche(rs)).optional();
    }

    public Optional<CrecheRef> crecheParId(long id) {
        return jdbc.sql(SELECT_CRECHE + " WHERE s.type = 'CRECHE' AND s.id = :i")
                .param("i", id).query((rs, n) -> creche(rs)).optional();
    }

    public void enregistrerOffre(long structureId, Offre o) {
        jdbc.sql("""
                INSERT INTO creche_offre (structure_id, age_min_mois, age_max_mois, capacite, ouverture, fermeture,
                                          jours, conditions, a_apporter, tarif)
                VALUES (:s, :amin, :amax, :cap, :ouv, :fer, :j, :cond, :app, :t)
                ON CONFLICT (structure_id) DO UPDATE SET age_min_mois = :amin, age_max_mois = :amax, capacite = :cap,
                    ouverture = :ouv, fermeture = :fer, jours = :j, conditions = :cond, a_apporter = :app, tarif = :t""")
                .param("s", structureId).param("amin", o.ageMinMois()).param("amax", o.ageMaxMois())
                .param("cap", o.capacite()).param("ouv", o.ouverture()).param("fer", o.fermeture())
                .param("j", o.jours()).param("cond", o.conditions()).param("app", o.aApporter())
                .param("t", o.tarif()).update();
    }

    public List<EnfantRef> enfantsDeLaFamille(long familleId) {
        return jdbc.sql("""
                SELECT id, code_enfant, date_naissance FROM enfant
                WHERE famille_id = :f AND statut = 'ENFANT' AND date_naissance IS NOT NULL ORDER BY date_naissance DESC""")
                .param("f", familleId)
                .query((rs, n) -> new EnfantRef(rs.getLong("id"), rs.getString("code_enfant"),
                        rs.getObject("date_naissance", LocalDate.class)))
                .list();
    }

    public long inserer(long structureId, long familleId, long enfantId, LocalDate jour, String formule,
                        LocalTime arrivee, LocalTime depart, String note) {
        return jdbc.sql("""
                INSERT INTO creche_reservation (structure_id, famille_id, enfant_id, date_jour, formule, heure_arrivee,
                                                heure_depart, note)
                VALUES (:s, :f, :e, :d, :fo, :a, :dep, :n) RETURNING id""")
                .param("s", structureId).param("f", familleId).param("e", enfantId).param("d", jour)
                .param("fo", formule).param("a", arrivee).param("dep", depart).param("n", note)
                .query(Long.class).single();
    }

    public List<LigneFamille> reservationsDeLaFamille(long familleId, LocalDate depuis) {
        return jdbc.sql("""
                SELECT r.id, s.code, s.nom, e.code_enfant, r.date_jour, r.formule, r.heure_arrivee, r.heure_depart,
                       r.statut, r.note
                FROM creche_reservation r
                JOIN structure s ON s.id = r.structure_id
                JOIN enfant e ON e.id = r.enfant_id
                WHERE r.famille_id = :f AND r.date_jour >= :d
                ORDER BY r.date_jour, r.heure_arrivee, r.id""")
                .param("f", familleId).param("d", depuis)
                .query((rs, n) -> new LigneFamille(rs.getLong("id"), rs.getString("code"), rs.getString("nom"),
                        rs.getString("code_enfant"), rs.getObject("date_jour", LocalDate.class), rs.getString("formule"),
                        rs.getObject("heure_arrivee", LocalTime.class), rs.getObject("heure_depart", LocalTime.class),
                        rs.getString("statut"), rs.getString("note")))
                .list();
    }

    public List<LigneStructure> reservationsDeLaStructure(long structureId, LocalDate du, LocalDate au) {
        return jdbc.sql("""
                SELECT r.id, e.code_enfant, e.date_naissance, r.date_jour, r.formule, r.heure_arrivee, r.heure_depart,
                       r.statut, r.note, r.cree_le, r.arrivee_reelle, r.depart_reel
                FROM creche_reservation r
                JOIN enfant e ON e.id = r.enfant_id
                WHERE r.structure_id = :s AND r.date_jour BETWEEN :du AND :au AND r.statut <> 'ANNULEE'
                ORDER BY r.date_jour, r.heure_arrivee, r.id""")
                .param("s", structureId).param("du", du).param("au", au)
                .query((rs, n) -> new LigneStructure(rs.getLong("id"), rs.getString("code_enfant"),
                        rs.getObject("date_naissance", LocalDate.class), rs.getObject("date_jour", LocalDate.class),
                        rs.getString("formule"), rs.getObject("heure_arrivee", LocalTime.class),
                        rs.getObject("heure_depart", LocalTime.class), rs.getString("statut"), rs.getString("note"),
                        rs.getObject("cree_le", java.time.OffsetDateTime.class),
                        rs.getObject("arrivee_reelle", java.time.OffsetDateTime.class),
                        rs.getObject("depart_reel", java.time.OffsetDateTime.class)))
                .list();
    }

    /** Arrivée de l'enfant à la crèche : seulement le jour prévu, une seule fois. */
    public boolean pointerArrivee(long id, long structureId, LocalDate aujourdhui) {
        return jdbc.sql("""
                UPDATE creche_reservation SET arrivee_reelle = now()
                WHERE id = :i AND structure_id = :s AND statut = 'CONFIRMEE' AND date_jour = :d
                  AND arrivee_reelle IS NULL""")
                .param("i", id).param("s", structureId).param("d", aujourdhui).update() > 0;
    }

    /** Départ de l'enfant : après son arrivée, une seule fois. */
    public boolean pointerDepart(long id, long structureId, LocalDate aujourdhui) {
        return jdbc.sql("""
                UPDATE creche_reservation SET depart_reel = now()
                WHERE id = :i AND structure_id = :s AND statut = 'CONFIRMEE' AND date_jour = :d
                  AND arrivee_reelle IS NOT NULL AND depart_reel IS NULL""")
                .param("i", id).param("s", structureId).param("d", aujourdhui).update() > 0;
    }

    public Optional<ReservationRef> parId(long id) {
        return jdbc.sql("""
                SELECT r.id, r.structure_id, r.famille_id, r.date_jour, r.heure_arrivee, r.heure_depart, r.statut, s.nom
                FROM creche_reservation r JOIN structure s ON s.id = r.structure_id WHERE r.id = :i""")
                .param("i", id)
                .query((rs, n) -> new ReservationRef(rs.getLong("id"), rs.getLong("structure_id"),
                        rs.getLong("famille_id"), rs.getObject("date_jour", LocalDate.class),
                        rs.getObject("heure_arrivee", LocalTime.class), rs.getObject("heure_depart", LocalTime.class),
                        rs.getString("statut"), rs.getString("nom")))
                .optional();
    }

    public int nombreConfirmees(long structureId, LocalDate jour) {
        return jdbc.sql("SELECT COUNT(*) FROM creche_reservation WHERE structure_id = :s AND date_jour = :d AND statut = 'CONFIRMEE'")
                .param("s", structureId).param("d", jour).query(Integer.class).single();
    }

    /** Décision de la crèche : seulement sur une demande en attente. */
    public boolean decider(long id, long structureId, String statut, long userId) {
        return jdbc.sql("""
                UPDATE creche_reservation SET statut = :st, traitee_par = :u
                WHERE id = :i AND structure_id = :s AND statut = 'DEMANDEE'""")
                .param("st", statut).param("u", userId).param("i", id).param("s", structureId).update() > 0;
    }

    public boolean annulerParFamille(long id, long familleId) {
        return jdbc.sql("""
                UPDATE creche_reservation SET statut = 'ANNULEE'
                WHERE id = :i AND famille_id = :f AND statut IN ('DEMANDEE', 'CONFIRMEE')""")
                .param("i", id).param("f", familleId).update() > 0;
    }
}
