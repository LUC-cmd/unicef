package tg.fildor.service;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import tg.fildor.config.AppUser;
import tg.fildor.config.FilDorProperties;
import tg.fildor.domain.Dtos.StatsZone;
import tg.fildor.repo.ZoneRepository;
import tg.fildor.domain.ZoneBrute;

/**
 * « Carte des zones oubliées » : des taux par zone, jamais un enfant ni un point GPS précis.
 * Une zone avec trop peu de familles n'est pas détaillée, pour qu'on ne puisse pas retrouver une personne.
 */
@Service
public class ZoneService {

    private final ZoneRepository zones;
    private final FilDorProperties props;
    private final AccesService acces;

    public ZoneService(ZoneRepository zones, FilDorProperties props, AccesService acces) {
        this.zones = zones;
        this.props = props;
        this.acces = acces;
    }

    public List<StatsZone> carte(AppUser u, LocalDate aujourdhui) {
        acces.tracer(u, "CONSULTER_CARTE", null);
        return zones.comptages(aujourdhui).stream().map(z -> calculer(z, props.seuilAnonymat())).toList();
    }

    static StatsZone calculer(ZoneBrute z, int seuilAnonymat) {
        return CalculZone.calculer(z, seuilAnonymat);
    }
}
