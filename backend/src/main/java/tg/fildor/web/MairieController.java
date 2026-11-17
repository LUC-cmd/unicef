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

    public record AvanceeNationalite(int etape, String piecesOk, String voie, String note) {
    }

    private final NaissanceService naissances;

    public MairieController(NaissanceService naissances) {
        this.naissances = naissances;
    }

    @GetMapping("/declarations")
    List<tg.fildor.repo.DeclarationRepository.DossierMairie> lister(@AuthenticationPrincipal AppUser u,
                                                                  @RequestParam(required = false) String statut) {
        return naissances.dossiers(u, statut);
    }

    @GetMapping("/declarations/{id}/preuve")
    Map<String, String> preuve(@AuthenticationPrincipal AppUser u, @PathVariable long id) {
        return naissances.preuveMairie(u, id);
    }

    @PostMapping("/declarations/{id}/valider")
    Map<String, String> valider(@AuthenticationPrincipal AppUser u, @PathVariable long id) {
        return Map.of("message", naissances.valider(u, id));
    }

    @PostMapping("/declarations/{id}/rejeter")
    Map<String, String> rejeter(@AuthenticationPrincipal AppUser u, @PathVariable long id, @RequestBody Rejet r) {
        return Map.of("message", naissances.rejeter(u, id, r.motif()));
    }

    @GetMapping("/nationalite")
    List<tg.fildor.repo.NationaliteRepository.Dossier> nationalite(@AuthenticationPrincipal AppUser u) {
        return naissances.dossiersNationalite(u);
    }

    @PostMapping("/nationalite/{declarationId}")
    Map<String, String> avancer(@AuthenticationPrincipal AppUser u, @PathVariable long declarationId,
                                @RequestBody AvanceeNationalite a) {
        naissances.avancerNationalite(u, declarationId, a.etape(), a.piecesOk(), a.voie(), a.note());
        return Map.of("message", "Dossier mis à jour");
    }
}
