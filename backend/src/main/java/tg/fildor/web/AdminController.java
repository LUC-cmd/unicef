package tg.fildor.web;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.service.RappelService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final RappelService rappels;
    private final Clock clock;

    public AdminController(RappelService rappels, Clock clock) {
        this.rappels = rappels;
        this.clock = clock;
    }

    /**
     * Lance le cycle des rappels maintenant, ou « comme si » on était à une autre date (pratique pour la démo :
     * avancer de quelques jours fait apparaître des rendez-vous manqués et des rappels sans réponse).
     */
    @PostMapping("/cycle")
    RappelService.Cycle cycle(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return rappels.executerCycle(date != null ? date : LocalDate.now(clock));
    }
}
