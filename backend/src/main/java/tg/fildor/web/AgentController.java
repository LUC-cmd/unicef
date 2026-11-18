package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.Carnet;
import tg.fildor.domain.Dtos.EnfantFiche;
import tg.fildor.domain.Dtos.LigneVisite;
import tg.fildor.domain.Dtos.StructureDto;
import tg.fildor.repo.ProchesRepository.Proche;
import tg.fildor.service.AnnuaireService;
import tg.fildor.service.InscriptionService;
import tg.fildor.service.InscriptionService.AccouchementRequest;
import tg.fildor.service.InscriptionService.EnfantInscrit;
import tg.fildor.service.InscriptionService.InscriptionRequest;
import tg.fildor.service.InscriptionService.InscriptionResultat;
import tg.fildor.service.NaissanceService;
import tg.fildor.service.ProchesService;
import tg.fildor.service.SuiviService;
import tg.fildor.service.SyncService;
import tg.fildor.service.SyncService.SyncRequest;
import tg.fildor.service.SyncService.SyncResultat;

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    public record NaissanceRequest(@NotBlank String codeEnfant,
                                   @NotBlank @Pattern(regexp = "CENTRE_SANTE|DOMICILE") String lieuNaissance,
                                   boolean certificatAccouchement,
                                   @Pattern(regexp = "AGENT|CENTRE_SANTE|HOPITAL") String source,
                                   String mereNom, String pereNom, String enfantPrenom,
                                   boolean accordMere, boolean accordPere) {
    }

    public record ProcheRequest(@NotBlank @Pattern(regexp = "RELAIS|PERE|GRAND_PARENT|AUTRE_PROCHE") String role,
                                @NotBlank String telephone, boolean accordProche) {
    }

    public record DemandeRequest(@NotBlank String codeFamille, @NotBlank String codeStructure,
                                 @NotBlank @Pattern(regexp = "RAPPEL|ORIENTATION") String motif) {
    }

    private final SuiviService suivi;
    private final SyncService sync;
    private final NaissanceService naissances;
    private final InscriptionService inscriptions;
    private final ProchesService proches;
    private final AnnuaireService annuaire;
    private final tg.fildor.service.CarteService cartes;
    private final tg.fildor.service.CarnetQrService carnetQr;
    private final tg.fildor.repo.AlerteRepository alertes;
    private final Clock clock;

    public AgentController(SuiviService suivi, SyncService sync, NaissanceService naissances,
                           InscriptionService inscriptions, ProchesService proches, AnnuaireService annuaire,
                           tg.fildor.service.CarteService cartes, tg.fildor.service.CarnetQrService carnetQr,
                           tg.fildor.repo.AlerteRepository alertes, Clock clock) {
        this.cartes = cartes;
        this.suivi = suivi;
        this.sync = sync;
        this.naissances = naissances;
        this.inscriptions = inscriptions;
        this.proches = proches;
        this.annuaire = annuaire;
        this.carnetQr = carnetQr;
        this.alertes = alertes;
        this.clock = clock;
    }

    /** Liste de visites priorisée : les familles les plus à risque en premier. */
    @GetMapping("/visites")
    List<LigneVisite> visites(@AuthenticationPrincipal AppUser u) {
        return suivi.listeDeVisites(u, LocalDate.now(clock));
    }

    @GetMapping("/enfants/{code}")
    EnfantFiche enfant(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return suivi.fiche(u, code, LocalDate.now(clock));
    }

    public record CarteRequest(@jakarta.validation.constraints.NotBlank String codeFamille,
                               @jakarta.validation.constraints.NotBlank String codeCarte, String codeZone) {
    }

    @PostMapping("/carte/ouvrir")
    tg.fildor.service.CarteService.DossierSante ouvrirCarte(@AuthenticationPrincipal AppUser u,
                                                           @jakarta.validation.Valid @RequestBody CarteRequest r) {
        return cartes.ouvrir(u, r.codeFamille(), r.codeCarte(), LocalDate.now(clock));
    }

    @PostMapping("/carte/transferer")
    Map<String, String> transfererCarte(@AuthenticationPrincipal AppUser u,
                                        @jakarta.validation.Valid @RequestBody CarteRequest r) {
        return Map.of("message", cartes.transferer(u, r.codeFamille(), r.codeCarte(), r.codeZone()));
    }

    @GetMapping("/familles/{code}/carnet")
    Carnet carnet(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return suivi.carnet(u, code, LocalDate.now(clock));
    }

    /** Le jeton signé imprimé dans le carnet : toute structure pourra le relire sans contacter notre base. */
    @GetMapping("/familles/{code}/carnet/qr")
    java.util.Map<String, String> carnetQr(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        Carnet carnet = suivi.carnet(u, code, LocalDate.now(clock));
        return java.util.Map.of("jeton", carnetQr.jeton(carnet, LocalDate.now(clock)), "codeFamille", carnet.codeFamille());
    }

    /** Identité prise à la CPN, pour pré-remplir la déclaration de naissance : la famille ne raconte pas deux fois. */
    @GetMapping("/enfants/{code}/identite-prenatale")
    java.util.Map<String, Object> identitePrenatale(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return naissances.identitePrenatale(u, code)
                .<java.util.Map<String, Object>>map(i -> java.util.Map.of(
                        "prisEnGrossesse", true,
                        "mereNom", i.mereNom() == null ? "" : i.mereNom(),
                        "pereNom", i.conjointNom() == null ? "" : i.conjointNom(),
                        "accordMere", i.accordMere(),
                        "accordPere", i.accordConjoint(),
                        "pieceType", i.pieceType() == null ? "" : i.pieceType(),
                        "pieceNumero", i.pieceNumero() == null ? "" : i.pieceNumero(),
                        "nationaliteMere", i.nationaliteMere() == null ? "" : i.nationaliteMere(),
                        "nationaliteConjoint", i.nationaliteConjoint() == null ? "" : i.nationaliteConjoint(),
                        "pieceDisponible", i.pieceDisponible()))
                .orElse(java.util.Map.of("prisEnGrossesse", false));
    }

    /** Synchronisation de ce qui a été saisi hors ligne (idempotente). */
    @PostMapping("/sync")
    SyncResultat synchroniser(@AuthenticationPrincipal AppUser u, @Valid @RequestBody SyncRequest req) {
        return sync.synchroniser(u, req, LocalDate.now(clock));
    }

    public record PrenomRequest(@NotBlank @Size(min = 2, max = 60) String prenom) {
    }

    /** Le nom de l'enfant, donné à partir du 8e jour : il rejoint le dossier déjà envoyé à l'état civil. */
    @PostMapping("/naissances/{codeEnfant}/prenom")
    java.util.Map<String, Object> prenom(@AuthenticationPrincipal AppUser u, @PathVariable String codeEnfant,
                                         @Valid @RequestBody PrenomRequest r) {
        return naissances.donnerPrenom(u, codeEnfant, r.prenom(), LocalDate.now(clock));
    }

    @PostMapping("/naissances")
    NaissanceService.Resultat declarer(@AuthenticationPrincipal AppUser u, @Valid @RequestBody NaissanceRequest r) {
        return naissances.declarer(u, r.codeEnfant(), r.lieuNaissance(), r.certificatAccouchement(),
                new NaissanceService.Identite(r.mereNom(), r.pereNom(), r.enfantPrenom(), r.accordMere(), r.accordPere()),
                r.source(), LocalDate.now(clock));
    }

    // ------------------------------------------------------------------ inscription

    /** Inscrit une famille (avec son accord) et ses enfants ; idempotent grâce à l'identifiant client. */
    @PostMapping("/familles")
    InscriptionResultat inscrire(@AuthenticationPrincipal AppUser u, @Valid @RequestBody InscriptionRequest r) {
        return inscriptions.inscrire(u, r, LocalDate.now(clock));
    }

    @PostMapping("/familles/{code}/enfants")
    Map<String, List<String>> ajouterEnfant(@AuthenticationPrincipal AppUser u, @PathVariable String code,
                                            @Valid @RequestBody EnfantInscrit e) {
        return Map.of("codesEnfants", inscriptions.ajouterEnfant(u, code, e, LocalDate.now(clock)));
    }

    /** Une grossesse suivie devient un enfant né : le plan de vaccination se crée. */
    @PostMapping("/enfants/{code}/accouchement")
    Map<String, Boolean> accouchement(@AuthenticationPrincipal AppUser u, @PathVariable String code,
                                      @Valid @RequestBody AccouchementRequest r) {
        return Map.of("creee", inscriptions.accoucher(u, code, r, LocalDate.now(clock)));
    }

    @PostMapping("/familles/{code}/retrait-consentement")
    Map<String, String> retraitConsentement(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        inscriptions.retirerConsentement(u, code);
        return Map.of("message", "Consentement retiré : la famille n'est plus suivie ni contactée.");
    }

    // ------------------------------------------------------------------ proches informés

    @GetMapping("/familles/{code}/proches")
    List<Proche> proches(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return proches.lister(u, code);
    }

    @PostMapping("/familles/{code}/proches")
    Map<String, String> ajouterProche(@AuthenticationPrincipal AppUser u, @PathVariable String code,
                                      @Valid @RequestBody ProcheRequest r) {
        proches.ajouter(u, code, r.role(), r.telephone(), r.accordProche());
        return Map.of("message", "Proche enregistré. Il recevra des rappels généraux, sans détail.");
    }

    @DeleteMapping("/familles/{code}/proches/{id}")
    Map<String, String> supprimerProche(@AuthenticationPrincipal AppUser u, @PathVariable String code,
                                        @PathVariable long id) {
        proches.supprimer(u, code, id);
        return Map.of("message", "Proche supprimé.");
    }

    // ------------------------------------------------------------------ alertes urgence

    /** Alertes « mode urgence » de la zone de l'agent (toutes pour l'administrateur). */
    @GetMapping("/alertes")
    List<tg.fildor.repo.AlerteRepository.Alerte> alertes(@AuthenticationPrincipal AppUser u) {
        return alertes.lister(u.zoneId(), 50);
    }

    public record StatutAlerte(@NotBlank @Pattern(regexp = "NOUVELLE|EN_COURS|CLOTUREE") String statut) {
    }

    @PostMapping("/alertes/{id}/statut")
    Map<String, String> statutAlerte(@AuthenticationPrincipal AppUser u, @PathVariable long id,
                                    @Valid @RequestBody StatutAlerte r) {
        if (!alertes.changerStatut(id, r.statut(), u.zoneId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Alerte introuvable ou déjà clôturée");
        }
        return Map.of("message", "Alerte mise à jour.");
    }

    // ------------------------------------------------------------------ annuaire

    @GetMapping("/structures")
    List<StructureDto> structures(@AuthenticationPrincipal AppUser u,
                                  @org.springframework.web.bind.annotation.RequestParam(required = false) String type) {
        return annuaire.pourAgent(u, type);
    }

    /** L'agent oriente une famille de sa zone vers une structure (ou demande qu'elle soit rappelée). */
    @PostMapping("/demandes")
    Map<String, String> demande(@AuthenticationPrincipal AppUser u, @Valid @RequestBody DemandeRequest r) {
        annuaire.demanderParAgent(u, r.codeFamille(), r.codeStructure(), r.motif());
        return Map.of("message", "Demande envoyée à la structure.");
    }
}
