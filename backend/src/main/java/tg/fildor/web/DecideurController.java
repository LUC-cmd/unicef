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
    private final tg.fildor.repo.ZoneRepository zonesRepo;
    private final Clock clock;

    public DecideurController(ZoneService zones, tg.fildor.repo.ZoneRepository zonesRepo, Clock clock) {
        this.zones = zones;
        this.zonesRepo = zonesRepo;
        this.clock = clock;
    }

    /** Les 5 régions et 39 préfectures ; les préfectures « pilote » sont celles où Fil d'Or est déployé. */
    @GetMapping("/geographie")
    List<tg.fildor.repo.ZoneRepository.Prefecture> geographie() {
        return zonesRepo.geographie();
    }

    @GetMapping("/zones")
    List<StatsZone> zones(@AuthenticationPrincipal AppUser u) {
        return zones.carte(u, LocalDate.now(clock));
    }
}
