package tg.fildor.web;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.service.FamilleCompteService;
import tg.fildor.service.FamilleCompteService.CrecheProche;
import tg.fildor.service.FamilleCompteService.FamilleProfil;

/** Compte famille (ouvert sans connexion HTTP : la famille s'identifie par son numéro et son code famille). */
@RestController
public class FamilleController {

    public record Acces(@NotBlank String telephone, @NotBlank String codeFamille) {
    }

    public record Nombre(@NotBlank String telephone, @NotBlank String codeFamille, int nombre) {
    }

    public record Demenagement(@NotBlank String telephone, @NotBlank String codeFamille, @NotBlank String codeZone) {
    }

    private final FamilleCompteService service;

    public FamilleController(FamilleCompteService service) {
        this.service = service;
    }

    @PostMapping("/api/public/famille/connexion")
    FamilleProfil connexion(@RequestBody Acces a) {
        return service.profil(a.telephone(), a.codeFamille());
    }

    @PostMapping("/api/public/famille/enfants-declares")
    FamilleProfil enfantsDeclares(@RequestBody Nombre n) {
        return service.declarerEnfants(n.telephone(), n.codeFamille(), n.nombre());
    }

    @PostMapping("/api/public/famille/demenagement")
    FamilleProfil demenagement(@RequestBody Demenagement d) {
        return service.demenager(d.telephone(), d.codeFamille(), d.codeZone());
    }

    @PostMapping("/api/public/famille/creches/proches")
    List<CrecheProche> proches(@RequestBody Acces a) {
        return service.crechesProches(a.telephone(), a.codeFamille());
    }
}
