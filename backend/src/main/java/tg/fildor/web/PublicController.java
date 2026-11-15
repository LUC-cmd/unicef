package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.domain.Dtos.MessageContenu;
import tg.fildor.domain.Dtos.EveilEnfant;
import tg.fildor.domain.Dtos.MessagesRecus;
import tg.fildor.domain.Dtos.Profil;
import tg.fildor.domain.Dtos.StructureDto;
import tg.fildor.service.AnnuaireService;
import tg.fildor.service.EcouteService;
import tg.fildor.service.NaissanceService;
import tg.fildor.service.VoixService;

/**
 * Simulateur de téléphone (porte « voix et SMS »). Ouvert sans connexion : la famille s'identifie par son numéro.
 * Les numéros circulent dans le corps des requêtes (jamais dans l'adresse, donc jamais dans les journaux).
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    public record Appel(@NotBlank String telephone) {
    }

    public record DemandePreuve(@NotBlank String numero, String code) {
    }

    public record DemandeVoix(@NotBlank String telephone, @NotBlank String sujet, String langue) {
    }

    public record JeuFait(@NotBlank String telephone, @NotBlank String codeEnfant) {
    }

    public record Proches(@NotBlank String telephone, String type) {
    }

    public record DemandeStructure(@NotBlank String telephone, @NotBlank String codeStructure,
                                   @NotBlank String motif) {
    }

    private final VoixService voix;
    private final AnnuaireService annuaire;
    private final EcouteService ecoute;
    private final NaissanceService naissances;

    public PublicController(VoixService voix, AnnuaireService annuaire, EcouteService ecoute,
                            NaissanceService naissances) {
        this.voix = voix;
        this.annuaire = annuaire;
        this.ecoute = ecoute;
        this.naissances = naissances;
    }

    /** Vérification d'un reçu de naissance. Le numéro et le code circulent dans le corps, jamais dans l'adresse. */
    @PostMapping("/preuve")
    NaissanceService.Preuve preuve(@Valid @RequestBody DemandePreuve d) {
        return naissances.verifier(d.numero(), d.code());
    }

    @GetMapping("/sujets")
    List<String> sujets() {
        return List.of("GROSSESSE", "NOUVEAU_NE", "ALLAITEMENT", "VACCINS", "NUTRITION", "HYGIENE", "NAISSANCE",
                "EVEIL", "DANGER");
    }

    @PostMapping("/voix")
    MessageContenu ecouter(@Valid @RequestBody DemandeVoix d) {
        return voix.ecouter(d.telephone(), d.sujet(), d.langue());
    }

    /** Famille ou proche ? Permet au simulateur d'adapter ce qu'il propose. */
    @PostMapping("/profil")
    Profil profil(@Valid @RequestBody Appel a) {
        return voix.profil(a.telephone());
    }

    @PostMapping("/sms")
    MessagesRecus sms(@Valid @RequestBody Appel a) {
        return voix.messages(a.telephone());
    }

    // ------------------------------------------------------------------ éveil

    @PostMapping("/jeu")
    List<EveilEnfant> jeu(@Valid @RequestBody Appel a) {
        return voix.jeuDuJour(a.telephone());
    }

    @PostMapping("/jeu/fait")
    Map<String, String> jeuFait(@Valid @RequestBody JeuFait j) {
        voix.jeuFait(j.telephone(), j.codeEnfant());
        return Map.of("message", "Bravo ! Jeu noté pour aujourd'hui.");
    }

    // ------------------------------------------------------------------ annuaire

    /** Annuaire public : informations sur les structures, pas sur les familles. */
    @GetMapping("/structures")
    List<StructureDto> structures(@RequestParam(required = false) String zone,
                                  @RequestParam(required = false) String type,
                                  @RequestParam(defaultValue = "false") boolean besoinsSpecifiques) {
        return annuaire.lister(zone, type, besoinsSpecifiques);
    }

    @PostMapping("/structures/proches")
    List<StructureDto> structuresProches(@Valid @RequestBody Proches p) {
        return voix.structuresProches(p.telephone(), p.type());
    }

    @PostMapping("/demandes")
    Map<String, String> demande(@Valid @RequestBody DemandeStructure d) {
        voix.demanderStructure(d.telephone(), d.codeStructure(), d.motif());
        return Map.of("message", "Demande envoyée. La structure vous répondra par SMS.");
    }

    @PostMapping("/sms/{id}/ok")
    Map<String, String> repondreOk(@PathVariable long id, @Valid @RequestBody Appel a) {
        voix.repondreOk(a.telephone(), id);
        return Map.of("message", "Merci, rendez-vous confirmé.");
    }

    /** Point d'écoute : séance collective, sans donnée de famille. */
    @GetMapping("/ecoute/zones")
    List<tg.fildor.repo.ZoneRepository.ZonePublique> zonesEcoute() {
        return ecoute.zones();
    }

    @GetMapping("/ecoute")
    EcouteService.Seance ecoute(@RequestParam String zone) {
        return ecoute.seance(zone);
    }

    @PostMapping("/appel-manque")
    Map<String, String> appelManque(@Valid @RequestBody Appel a) {
        voix.appelManque(a.telephone());
        return Map.of("message", "Nous vous rappelons. Cet appel ne vous coûte rien.");
    }
}
