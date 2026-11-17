package tg.fildor.web;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.service.CrecheService;
import tg.fildor.service.CrecheService.CrecheDto;
import tg.fildor.service.CrecheService.MesCreches;
import tg.fildor.service.CrecheService.OffreMaj;
import tg.fildor.service.CrecheService.Reservation;
import tg.fildor.service.CrecheService.ReservationStructure;

/** Crèches : côté famille (public, par numéro de téléphone) et côté crèche (compte STRUCTURE). */
@RestController
public class CrecheController {

    public record Tel(@NotBlank String telephone, @NotBlank String codeFamille) {
    }

    public record Decision(@NotBlank String decision) {
    }

    public record Pointage(@NotBlank String action) {
    }

    private final CrecheService service;

    public CrecheController(CrecheService service) {
        this.service = service;
    }

    @GetMapping("/api/public/creches")
    List<CrecheDto> liste() {
        return service.liste();
    }

    @PostMapping("/api/public/famille/creches")
    MesCreches mesCreches(@RequestBody Tel t) {
        return service.mesCreches(t.telephone(), t.codeFamille());
    }

    @PostMapping("/api/public/creches/{code}/reserver")
    Map<String, Object> reserver(@PathVariable String code, @RequestBody Reservation r) {
        long id = service.reserver(code, r);
        return Map.of("id", id, "message", "Demande envoyée à la crèche. Vous recevrez sa réponse par message.");
    }

    @PostMapping("/api/public/creches/reservations/{id}/annuler")
    Map<String, String> annuler(@PathVariable long id, @RequestBody Tel t) {
        service.annuler(t.telephone(), t.codeFamille(), id);
        return Map.of("message", "Réservation annulée.");
    }

    @GetMapping("/api/structure/creche")
    CrecheDto maCreche(@AuthenticationPrincipal AppUser u) {
        return service.maCreche(u);
    }

    @PutMapping("/api/structure/creche")
    CrecheDto offre(@AuthenticationPrincipal AppUser u, @RequestBody OffreMaj m) {
        return service.mettreAJourOffre(u, m);
    }

    @GetMapping("/api/structure/creche/reservations")
    List<ReservationStructure> reservations(@AuthenticationPrincipal AppUser u,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au) {
        return service.reservations(u, du, au);
    }

    @PostMapping("/api/structure/creche/reservations/{id}/pointage")
    Map<String, String> pointage(@AuthenticationPrincipal AppUser u, @PathVariable long id, @RequestBody Pointage p) {
        service.pointer(u, id, p.action());
        return Map.of("message", "Présence enregistrée. La famille est prévenue.");
    }

    @PostMapping("/api/structure/creche/reservations/{id}/decision")
    Map<String, String> decision(@AuthenticationPrincipal AppUser u, @PathVariable long id, @RequestBody Decision d) {
        service.decider(u, id, d.decision());
        return Map.of("message", "Décision enregistrée. La famille est prévenue.");
    }
}
