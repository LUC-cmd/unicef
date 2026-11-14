package tg.fildor.web;

import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** Le front appelle cette route avec les identifiants saisis : 200 = connecté, 401 = refusé. */
    @GetMapping("/me")
    Map<String, Object> moi(@AuthenticationPrincipal AppUser u) {
        return Map.of("username", u.getUsername(), "nomComplet", u.nomComplet(), "role", u.role());
    }
}
