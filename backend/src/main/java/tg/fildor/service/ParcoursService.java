package tg.fildor.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.config.FilDorProperties;
import tg.fildor.repo.MessageRepository;
import tg.fildor.repo.ParcoursRepository;
import tg.fildor.repo.ParcoursRepository.ContexteActe;
import tg.fildor.repo.ParcoursRepository.LigneActe;
import tg.fildor.repo.ParcoursRepository.ZoneActes;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * Passages entre deux services : de la déclaration validée à l'acte retiré par la famille, et du poids de naissance
 * au suivi renforcé du nouveau-né fragile. Aucun nom, aucune adresse.
 */
@Service
public class ParcoursService {

    public static final int SEUIL_PETIT_POIDS_G = 2500;
    public static final int SEUIL_TRES_PETIT_POIDS_G = 1500;

    public record ZoneActe(String zone, boolean masquee, Long validees, Long retires, Integer tauxNonRetires) {
    }

    public record Actes(long validees, long prets, long retires, long nonRetires, int tauxNonRetires,
                        List<ZoneActe> zones, List<LigneActe> lignes) {
    }

    public record InfoNaissance(Integer poidsNaissanceG, boolean petitPoids, boolean tresPetitPoids,
                                List<LocalDate> visitesRenforcees, String conseil) {
    }

    private final ParcoursRepository parcours;
    private final MessageRepository messages;
    private final SuiviService suivi;
    private final AccesService acces;
    private final FilDorProperties props;
    private final Clock clock;

    public ParcoursService(ParcoursRepository parcours, MessageRepository messages, SuiviService suivi,
                           AccesService acces, FilDorProperties props, Clock clock) {
        this.parcours = parcours;
        this.messages = messages;
        this.suivi = suivi;
        this.acces = acces;
        this.props = props;
        this.clock = clock;
    }

    private static int taux(long retires, long validees) {
        return validees == 0 ? 0 : (int) Math.round(100.0 * (validees - retires) / validees);
    }

    /** Tableau de l'état civil : tous les actes validés. Le responsable régional n'a que les zones assez grandes. */
    public Actes actes(AppUser u, boolean masquerPetitesZones) {
        acces.tracer(u, "CONSULTER_ACTES", masquerPetitesZones ? "decideur" : "mairie");
        List<LigneActe> lignes = parcours.actesValides();
        long validees = lignes.size();
        long retires = lignes.stream().filter(l -> l.acteRetireLe() != null).count();
        long prets = lignes.stream().filter(l -> l.actePretLe() != null && l.acteRetireLe() == null).count();
        List<ZoneActe> zones = parcours.parZone().stream().map(z -> {
            boolean masquee = masquerPetitesZones && z.validees() < props.seuilAnonymat();
            return masquee
                    ? new ZoneActe(z.zone(), true, null, null, null)
                    : new ZoneActe(z.zone(), false, z.validees(), z.retires(), taux(z.retires(), z.validees()));
        }).toList();
        return new Actes(validees, prets, retires, validees - retires, taux(retires, validees), zones,
                masquerPetitesZones ? List.of() : lignes);
    }

    private String textePret(ContexteActe c) {
        return "Fil d'Or : l'acte de naissance de l'enfant " + c.codeEnfant()
                + " est prêt. Retirez-le à la mairie avec ce numéro de reçu : " + c.numeroRecu() + ".";
    }

    public String actePret(AppUser u, long id) {
        if (!parcours.marquerPret(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Déclaration introuvable, non validée, ou acte déjà prêt");
        }
        acces.tracer(u, "ACTE_PRET", String.valueOf(id));
        ContexteActe c = parcours.contexte(id).orElse(null);
        if (c == null || !c.consentement() || !c.aTelephone()) {
            return "Acte marqué prêt. Pas de téléphone : l'agent de santé préviendra la famille.";
        }
        messages.ajouterPourFamille(c.familleId(), "NAISSANCE", textePret(c));
        return "Acte marqué prêt. Un SMS part vers la famille pour lui dire de le retirer.";
    }

    public String acteRetire(AppUser u, long id) {
        if (!parcours.marquerRetire(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Déclaration introuvable, non validée, ou acte déjà retiré");
        }
        acces.tracer(u, "ACTE_RETIRE", String.valueOf(id));
        return "Acte retiré par la famille. Le parcours de l'état civil est terminé pour cet enfant.";
    }

    public InfoNaissance poidsNaissance(AppUser u, String codeEnfant, int grammes) {
        if (grammes < 500 || grammes > 6500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Poids invalide : entre 500 et 6 500 g");
        }
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        if (!"ENFANT".equals(e.statut()) || e.dateNaissance() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cet enfant n'est pas encore né");
        }
        parcours.fixerPoidsNaissance(e.id(), grammes);
        acces.tracer(u, "POIDS_NAISSANCE", codeEnfant);
        return construire(e, grammes);
    }

    public InfoNaissance infoNaissance(AppUser u, String codeEnfant) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        acces.tracer(u, "CONSULTER_NAISSANCE", codeEnfant);
        return construire(e, parcours.poidsNaissance(e.id()).orElse(null));
    }

    private InfoNaissance construire(EnfantRef e, Integer grammes) {
        boolean petit = grammes != null && grammes < SEUIL_PETIT_POIDS_G;
        boolean tresPetit = grammes != null && grammes < SEUIL_TRES_PETIT_POIDS_G;
        List<LocalDate> visites = petit && e.dateNaissance() != null
                ? List.of(e.dateNaissance().plusDays(1), e.dateNaissance().plusDays(3), e.dateNaissance().plusDays(7))
                : List.of();
        String conseil = grammes == null
                ? "Poids de naissance non noté."
                : tresPetit
                        ? "Très petit poids : orienter vers le centre de santé sans attendre et visiter à J1, J3 et J7."
                        : petit
                                ? "Petit poids : visiter à J1, J3 et J7, garder l'enfant au chaud contre sa mère, allaitement fréquent."
                                : "Poids normal : suivi habituel.";
        return new InfoNaissance(grammes, petit, tresPetit, visites, conseil);
    }
}
