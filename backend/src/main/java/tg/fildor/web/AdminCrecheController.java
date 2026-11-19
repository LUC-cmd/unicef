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
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ComptesRepository;
import tg.fildor.service.AdminCrecheService;
import tg.fildor.service.AdminCrecheService.Ligne;
import tg.fildor.service.AdminCrecheService.Nouvelle;

/**
 * Les crèches vues par le responsable régional : liste de SA région, création avec le compte du responsable,
 * activation. L'administrateur crée les responsables régionaux ; chacun gère ensuite les crèches de sa région.
 */
@RestController
public class AdminCrecheController {

    public record Actif(boolean actif) {
    }

    private final AdminCrecheService service;
    private final ComptesRepository comptes;

    public AdminCrecheController(AdminCrecheService service, ComptesRepository comptes) {
        this.service = service;
        this.comptes = comptes;
    }

    static String regionDe(AppUser u) {
        if (!"DECIDEUR".equals(u.role()) || u.region() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Réservé au responsable régional");
        }
        return u.region();
    }

    private boolean dansRegion(String region, String codeZone) {
        return codeZone != null && comptes.regionDeZone(codeZone).filter(region::equals).isPresent();
    }

    @GetMapping("/api/decideur/gestion/creches")
    List<Ligne> lister(@AuthenticationPrincipal AppUser u) {
        String region = regionDe(u);
        return service.lister().stream().filter(l -> dansRegion(region, l.codeZone())).toList();
    }

    @PostMapping("/api/decideur/gestion/creches")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> creer(@AuthenticationPrincipal AppUser u, @RequestBody Nouvelle c) {
        if (!dansRegion(regionDe(u), c.codeZone())) {
            throw new IllegalArgumentException("Cette préfecture n'est pas dans votre région");
        }
        return service.creer(u, c);
    }

    @PostMapping("/api/decideur/gestion/creches/{code}/actif")
    Map<String, Object> actif(@AuthenticationPrincipal AppUser u, @PathVariable String code, @RequestBody Actif a) {
        String region = regionDe(u);
        boolean ok = service.lister().stream().anyMatch(l -> l.code().equals(code) && dansRegion(region, l.codeZone()));
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Crèche introuvable dans votre région");
        }
        service.definirActif(u, code, a.actif());
        return Map.of("ok", true);
    }
}
