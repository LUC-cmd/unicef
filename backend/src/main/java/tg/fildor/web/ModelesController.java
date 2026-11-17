package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ModeleRepository;
import tg.fildor.repo.ModeleRepository.Modele;

/**
 * Messages envoyés aux familles, dans la langue de la famille (français, éwé, kabyè, tem).
 * Les traductions sont écrites par des locuteurs, puis validées : sans traduction validée, le message part en français.
 */
@RestController
@RequestMapping("/api")
public class ModelesController {

    private static final List<String> LANGUES = List.of("fr", "ewe", "kabye", "tem");

    public record Enregistrement(@NotBlank @Size(max = 400) String texte, boolean valide) {
    }

    private final ModeleRepository modeles;

    public ModelesController(ModeleRepository modeles) {
        this.modeles = modeles;
    }

    /** Aperçu d'un message dans la langue choisie, avec la langue réellement utilisée. */
    @GetMapping("/public/modele")
    Map<String, Object> apercu(@RequestParam String code, @RequestParam String langue) {
        Modele fr = modeles.trouver(code, "fr").orElse(null);
        Modele choisi = "fr".equals(langue) ? fr : modeles.trouver(code, langue).filter(m -> !m.aValider()).orElse(null);
        Modele utilise = choisi != null ? choisi : fr;
        return Map.of("code", code, "langueDemandee", langue,
                "langueEffective", utilise == null ? "fr" : utilise.langue(),
                "texte", utilise == null ? "" : utilise.texte(),
                "traduit", choisi != null);
    }

    @GetMapping("/admin/modeles")
    List<Modele> lister() {
        return modeles.tous();
    }

    @PutMapping("/admin/modeles/{code}/{langue}")
    ResponseEntity<Map<String, Object>> enregistrer(@PathVariable String code, @PathVariable String langue,
                                                    @Valid @RequestBody Enregistrement e,
                                                    @AuthenticationPrincipal AppUser u) {
        if (!LANGUES.contains(langue) || !modeles.codeExiste(code)) {
            return ResponseEntity.badRequest().body(Map.of("erreur", "Message ou langue inconnus."));
        }
        modeles.enregistrer(code, langue, e.texte().strip(), !e.valide(), u.id());
        return ResponseEntity.ok(Map.of("message", e.valide() ? "Traduction validée : elle part chez les familles" : "Traduction enregistrée, à valider"));
    }
}
