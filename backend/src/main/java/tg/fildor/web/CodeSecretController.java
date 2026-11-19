package tg.fildor.web;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.repo.RappelRepository.Identite;
import tg.fildor.service.AccesFamille;
import tg.fildor.service.AccesService;
import tg.fildor.service.CodeSecretFamille;
import tg.fildor.service.SuiviService;

/** Code secret de la famille : choix par la famille, réinitialisation par l'agent. */
@RestController
public class CodeSecretController {

    public record Choix(@NotBlank String telephone, @NotBlank String codeFamille, @NotBlank String nouveauCode) {
    }

    private final AccesFamille accesFamille;
    private final CodeSecretFamille secret;
    private final SuiviService suivi;
    private final AccesService acces;

    public CodeSecretController(AccesFamille accesFamille, CodeSecretFamille secret, SuiviService suivi,
                                AccesService acces) {
        this.accesFamille = accesFamille;
        this.secret = secret;
        this.suivi = suivi;
        this.acces = acces;
    }

    @PostMapping("/api/public/famille/code-secret")
    Map<String, String> choisir(@RequestBody Choix c) {
        Identite f = accesFamille.verifier(c.telephone(), c.codeFamille());
        secret.definir(f.familleId(), c.nouveauCode());
        return Map.of("message", "Code secret enregistré");
    }

    @PostMapping("/api/agent/familles/{code}/code-secret/reinitialiser")
    Map<String, String> reinitialiser(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        long familleId = suivi.familleAutorisee(u, code);
        secret.reinitialiser(familleId);
        acces.tracer(u, "REINITIALISER_CODE_SECRET", code);
        return Map.of("message", "Code secret effacé : la famille en choisira un nouveau à sa prochaine connexion.");
    }
}
