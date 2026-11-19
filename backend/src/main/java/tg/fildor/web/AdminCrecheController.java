package tg.fildor.web;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.service.AdminCrecheService;
import tg.fildor.service.AdminCrecheService.Ligne;
import tg.fildor.service.AdminCrecheService.Nouvelle;

/** Les crèches vues par l'administrateur : liste, création avec le compte du responsable, activation. */
@RestController
public class AdminCrecheController {

    public record Actif(boolean actif) {
    }

    private final AdminCrecheService service;

    public AdminCrecheController(AdminCrecheService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/creches")
    List<Ligne> lister() {
        return service.lister();
    }

    @PostMapping("/api/admin/creches")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> creer(@AuthenticationPrincipal AppUser admin, @RequestBody Nouvelle c) {
        return service.creer(admin, c);
    }

    @PostMapping("/api/admin/creches/{code}/actif")
    Map<String, Object> actif(@AuthenticationPrincipal AppUser admin, @PathVariable String code, @RequestBody Actif a) {
        service.definirActif(admin, code, a.actif());
        return Map.of("ok", true);
    }
}
