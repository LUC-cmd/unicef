package tg.fildor.web;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.DemandeDto;
import tg.fildor.domain.Dtos.StructureDto;
import tg.fildor.service.AnnuaireService;
import tg.fildor.service.AnnuaireService.MiseAJour;
import tg.fildor.service.AnnuaireService.Reponse;

/** Console d'une structure (centre de santé, crèche, centre social, état civil) : ses informations et ses demandes. */
@RestController
@RequestMapping("/api/structure")
public class StructureController {

    private final AnnuaireService annuaire;

    public StructureController(AnnuaireService annuaire) {
        this.annuaire = annuaire;
    }

    @GetMapping("/moi")
    StructureDto moi(@AuthenticationPrincipal AppUser u) {
        return annuaire.maStructure(u);
    }

    @PutMapping("/moi")
    StructureDto mettreAJour(@AuthenticationPrincipal AppUser u, @Valid @RequestBody MiseAJour m) {
        return annuaire.mettreAJour(u, m);
    }

    @GetMapping("/demandes")
    List<DemandeDto> demandes(@AuthenticationPrincipal AppUser u, @RequestParam(required = false) String statut) {
        return annuaire.demandes(u, statut);
    }

    @PostMapping("/demandes/{id}/repondre")
    Map<String, String> repondre(@AuthenticationPrincipal AppUser u, @PathVariable long id,
                                 @Valid @RequestBody Reponse r) {
        annuaire.repondre(u, id, r.reponse());
        return Map.of("message", "Réponse enregistrée. La famille est prévenue par SMS si elle a un téléphone.");
    }
}
