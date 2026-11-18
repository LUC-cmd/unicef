package tg.fildor.service;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.CrecheRepository;
import tg.fildor.repo.CrecheRepository.CrecheRef;
import tg.fildor.repo.CrecheRepository.EnfantRef;
import tg.fildor.repo.CrecheRepository.Offre;
import tg.fildor.repo.CrecheRepository.ReservationRef;
import tg.fildor.repo.MessageRepository;
import tg.fildor.repo.RappelRepository.Identite;

/**
 * Crèches : une famille voit les conditions d'accueil, ce qu'il faut apporter, puis demande des jours, des
 * demi-journées et des heures d'arrivée et de départ. La crèche confirme ou refuse ; la famille est prévenue par
 * message. La crèche ne voit qu'un code d'enfant et son âge, jamais d'identité.
 */
@Service
public class CrecheService {

    private static final Set<String> FORMULES = Set.of("JOURNEE", "MATIN", "APRES_MIDI");
    private static final Set<String> JOURS = Set.of("LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM");
    private static final int HORIZON_JOURS = 60;
    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public record CrecheDto(String code, String nom, String zone, String telephone, String horaires, int ageMinMois,
                            int ageMaxMois, int capacite, String ouverture, String fermeture, String jours,
                            String conditions, String aApporter, String tarif, Double latitude, Double longitude) {
    }

    public record EnfantChoix(String codeEnfant, int ageMois) {
    }

    public record ReservationFamille(long id, String codeCreche, String nomCreche, String codeEnfant, LocalDate dateJour,
                                     String formule, String heureArrivee, String heureDepart, String statut,
                                     String note) {
    }

    public record MesCreches(List<EnfantChoix> enfants, List<ReservationFamille> reservations) {
    }

    public record ReservationStructure(long id, String codeEnfant, int ageMois, LocalDate dateJour, String formule,
                                       String heureArrivee, String heureDepart, String statut, String note,
                                       java.time.OffsetDateTime creeLe, String arriveeReelle, String departReel) {
    }

    public record Reservation(String telephone, String codeFamille, String codeEnfant, LocalDate dateJour, String formule,
                              String heureArrivee, String heureDepart, String note) {
    }

    public record OffreMaj(int ageMinMois, int ageMaxMois, int capacite, String ouverture, String fermeture,
                           String jours, String conditions, String aApporter, String tarif) {
    }

    private final CrecheRepository creches;
    private final MessageRepository messages;
    private final AccesFamille accesFamille;
    private final AccesService acces;
    private final Clock clock;

    public CrecheService(CrecheRepository creches, MessageRepository messages, AccesFamille accesFamille,
                         AccesService acces, Clock clock) {
        this.creches = creches;
        this.messages = messages;
        this.accesFamille = accesFamille;
        this.acces = acces;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ côté famille

    public List<CrecheDto> liste() {
        return creches.creches().stream().map(CrecheService::dto).toList();
    }

    static CrecheDto dto(CrecheRef c) {
        Offre o = c.offre();
        return new CrecheDto(c.code(), c.nom(), c.zone(), c.telephone(), c.horaires(), o.ageMinMois(), o.ageMaxMois(),
                o.capacite(), o.ouverture().format(HEURE), o.fermeture().format(HEURE), o.jours(), o.conditions(),
                o.aApporter(), o.tarif(), c.lat(), c.lon());
    }

    private static int ageMois(LocalDate naissance, LocalDate jour) {
        Period p = Period.between(naissance, jour);
        return p.getYears() * 12 + p.getMonths();
    }

    public MesCreches mesCreches(String telephone, String codeFamille) {
        Identite f = accesFamille.verifier(telephone, codeFamille);
        LocalDate auj = LocalDate.now(clock);
        List<EnfantChoix> enfants = creches.enfantsDeLaFamille(f.familleId()).stream()
                .map(e -> new EnfantChoix(e.code(), ageMois(e.naissance(), auj))).toList();
        List<ReservationFamille> res = creches.reservationsDeLaFamille(f.familleId(), auj.minusDays(7)).stream()
                .map(l -> new ReservationFamille(l.id(), l.codeCreche(), l.nomCreche(), l.codeEnfant(), l.dateJour(),
                        l.formule(), l.arrivee().format(HEURE), l.depart().format(HEURE), l.statut(), l.note()))
                .toList();
        return new MesCreches(enfants, res);
    }

    private static LocalTime heure(String texte, String champ) {
        try {
            return LocalTime.parse(texte == null ? "" : texte.trim(), HEURE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Heure invalide pour " + champ + " : format HH:mm");
        }
    }

    private static String codeJour(DayOfWeek d) {
        return switch (d) {
            case MONDAY -> "LUN";
            case TUESDAY -> "MAR";
            case WEDNESDAY -> "MER";
            case THURSDAY -> "JEU";
            case FRIDAY -> "VEN";
            case SATURDAY -> "SAM";
            case SUNDAY -> "DIM";
        };
    }

    @Transactional
    public long reserver(String codeCreche, Reservation r) {
        Identite f = accesFamille.verifier(r.telephone(), r.codeFamille());
        CrecheRef c = creches.crecheParCode(codeCreche)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crèche introuvable"));
        EnfantRef enfant = creches.enfantsDeLaFamille(f.familleId()).stream()
                .filter(e -> e.code().equals(r.codeEnfant())).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enfant introuvable"));
        LocalDate auj = LocalDate.now(clock);
        if (r.dateJour() == null || r.dateJour().isBefore(auj) || r.dateJour().isAfter(auj.plusDays(HORIZON_JOURS))) {
            throw new IllegalArgumentException("Choisissez un jour dans les " + HORIZON_JOURS + " prochains jours");
        }
        if (r.formule() == null || !FORMULES.contains(r.formule())) {
            throw new IllegalArgumentException("Formule inconnue : journée, matin ou après-midi");
        }
        Offre o = c.offre();
        if (!List.of(o.jours().split(",")).contains(codeJour(r.dateJour().getDayOfWeek()))) {
            throw new IllegalArgumentException("La crèche est fermée ce jour-là (ouvert : " + o.jours() + ")");
        }
        int age = ageMois(enfant.naissance(), r.dateJour());
        if (age < o.ageMinMois() || age > o.ageMaxMois()) {
            throw new IllegalArgumentException("Cette crèche accueille les enfants de " + o.ageMinMois() + " à "
                    + o.ageMaxMois() + " mois");
        }
        LocalTime arrivee = heure(r.heureArrivee(), "l'arrivée");
        LocalTime depart = heure(r.heureDepart(), "le départ");
        if (!arrivee.isBefore(depart)) {
            throw new IllegalArgumentException("L'heure de départ doit être après l'heure d'arrivée");
        }
        if (arrivee.isBefore(o.ouverture()) || depart.isAfter(o.fermeture())) {
            throw new IllegalArgumentException("La crèche accueille de " + o.ouverture().format(HEURE) + " à "
                    + o.fermeture().format(HEURE));
        }
        String note = r.note() == null ? "" : r.note().trim();
        if (note.length() > 200) {
            throw new IllegalArgumentException("Note trop longue (200 caractères au plus)");
        }
        try {
            return creches.inserer(c.structureId(), f.familleId(), enfant.id(), r.dateJour(), r.formule(), arrivee,
                    depart, note);
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une demande existe déjà pour cet enfant ce jour-là");
        }
    }

    @Transactional
    public void annuler(String telephone, String codeFamille, long id) {
        Identite f = accesFamille.verifier(telephone, codeFamille);
        if (!creches.annulerParFamille(id, f.familleId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Réservation introuvable ou déjà annulée");
        }
    }

    // ------------------------------------------------------------------ côté crèche

    private static long structureDe(AppUser u) {
        if (u.structureId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce compte n'est rattaché à aucune structure");
        }
        return u.structureId();
    }

    public CrecheDto maCreche(AppUser u) {
        return creches.crecheParId(structureDe(u))
                .map(CrecheService::dto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cette structure n'est pas une crèche"));
    }

    @Transactional
    public CrecheDto mettreAJourOffre(AppUser u, OffreMaj m) {
        long id = structureDe(u);
        creches.crecheParId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cette structure n'est pas une crèche"));
        LocalTime ouv = heure(m.ouverture(), "l'ouverture");
        LocalTime fer = heure(m.fermeture(), "la fermeture");
        if (!ouv.isBefore(fer)) {
            throw new IllegalArgumentException("La fermeture doit être après l'ouverture");
        }
        if (m.ageMinMois() < 0 || m.ageMaxMois() > 72 || m.ageMinMois() >= m.ageMaxMois()) {
            throw new IllegalArgumentException("Âges invalides (en mois, de 0 à 72)");
        }
        if (m.capacite() < 1 || m.capacite() > 200) {
            throw new IllegalArgumentException("Capacité invalide (1 à 200)");
        }
        String jours = m.jours() == null ? "" : m.jours().trim().toUpperCase();
        if (jours.isEmpty() || !JOURS.containsAll(List.of(jours.split(",")))) {
            throw new IllegalArgumentException("Jours invalides : LUN,MAR,MER,JEU,VEN,SAM,DIM");
        }
        creches.enregistrerOffre(id, new Offre(m.ageMinMois(), m.ageMaxMois(), m.capacite(), ouv, fer, jours,
                limiter(m.conditions(), 600), limiter(m.aApporter(), 600), limiter(m.tarif(), 200)));
        acces.tracer(u, "METTRE_A_JOUR_CRECHE", String.valueOf(id));
        return maCreche(u);
    }

    private static String limiter(String t, int max) {
        String s = t == null ? "" : t.trim();
        if (s.length() > max) {
            throw new IllegalArgumentException("Texte trop long (" + max + " caractères au plus)");
        }
        return s;
    }

    public List<ReservationStructure> reservations(AppUser u, LocalDate du, LocalDate au) {
        long id = structureDe(u);
        LocalDate debut = du == null ? LocalDate.now(clock) : du;
        LocalDate fin = au == null ? debut.plusDays(6) : au;
        if (fin.isBefore(debut) || fin.isAfter(debut.plusDays(62))) {
            throw new IllegalArgumentException("Période invalide (62 jours au plus)");
        }
        acces.tracer(u, "LISTER_RESERVATIONS_CRECHE", debut.toString());
        return creches.reservationsDeLaStructure(id, debut, fin).stream()
                .map(l -> new ReservationStructure(l.id(), l.codeEnfant(), ageMois(l.naissance(), l.dateJour()),
                        l.dateJour(), l.formule(), l.arrivee().format(HEURE), l.depart().format(HEURE), l.statut(),
                        l.note(), l.creeLe(), heureLocale(l.arriveeReelle()), heureLocale(l.departReel())))
                .toList();
    }

    private String heureLocale(java.time.OffsetDateTime t) {
        return t == null ? null : t.atZoneSameInstant(clock.getZone()).toLocalTime().format(HEURE);
    }

    /** Présence du jour : la crèche note l'arrivée ou le départ de l'enfant, la famille en est informée. */
    @Transactional
    public void pointer(AppUser u, long reservationId, String action) {
        long structureId = structureDe(u);
        if (!"ARRIVEE".equals(action) && !"DEPART".equals(action)) {
            throw new IllegalArgumentException("Action inconnue : ARRIVEE ou DEPART");
        }
        ReservationRef r = creches.parId(reservationId).filter(x -> x.structureId() == structureId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réservation introuvable"));
        LocalDate auj = LocalDate.now(clock);
        boolean ok = "ARRIVEE".equals(action) ? creches.pointerArrivee(reservationId, structureId, auj)
                : creches.pointerDepart(reservationId, structureId, auj);
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "ARRIVEE".equals(action) ? "Arrivée déjà notée, ou réservation non confirmée pour aujourd'hui"
                            : "Départ déjà noté, ou l'arrivée n'a pas été notée");
        }
        String heure = LocalTime.now(clock).format(HEURE);
        messages.ajouterPourFamille(r.familleId(), "CRECHE", "ARRIVEE".equals(action)
                ? "Fil d'Or : votre enfant est bien arrivé à " + r.nomCreche() + " à " + heure + "."
                : "Fil d'Or : votre enfant a quitté " + r.nomCreche() + " à " + heure + ".");
        acces.tracer(u, "POINTAGE_CRECHE_" + action, String.valueOf(reservationId));
    }

    @Transactional
    public void decider(AppUser u, long reservationId, String decision) {
        long structureId = structureDe(u);
        if (!"CONFIRMEE".equals(decision) && !"REFUSEE".equals(decision)) {
            throw new IllegalArgumentException("Décision inconnue : CONFIRMEE ou REFUSEE");
        }
        ReservationRef r = creches.parId(reservationId).filter(x -> x.structureId() == structureId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réservation introuvable"));
        if ("CONFIRMEE".equals(decision)) {
            int capacite = creches.crecheParId(structureId).map(c -> c.offre().capacite()).orElse(0);
            if (creches.nombreConfirmees(structureId, r.dateJour()) >= capacite) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "La crèche est complète ce jour-là");
            }
        }
        if (!creches.decider(reservationId, structureId, decision, u.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande déjà traitée");
        }
        String jour = r.dateJour().format(JOUR);
        String texte = "CONFIRMEE".equals(decision)
                ? "Fil d'Or : " + r.nomCreche() + " a confirmé la place de votre enfant le " + jour + ", de "
                        + r.arrivee().format(HEURE) + " à " + r.depart().format(HEURE) + "."
                : "Fil d'Or : " + r.nomCreche() + " ne peut pas accueillir votre enfant le " + jour
                        + ". Vous pouvez choisir un autre jour ou une autre crèche.";
        messages.ajouterPourFamille(r.familleId(), "CRECHE", texte);
        acces.tracer(u, "DECISION_RESERVATION_CRECHE", String.valueOf(reservationId));
    }
}
