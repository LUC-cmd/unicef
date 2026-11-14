package tg.fildor.web;

import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.DeclarationDto;
import tg.fildor.service.NaissanceService;

@RestController
@RequestMapping("/api/mairie")
public class MairieController {

    public record Rejet(String motif) {
    }

    private final NaissanceService naissances;

    public MairieController(NaissanceService naissances) {
        this.naissances = naissances;
    }

    @GetMapping("/declarations")
    List<DeclarationDto> lister(@AuthenticationPrincipal AppUser u, @RequestParam(required = false) String statut) {
        return naissances.lister(u, statut);
    }

    @PostMapping("/declarations/{id}/valider")
    Map<String, String> valider(@AuthenticationPrincipal AppUser u, @PathVariable long id) {
        return Map.of("message", naissances.valider(u, id));
    }

    @PostMapping("/declarations/{id}/rejeter")
    Map<String, String> rejeter(@AuthenticationPrincipal AppUser u, @PathVariable long id, @RequestBody Rejet r) {
        return Map.of("message", naissances.rejeter(u, id, r.motif()));
    }
}
