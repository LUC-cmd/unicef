package tg.fildor.web;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.service.SignalementNaissanceService;
import tg.fildor.service.SignalementNaissanceService.Saisie;
import tg.fildor.service.SignalementNaissanceService.VueAgent;
import tg.fildor.service.SignalementNaissanceService.VueFamille;

/** Naissances signalées par les familles : envoi par la famille, vérification par l'agent. */
@RestController
public class SignalementNaissanceController {

    public record Acces(@NotBlank String telephone, @NotBlank String codeFamille) {
    }

    public record Decision(boolean confirme, String motif) {
    }

    private final SignalementNaissanceService service;

    public SignalementNaissanceController(SignalementNaissanceService service) {
        this.service = service;
    }

    @PostMapping("/api/public/famille/naissance")
    VueFamille signaler(@RequestBody Saisie s) {
        return service.signaler(s);
    }

    @PostMapping("/api/public/famille/naissances")
    List<VueFamille> deLaFamille(@RequestBody Acces a) {
        return service.deLaFamille(a.telephone(), a.codeFamille());
    }

    @GetMapping("/api/agent/signalements")
    List<VueAgent> pourAgent(@AuthenticationPrincipal AppUser u) {
        return service.pourAgent(u);
    }

    @PostMapping("/api/agent/signalements/{id}/traiter")
    Map<String, String> traiter(@AuthenticationPrincipal AppUser u, @PathVariable long id, @RequestBody Decision d) {
        service.traiter(u, id, d.confirme(), d.motif());
        return Map.of("message", d.confirme() ? "Déclaration confirmée" : "Déclaration refusée : la famille verra le motif");
    }
}
