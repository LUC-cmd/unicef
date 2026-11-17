package tg.fildor.web;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ParcoursConnecteRepository.Progres;
import tg.fildor.service.ParcoursConnecteService;
import tg.fildor.service.ParcoursConnecteService.LigneFragile;
import tg.fildor.service.ParcoursConnecteService.Parcours;
import tg.fildor.service.ParcoursConnecteService.Ruptures;

/** « Un enfant, un parcours » : le fil d'un enfant côté agent, les ruptures et les progrès côté responsable. */
@RestController
@RequestMapping("/api")
public class ParcoursConnecteController {

    public record Besoins(@NotNull List<String> types) {
    }

    private final ParcoursConnecteService service;

    public ParcoursConnecteController(ParcoursConnecteService service) {
        this.service = service;
    }

    @GetMapping("/agent/enfants/{code}/parcours")
    Parcours parcours(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return service.parcours(u, code);
    }

    @PostMapping("/agent/enfants/{code}/prescolaire")
    Parcours prescolaire(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return service.orienterPrescolaire(u, code);
    }

    @PostMapping("/agent/enfants/{code}/besoins-sociaux")
    Parcours besoins(@AuthenticationPrincipal AppUser u, @PathVariable String code, @RequestBody Besoins b) {
        return service.besoins(u, code, b.types());
    }

    @GetMapping("/agent/fragiles")
    List<LigneFragile> fragiles(@AuthenticationPrincipal AppUser u) {
        return service.fragiles(u);
    }

    @GetMapping("/decideur/ruptures")
    Ruptures ruptures(@AuthenticationPrincipal AppUser u) {
        return service.ruptures(u);
    }

    @GetMapping("/decideur/progres")
    List<Progres> progres(@AuthenticationPrincipal AppUser u) {
        return service.progres(u);
    }
}
