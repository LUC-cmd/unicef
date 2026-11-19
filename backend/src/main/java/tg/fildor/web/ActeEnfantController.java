package tg.fildor.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.service.AccesService;
import tg.fildor.service.SuiviService;

/** Acte de naissance déjà existant pour un enfant déjà né : l'agent le note, Fil d'Or n'a plus à le « déclarer ». */
@RestController
public class ActeEnfantController {

    public record Etat(@NotBlank @Pattern(regexp = "AUCUN|ETABLI|RETIRE") String etat) {
    }

    private final JdbcClient jdbc;
    private final SuiviService suivi;
    private final AccesService acces;

    public ActeEnfantController(JdbcClient jdbc, SuiviService suivi, AccesService acces) {
        this.jdbc = jdbc;
        this.suivi = suivi;
        this.acces = acces;
    }

    @GetMapping("/api/agent/enfants/{code}/acte")
    Map<String, String> lire(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        long id = suivi.enfantAutorise(u, code).id();
        String v = jdbc.sql("SELECT acte_externe FROM enfant WHERE id = :id").param("id", id)
                .query(String.class).optional().orElse(null);
        return Map.of("etat", v == null ? "AUCUN" : v);
    }

    @PostMapping("/api/agent/enfants/{code}/acte")
    Map<String, String> noter(@AuthenticationPrincipal AppUser u, @PathVariable String code,
                              @RequestBody @jakarta.validation.Valid Etat e) {
        long id = suivi.enfantAutorise(u, code).id();
        jdbc.sql("UPDATE enfant SET acte_externe = :v WHERE id = :id AND statut = 'ENFANT'")
                .param("v", "AUCUN".equals(e.etat()) ? null : e.etat()).param("id", id).update();
        acces.tracer(u, "ACTE_EXISTANT_" + e.etat(), code);
        return Map.of("etat", e.etat());
    }
}
