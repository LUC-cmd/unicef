package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.service.ParcoursService;

/** Les passages d'un service à l'autre : état civil (actes) et suivi du nouveau-né. */
@RestController
@RequestMapping("/api")
public class ParcoursController {

    public record PoidsNaissance(@NotNull Integer grammes) {
    }

    private final ParcoursService parcours;

    public ParcoursController(ParcoursService parcours) {
        this.parcours = parcours;
    }

    @GetMapping("/mairie/actes")
    ParcoursService.Actes actesMairie(@AuthenticationPrincipal AppUser u) {
        return parcours.actes(u, false);
    }

    @PostMapping("/mairie/declarations/{id}/acte-pret")
    Map<String, String> actePret(@AuthenticationPrincipal AppUser u, @PathVariable long id) {
        return Map.of("message", parcours.actePret(u, id));
    }

    @PostMapping("/mairie/declarations/{id}/acte-retire")
    Map<String, String> acteRetire(@AuthenticationPrincipal AppUser u, @PathVariable long id) {
        return Map.of("message", parcours.acteRetire(u, id));
    }

    @GetMapping("/decideur/actes")
    ParcoursService.Actes actesDecideur(@AuthenticationPrincipal AppUser u) {
        return parcours.actes(u, true);
    }

    @GetMapping("/agent/enfants/{code}/naissance")
    ParcoursService.InfoNaissance infoNaissance(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return parcours.infoNaissance(u, code);
    }

    @PostMapping("/agent/enfants/{code}/poids-naissance")
    ParcoursService.InfoNaissance poidsNaissance(@AuthenticationPrincipal AppUser u, @PathVariable String code,
                                                 @Valid @RequestBody PoidsNaissance p) {
        return parcours.poidsNaissance(u, code, p.grammes());
    }
}
