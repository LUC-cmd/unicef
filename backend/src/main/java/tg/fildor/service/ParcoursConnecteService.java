package tg.fildor.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.config.FilDorProperties;
import tg.fildor.repo.ParcoursConnecteRepository;
import tg.fildor.repo.ParcoursConnecteRepository.Faits;
import tg.fildor.repo.ParcoursConnecteRepository.Fragile;
import tg.fildor.repo.ParcoursConnecteRepository.Progres;
import tg.fildor.repo.ParcoursConnecteRepository.Rupture;
import tg.fildor.repo.SuiviRepository;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * « Un enfant, un parcours » : les six étapes de la grossesse au préscolaire, reliées pour chaque enfant,
 * et les endroits où des enfants se perdent entre deux services (comptages par zone, jamais un enfant).
 */
@Service
public class ParcoursConnecteService {

    public static final Set<String> BESOINS = Set.of("EAU", "HYGIENE", "PROTECTION_SOCIALE", "PARENTALITE");

    public record Etape(String code, String titre, String etat, String detail, String action) {
    }

    public record Parcours(String codeEnfant, int ageMois, List<Etape> etapes, List<String> besoinsSociaux,
                           boolean mereAdolescente, String prochainPas) {
    }

    public record ZoneRupture(String zone, boolean masquee, Long grossesseSansNaissance, Long naissanceSansDeclaration,
                              Long acteNonRetire, Long vaccineSansEveil, Long troisCinqAnsHorsPrescolaire,
                              Long petitPoidsSansVisite) {
    }

    public record Ruptures(long grossesseSansNaissance, long naissanceSansDeclaration, long acteNonRetire,
                           long vaccineSansEveil, long troisCinqAns, long troisCinqAnsAuPrescolaire,
                           int partPrescolaire, long petitPoidsSansVisite, List<ZoneRupture> zones) {
    }

    public record LigneFragile(String codeEnfant, String codeFamille, String zone, LocalDate dateNaissance,
                               int poidsG, int jour, boolean j1, boolean j3, boolean j7, String aFaire) {
    }

    private final ParcoursConnecteRepository repo;
    private final SuiviService suivi;
    private final SuiviRepository suiviRepo;
    private final AccesService acces;
    private final FilDorProperties props;
    private final Clock clock;

    public ParcoursConnecteService(ParcoursConnecteRepository repo, SuiviService suivi, SuiviRepository suiviRepo,
                                   AccesService acces, FilDorProperties props, Clock clock) {
        this.repo = repo;
        this.suivi = suivi;
        this.suiviRepo = suiviRepo;
        this.acces = acces;
        this.props = props;
        this.clock = clock;
    }

    public Parcours parcours(AppUser u, String codeEnfant) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        acces.tracer(u, "CONSULTER_PARCOURS", codeEnfant);
        LocalDate auj = LocalDate.now(clock);
        Faits f = repo.faits(e.id());
        boolean ne = "ENFANT".equals(e.statut()) && e.dateNaissance() != null;
        int ageMois = ne ? (int) ChronoUnit.MONTHS.between(e.dateNaissance(), auj) : 0;
        long jours = ne ? ChronoUnit.DAYS.between(e.dateNaissance(), auj) : 0;
        boolean ado = suiviRepo.mereAdolescente(e.familleId());
        List<Etape> et = new ArrayList<>();

        et.add(ado
                ? new Etape("ADOLESCENCE", "Adolescence", "EN_COURS",
                        "Jeune mère : planification familiale, retour à l'école, protection.", "ADOS")
                : new Etape("ADOLESCENCE", "Adolescence", "SANS_OBJET", "Pas de situation particulière notée.", null));

        et.add(!ne
                ? new Etape("GROSSESSE", "Grossesse", "EN_COURS", f.consultationsFaites() + " consultation(s) prénatale(s) faite(s).", null)
                : new Etape("GROSSESSE", "Grossesse", "FAIT", "Grossesse suivie : " + f.consultationsFaites() + " consultation(s) notée(s).", null));

        if (!ne) {
            boolean depasse = e.dateTermePrevue() != null && e.dateTermePrevue().isBefore(auj.minusDays(30));
            et.add(new Etape("NAISSANCE", "Naissance", depasse ? "RUPTURE" : "A_VENIR",
                    depasse ? "Terme dépassé de plus d'un mois : la naissance n'est pas notée. Prendre des nouvelles." : "Accouchement sûr, puis déclaration à l'état civil.", null));
        } else if (f.statutDeclaration() == null) {
            boolean tard = jours > 45;
            et.add(new Etape("NAISSANCE", "Naissance", tard ? "RUPTURE" : "A_FAIRE",
                    tard ? "Pas déclarée après 45 jours : jugement supplétif nécessaire (6 000 FCFA)." : "Déclaration à lancer, gratuite avant 45 jours.", "DECLARER"));
        } else if (f.acteRetire()) {
            et.add(new Etape("NAISSANCE", "Naissance", "FAIT", "Acte de naissance retiré par la famille.", null));
        } else if ("VALIDEE".equals(f.statutDeclaration())) {
            boolean attente = f.actePretLe() != null && f.actePretLe().isBefore(auj.minusDays(30));
            et.add(new Etape("NAISSANCE", "Naissance", attente ? "RUPTURE" : "EN_COURS",
                    f.actePretLe() != null ? "Acte prêt, pas encore retiré par la famille." : "Déclaration validée, acte en préparation.", null));
        } else if ("REJETEE".equals(f.statutDeclaration())) {
            et.add(new Etape("NAISSANCE", "Naissance", "RUPTURE", "Déclaration rejetée : corriger et renvoyer.", "DECLARER"));
        } else {
            et.add(new Etape("NAISSANCE", "Naissance", "EN_COURS", "Déclaration envoyée, en attente de l'état civil.", null));
        }

        if (!ne) {
            et.add(new Etape("PETITE_ENFANCE", "Petite enfance", "A_VENIR", "Vaccins, croissance et nutrition dès la naissance.", null));
        } else {
            boolean mal = f.dernierMuacMm() != null && f.dernierMuacMm() < 125;
            String etat = f.vaccinsManques() > 0 || mal ? "RUPTURE" : (f.vaccinsFaits() > 0 ? "EN_COURS" : "A_FAIRE");
            StringBuilder d = new StringBuilder(f.vaccinsFaits() + " vaccin(s) fait(s)");
            if (f.vaccinsManques() > 0) d.append(", ").append(f.vaccinsManques()).append(" manqué(s)");
            if (mal) d.append(". Périmètre brachial bas : orienter vers le centre de santé");
            et.add(new Etape("PETITE_ENFANCE", "Petite enfance", etat, d + ".", null));
        }

        if (!ne) {
            et.add(new Etape("EVEIL", "Éveil précoce", "A_VENIR", "Jeux simples dès les premiers jours de vie.", null));
        } else if (f.activitesEveil() == 0 && (f.vaccinsFaits() > 0 || ageMois >= 6)) {
            et.add(new Etape("EVEIL", "Éveil précoce", "RUPTURE", "Vacciné mais jamais orienté vers l'éveil : montrer le jeu du jour à la famille.", "EVEIL"));
        } else {
            et.add(new Etape("EVEIL", "Éveil précoce", f.activitesEveil() > 0 ? "EN_COURS" : "A_FAIRE", f.activitesEveil() + " jeu(x) fait(s) à la maison.", null));
        }

        if (!ne || ageMois < 36) {
            et.add(new Etape("PRESCOLAIRE", "Préscolaire", "A_VENIR", "À partir de 3 ans : jardin d'enfants ou crèche solidaire.", null));
        } else if (f.prescolaireLe() != null) {
            et.add(new Etape("PRESCOLAIRE", "Préscolaire", "FAIT", "Inscrit au préscolaire.", null));
        } else {
            et.add(new Etape("PRESCOLAIRE", "Préscolaire", ageMois >= 42 ? "RUPTURE" : "A_FAIRE",
                    "Pas encore au préscolaire : orienter vers un jardin d'enfants proche.", "PRESCOLAIRE"));
        }

        String prochain = et.stream().filter(x -> "RUPTURE".equals(x.etat())).findFirst()
                .or(() -> et.stream().filter(x -> "A_FAIRE".equals(x.etat())).findFirst())
                .map(x -> x.titre() + " : " + x.detail()).orElse("Le parcours est à jour. Continuer le suivi habituel.");
        return new Parcours(codeEnfant, ageMois, et, repo.besoins(e.familleId()), ado, prochain);
    }

    public Parcours orienterPrescolaire(AppUser u, String codeEnfant) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        LocalDate auj = LocalDate.now(clock);
        if (!"ENFANT".equals(e.statut()) || e.dateNaissance() == null
                || ChronoUnit.MONTHS.between(e.dateNaissance(), auj) < 30) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le préscolaire concerne les enfants à partir de 30 mois");
        }
        repo.fixerPrescolaire(e.id(), auj);
        acces.tracer(u, "ORIENTER_PRESCOLAIRE", codeEnfant);
        return parcours(u, codeEnfant);
    }

    public Parcours besoins(AppUser u, String codeEnfant, List<String> types) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        List<String> propres = types.stream().filter(BESOINS::contains).distinct().toList();
        repo.remplacerBesoins(e.familleId(), propres, LocalDate.now(clock));
        acces.tracer(u, "BESOINS_SOCIAUX", codeEnfant);
        return parcours(u, codeEnfant);
    }

    public Ruptures ruptures(AppUser u) {
        acces.tracer(u, "CONSULTER_RUPTURES", null);
        String region = "DECIDEUR".equals(u.role()) ? u.region() : null;
        List<Rupture> lignes = repo.ruptures(LocalDate.now(clock), region);
        List<ZoneRupture> zones = lignes.stream().map(r -> r.familles() < props.seuilAnonymat()
                ? new ZoneRupture(r.zone(), true, null, null, null, null, null, null)
                : new ZoneRupture(r.zone(), false, r.grossesseSansNaissance(), r.naissanceSansDeclaration(), r.acteNonRetire(),
                        r.vaccineSansEveil(), r.troisCinqAns() - r.troisCinqAnsAuPrescolaire(), r.petitPoidsSansVisite())).toList();
        long gsn = lignes.stream().mapToLong(Rupture::grossesseSansNaissance).sum();
        long nsd = lignes.stream().mapToLong(Rupture::naissanceSansDeclaration).sum();
        long anr = lignes.stream().mapToLong(Rupture::acteNonRetire).sum();
        long vse = lignes.stream().mapToLong(Rupture::vaccineSansEveil).sum();
        long t35 = lignes.stream().mapToLong(Rupture::troisCinqAns).sum();
        long t35p = lignes.stream().mapToLong(Rupture::troisCinqAnsAuPrescolaire).sum();
        long pps = lignes.stream().mapToLong(Rupture::petitPoidsSansVisite).sum();
        return new Ruptures(gsn, nsd, anr, vse, t35, t35p, t35 == 0 ? 0 : (int) Math.round(100.0 * t35p / t35), pps, zones);
    }

    public List<Progres> progres(AppUser u) {
        return repo.progres("DECIDEUR".equals(u.role()) ? u.region() : null);
    }

    public List<LigneFragile> fragiles(AppUser u) {
        LocalDate auj = LocalDate.now(clock);
        acces.tracer(u, "CONSULTER_FRAGILES", null);
        return repo.fragiles(u.zoneId(), auj).stream().map((Fragile f) -> {
            int jour = (int) ChronoUnit.DAYS.between(f.dateNaissance(), auj);
            String afaire = !f.j1() && jour >= 1 ? "Visite J1 à faire" : !f.j3() && jour >= 3 ? "Visite J3 à faire"
                    : !f.j7() && jour >= 7 ? "Visite J7 à faire" : jour < 7 ? "Prochain passage selon le calendrier" : "Première semaine suivie";
            return new LigneFragile(f.codeEnfant(), f.codeFamille(), f.zone(), f.dateNaissance(), f.poidsG(), jour,
                    f.j1(), f.j3(), f.j7(), afaire);
        }).toList();
    }
}
