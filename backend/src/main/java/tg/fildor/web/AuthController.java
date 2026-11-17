package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ComptesRepository;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record ChangementMotDePasse(@NotBlank String ancien, @NotBlank @Size(min = 8, max = 72) String nouveau) {
    }

    private final ComptesRepository comptes;
    private final PasswordEncoder encoder;

    public AuthController(ComptesRepository comptes, PasswordEncoder encoder) {
        this.comptes = comptes;
        this.encoder = encoder;
    }

    /** Le front appelle cette route avec les identifiants saisis : 200 = connecté, 401 = refusé. */
    @GetMapping("/me")
    Map<String, Object> moi(@AuthenticationPrincipal AppUser u) {
        return Map.of("username", u.getUsername(), "nomComplet", u.nomComplet(), "role", u.role(),
                "region", u.region() == null ? "" : u.region());
    }

    /** Chacun change son propre mot de passe : le mot de passe provisoire donné par l'administrateur sert une fois. */
    @PostMapping("/mot-de-passe")
    ResponseEntity<Map<String, Object>> changer(@AuthenticationPrincipal AppUser u,
                                                @Valid @RequestBody ChangementMotDePasse c) {
        if (!encoder.matches(c.ancien(), u.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("erreur", "L'ancien mot de passe n'est pas le bon."));
        }
        comptes.changerMotDePasse(u.id(), encoder.encode(c.nouveau()), false);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
