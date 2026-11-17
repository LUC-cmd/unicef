package tg.fildor.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.RendezVousDto;
import tg.fildor.domain.Dtos.VisiteDto;
import tg.fildor.repo.CarteRepository;
import tg.fildor.repo.CarteRepository.FamilleCarte;
import tg.fildor.repo.DeclarationRepository;
import tg.fildor.repo.SuiviRepository;

/**
 * Une famille qui change de région garde son suivi : un agent, où qu'il soit, retrouve son dossier de santé avec le numéro de
 * famille et le code de la carte. Chaque consultation est inscrite dans le journal.
 */
@Service
public class CarteService {

    public record EnfantSante(String codeEnfant, String statut, LocalDate dateNaissance, LocalDate dateTermePrevue,
                              List<RendezVousDto> rendezVous, List<VisiteDto> visites, boolean signeDangerRecent,
                              String declaration) {
    }

    public record DossierSante(String codeFamille, String zone, String region, String langue, boolean dansMaZone,
                               List<CarteRepository.Transfert> transferts, List<EnfantSante> enfants) {
    }

    private static final int ESSAIS_MAX = 5;
    private static final long FENETRE_SECONDES = 900;

    private final CarteRepository cartes;
    private final SuiviRepository suivi;
    private final DeclarationRepository declarations;
    private final AccesService acces;
    private final ConcurrentHashMap<Long, Deque<Instant>> echecs = new ConcurrentHashMap<>();

    public CarteService(CarteRepository cartes, SuiviRepository suivi, DeclarationRepository declarations,
                        AccesService acces) {
        this.cartes = cartes;
        this.suivi = suivi;
        this.declarations = declarations;
        this.acces = acces;
    }

    private void verifierEssais(AppUser u) {
        Deque<Instant> d = echecs.computeIfAbsent(u.id(), k -> new ArrayDeque<>());
        synchronized (d) {
            Instant limite = Instant.now().minusSeconds(FENETRE_SECONDES);
            while (!d.isEmpty() && d.peekFirst().isBefore(limite)) {
                d.pollFirst();
            }
            if (d.size() >= ESSAIS_MAX) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Trop d'essais. Attendez quelques minutes avant de réessayer.");
            }
        }
    }

    private FamilleCarte verifier(AppUser u, String codeFamille, String codeCarte) {
        verifierEssais(u);
        String code = codeFamille == null ? "" : codeFamille.strip().toUpperCase();
        String carte = codeCarte == null ? "" : codeCarte.strip();
        FamilleCarte f = cartes.trouver(code).orElse(null);
        boolean ok = f != null && java.security.MessageDigest.isEqual(
                f.codeCarte().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                carte.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        if (!ok) {
            Deque<Instant> d = echecs.computeIfAbsent(u.id(), k -> new ArrayDeque<>());
            synchronized (d) {
                d.addLast(Instant.now());
            }
            acces.tracer(u, "CARTE_REFUSEE", code);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Numéro de famille ou code de carte incorrect");
        }
        return f;
    }

    public DossierSante ouvrir(AppUser u, String codeFamille, String codeCarte, LocalDate aujourdhui) {
        FamilleCarte f = verifier(u, codeFamille, codeCarte);
        acces.tracer(u, "CONSULTER_CARTE", f.codeFamille());
        boolean dansMaZone = u.zoneId() == null || u.zoneId() == f.zoneId();
        List<EnfantSante> enfants = cartes.enfants(f.id()).stream().map(e -> {
            List<VisiteDto> visites = suivi.dernieresVisites(e.id(), 40);
            boolean danger = visites.stream().limit(3).anyMatch(VisiteDto::signesDanger);
            String decl = declarations.parEnfant(e.id()).map(d -> d.statut()).orElse(null);
            return new EnfantSante(e.codeEnfant(), e.statut(), e.dateNaissance(), e.dateTermePrevue(),
                    suivi.rendezVous(e.id()), visites, danger, decl);
        }).toList();
        return new DossierSante(f.codeFamille(), f.zone(), f.region(), f.langue(), dansMaZone,
                cartes.transferts(f.id()), enfants);
    }

    /** La famille a déménagé : son suivi continue dans la zone de l'agent (ou la zone choisie par l'administrateur). */
    @Transactional
    public String transferer(AppUser u, String codeFamille, String codeCarte, String codeZone) {
        FamilleCarte f = verifier(u, codeFamille, codeCarte);
        long vers;
        if (u.zoneId() != null) {
            vers = u.zoneId();
        } else {
            vers = cartes.zoneParCode(codeZone == null ? "" : codeZone.strip())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez la zone d'arrivée"));
        }
        if (vers == f.zoneId()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette famille est déjà suivie dans cette zone");
        }
        cartes.transferer(f.id(), f.zoneId(), vers, u.id());
        acces.tracer(u, "TRANSFERER_FAMILLE", f.codeFamille() + ":" + f.zoneId() + "->" + vers);
        return "Le suivi de la famille " + f.codeFamille() + " continue maintenant dans votre zone.";
    }
}
