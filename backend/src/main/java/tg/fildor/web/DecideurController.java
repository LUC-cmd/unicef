package tg.fildor.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.StatsZone;
import tg.fildor.service.ZoneService;

@RestController
@RequestMapping("/api/decideur")
public class DecideurController {

    private final ZoneService zones;
    private final Clock clock;

    public DecideurController(ZoneService zones, Clock clock) {
        this.zones = zones;
        this.clock = clock;
    }

    @GetMapping("/zones")
    List<StatsZone> zones(@AuthenticationPrincipal AppUser u) {
        return zones.carte(u, LocalDate.now(clock));
    }
}
