package tg.fildor.service;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.SuiviRepository;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * Reçoit ce que l'agent a saisi hors ligne. Chaque élément porte un identifiant créé sur le téléphone :
 * si la synchronisation est rejouée (réseau coupé en plein envoi), rien n'est enregistré deux fois.
 * Un élément refusé n'empêche pas les autres d'être enregistrés.
 */
@Service
public class SyncService {

    public record SyncVisite(
            @NotNull UUID clientUuid,
            @NotBlank String codeEnfant,
            @NotNull LocalDate dateVisite,
            @Min(60) @Max(250) Integer muacMm,
            @Min(500) @Max(30000) Integer poidsG,
            boolean signesDanger,
            List<Long> rendezVousRealises) {
    }

    public record SyncDeclaration(
            @NotBlank String codeEnfant,
            @NotBlank @Pattern(regexp = "CENTRE_SANTE|DOMICILE") String lieuNaissance,
            boolean certificatAccouchement) {
    }

    public record SyncAccouchement(@NotBlank String codeEnfant, @NotNull LocalDate dateNaissance,
                                   List<Integer> etapesFaites) {
    }

    public record SyncRequest(@Valid List<SyncVisite> visites, @Valid List<SyncDeclaration> declarations,
                              @Valid List<InscriptionService.InscriptionRequest> inscriptions,
                              @Valid List<SyncAccouchement> accouchements) {
    }

    /** Les codes famille et enfant attribués aux inscriptions faites hors ligne sont dans « inscriptions ». */
    public record SyncResultat(int visitesCreees, int visitesDejaConnues, int declarationsCreees,
                               int declarationsDejaConnues, int inscriptionsCreees, int inscriptionsDejaConnues,
                               List<InscriptionService.InscriptionResultat> inscriptions, int accouchementsCrees,
                               int accouchementsDejaConnus, List<String> erreurs) {
    }

    private final SuiviRepository suivi;
    private final SuiviService suiviService;
    private final NaissanceService naissances;
    private final AccesService acces;
    private final InscriptionService inscriptions;

    public SyncService(SuiviRepository suivi, SuiviService suiviService, NaissanceService naissances,
                       AccesService acces, InscriptionService inscriptions) {
        this.suivi = suivi;
        this.suiviService = suiviService;
        this.naissances = naissances;
        this.acces = acces;
        this.inscriptions = inscriptions;
    }

    @Transactional
    public SyncResultat synchroniser(AppUser u, SyncRequest req, LocalDate aujourdhui) {
        int vCrees = 0;
        int vConnues = 0;
        int dCrees = 0;
        int dConnues = 0;
        int iCrees = 0;
        int iConnues = 0;
        int aCrees = 0;
        int aConnus = 0;
        List<InscriptionService.InscriptionResultat> codes = new ArrayList<>();
        List<String> erreurs = new ArrayList<>();

        // Les inscriptions d'abord : elles créent les enfants que la suite peut concerner.
        for (InscriptionService.InscriptionRequest i : req.inscriptions() == null
                ? List.<InscriptionService.InscriptionRequest>of() : req.inscriptions()) {
            try {
                var r = inscriptions.inscrire(u, i, aujourdhui);
                codes.add(r);
                if (r.creee()) {
                    iCrees++;
                } else {
                    iConnues++;
                }
            } catch (ResponseStatusException | IllegalArgumentException ex) {
                erreurs.add("Inscription " + i.clientUuid() + " : " + messageDe(ex));
            }
        }

        for (SyncAccouchement a : req.accouchements() == null ? List.<SyncAccouchement>of() : req.accouchements()) {
            try {
                if (inscriptions.accoucher(u, a.codeEnfant(),
                        new InscriptionService.AccouchementRequest(a.dateNaissance(), a.etapesFaites()), aujourdhui)) {
                    aCrees++;
                } else {
                    aConnus++;
                }
            } catch (ResponseStatusException | IllegalArgumentException ex) {
                erreurs.add("Naissance " + a.codeEnfant() + " : " + messageDe(ex));
            }
        }

        for (SyncVisite v : req.visites() == null ? List.<SyncVisite>of() : req.visites()) {
            try {
                if (v.dateVisite().isAfter(aujourdhui)) {
                    throw new IllegalArgumentException("date de visite dans le futur");
                }
                EnfantRef e = suiviService.enfantAutorise(u, v.codeEnfant());
                boolean cree = suivi.insererVisite(v.clientUuid(), e.id(), u.id(), v.dateVisite(), v.muacMm(),
                        v.poidsG(), v.signesDanger());
                if (cree) {
                    vCrees++;
                    suivi.marquerRealises(e.id(), v.rendezVousRealises(), v.dateVisite());
                } else {
                    vConnues++;
                }
            } catch (ResponseStatusException | IllegalArgumentException ex) {
                erreurs.add("Visite " + v.codeEnfant() + " : " + messageDe(ex));
            }
        }

        for (SyncDeclaration d : req.declarations() == null ? List.<SyncDeclaration>of() : req.declarations()) {
            try {
                boolean cree = naissances.declarer(u, d.codeEnfant(), d.lieuNaissance(), d.certificatAccouchement(),
                        aujourdhui).creee();
                if (cree) {
                    dCrees++;
                } else {
                    dConnues++;
                }
            } catch (ResponseStatusException | IllegalArgumentException ex) {
                erreurs.add("Déclaration " + d.codeEnfant() + " : " + messageDe(ex));
            }
        }

        acces.tracer(u, "SYNCHRONISER", vCrees + " visite(s), " + dCrees + " déclaration(s), " + iCrees + " inscription(s)");
        return new SyncResultat(vCrees, vConnues, dCrees, dConnues, iCrees, iConnues, List.copyOf(codes), aCrees,
                aConnus, List.copyOf(erreurs));
    }

    private static String messageDe(RuntimeException ex) {
        return ex instanceof ResponseStatusException r && r.getReason() != null ? r.getReason() : ex.getMessage();
    }
}
