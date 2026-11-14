package tg.fildor.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.repo.ContenuRepository;
import tg.fildor.repo.ZoneRepository;
import tg.fildor.repo.ZoneRepository.ZonePublique;

/**
 * Point d'écoute : causerie, radio ou marché. Les mêmes messages que le téléphone,
 * lus à voix haute pour toutes les familles, sans numéro et sans nom.
 */
@Service
public class EcouteService {

    /** Ordre d'une séance : éveil d'abord, signes de danger en dernier. */
    private static final List<String> SUJETS = List.of("EVEIL", "VACCINS", "NUTRITION", "DANGER");

    public record Moment(String sujet, String titre, String texte, boolean aValider) {
    }

    public record Seance(String codeZone, String nomZone, String consigne, List<Moment> moments) {
    }

    private final ZoneRepository zones;
    private final ContenuRepository contenus;

    public EcouteService(ZoneRepository zones, ContenuRepository contenus) {
        this.zones = zones;
        this.contenus = contenus;
    }

    public List<ZonePublique> zones() {
        return zones.publiques();
    }

    public Seance seance(String codeZone) {
        if (codeZone == null || codeZone.isBlank()) {
            throw new IllegalArgumentException("Choisissez une zone");
        }
        ZonePublique zone = zones.publiques().stream()
                .filter(z -> z.code().equalsIgnoreCase(codeZone.trim()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Zone inconnue"));
        List<Moment> moments = new ArrayList<>();
        for (String sujet : SUJETS) {
            contenus.trouver(sujet, "fr").ifPresent(c ->
                    moments.add(new Moment(c.sujet(), c.titre(), c.texte(), c.aValider())));
        }
        if (moments.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun message à lire pour cette séance");
        }
        return new Seance(zone.code(), zone.nom(),
                "À lire à voix haute, pour toutes les familles de la zone. Aucun nom, aucun rendez-vous personnel.",
                List.copyOf(moments));
    }
}
