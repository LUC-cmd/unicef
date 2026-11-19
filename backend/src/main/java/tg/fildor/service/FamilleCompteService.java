package tg.fildor.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.repo.CrecheRepository;
import tg.fildor.repo.CrecheRepository.CrecheRef;
import tg.fildor.repo.FamilleCompteRepository;
import tg.fildor.repo.FamilleCompteRepository.ZonePoint;
import tg.fildor.repo.RappelRepository.Identite;
import tg.fildor.service.CrecheService.CrecheDto;

/**
 * Compte famille : se connecter avec le numéro et le code famille, voir ses enfants, dire combien d'enfants on a,
 * trouver les crèches les plus proches et déclarer un déménagement (le carnet suit la famille dans sa nouvelle zone).
 */
@Service
public class FamilleCompteService {

    public record EnfantVu(String codeEnfant, String statut, Integer ageMois, LocalDate termePrevu, String acte) {
    }

    public record FamilleProfil(String codeFamille, String zoneCode, String zone, int enfantsDeclares,
                                int enfantsSuivis, List<EnfantVu> enfants) {
    }

    public record CrecheProche(CrecheDto creche, int distanceKm, String proximite) {
    }

    private final AccesFamille acces;
    private final FamilleCompteRepository repo;
    private final CrecheRepository creches;
    private final Clock clock;

    public FamilleCompteService(AccesFamille acces, FamilleCompteRepository repo, CrecheRepository creches,
                                Clock clock) {
        this.acces = acces;
        this.repo = repo;
        this.creches = creches;
        this.clock = clock;
    }

    public FamilleProfil profil(String telephone, String codeFamille) {
        Identite f = acces.verifier(telephone, codeFamille);
        LocalDate auj = LocalDate.now(clock);
        ZonePoint z = repo.zoneDeLaFamille(f.familleId());
        List<EnfantVu> enfants = repo.enfants(f.familleId()).stream().map(e -> {
            Integer age = null;
            if (e.naissance() != null) {
                Period p = Period.between(e.naissance(), auj);
                age = p.getYears() * 12 + p.getMonths();
            }
            return new EnfantVu(e.code(), e.statut(), age, e.terme(), e.acte());
        }).toList();
        return new FamilleProfil(f.codeFamille(), z.code(), z.nom(), repo.enfantsDeclares(f.familleId()),
                (int) enfants.stream().filter(e -> "ENFANT".equals(e.statut())).count(), enfants);
    }

    @Transactional
    public FamilleProfil declarerEnfants(String telephone, String codeFamille, int nombre) {
        Identite f = acces.verifier(telephone, codeFamille);
        if (nombre < 0 || nombre > 20) {
            throw new IllegalArgumentException("Nombre d'enfants invalide (0 à 20)");
        }
        repo.declarerEnfants(f.familleId(), nombre);
        return profil(telephone, codeFamille);
    }

    @Transactional
    public FamilleProfil demenager(String telephone, String codeFamille, String codeZone) {
        Identite f = acces.verifier(telephone, codeFamille);
        ZonePoint de = repo.zoneDeLaFamille(f.familleId());
        ZonePoint vers = repo.zoneParCode(codeZone == null ? "" : codeZone.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Zone inconnue"));
        if (de.id() == vers.id()) {
            throw new IllegalArgumentException("La famille est déjà dans cette zone");
        }
        repo.transferer(f.familleId(), de.id(), vers.id());
        return profil(telephone, codeFamille);
    }

    /** Crèches classées de la plus proche à la plus éloignée (distance entre les centres de zone, jamais une adresse). */
    public List<CrecheProche> crechesProches(String telephone, String codeFamille) {
        Identite f = acces.verifier(telephone, codeFamille);
        ZonePoint z = repo.zoneDeLaFamille(f.familleId());
        return creches.creches().stream()
                .map(c -> proche(c, z))
                .sorted(Comparator.comparingInt(CrecheProche::distanceKm))
                .toList();
    }

    private static CrecheProche proche(CrecheRef c, ZonePoint z) {
        double km = distanceKm(z.lat(), z.lon(), c.lat(), c.lon());
        int arrondi = (int) Math.round(km);
        String libelle = c.zone().equals(z.nom()) || arrondi < 2 ? "Dans votre zone"
                : "À environ " + arrondi + " km (" + c.zone() + ")";
        return new CrecheProche(CrecheService.dto(c), arrondi < 2 ? 0 : arrondi, libelle);
    }

    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
