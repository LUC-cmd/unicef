package tg.fildor.web;

import jakarta.validation.Valid;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ComptesRepository;
import tg.fildor.repo.ComptesRepository.CompteDto;
import tg.fildor.repo.ComptesRepository.StructureAdmin;
import tg.fildor.service.AccesService;
import tg.fildor.web.ComptesController.Actif;
import tg.fildor.web.ComptesController.NouveauCompte;
import tg.fildor.web.ComptesController.NouvelleStructure;

/**
 * Les comptes et structures d'UNE région, gérés par son responsable régional : agents de santé, états civils,
 * centres de santé et centres sociaux. Jamais un compte d'une autre région, jamais un administrateur ni un autre
 * responsable régional (ceux-là sont créés par l'administrateur).
 */
@RestController
@RequestMapping("/api/decideur/gestion")
public class GestionRegionController {

    private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Set<String> ROLES = Set.of("AGENT", "MAIRIE", "STRUCTURE");
    private static final Set<String> TYPES = Set.of("CENTRE_SANTE", "CENTRE_SOCIAL", "ETAT_CIVIL");

    private final ComptesRepository comptes;
    private final PasswordEncoder encoder;
    private final AccesService acces;
    private final SecureRandom hasard = new SecureRandom();

    public GestionRegionController(ComptesRepository comptes, PasswordEncoder encoder, AccesService acces) {
        this.comptes = comptes;
        this.encoder = encoder;
        this.acces = acces;
    }

    private boolean appartient(CompteDto c, String region, List<StructureAdmin> structures) {
        if (!ROLES.contains(c.role())) {
            return false;
        }
        if (c.codeStructure() != null) {
            return structures.stream().anyMatch(s -> s.code().equals(c.codeStructure()) && region.equals(s.region()));
        }
        return region.equals(c.regionZone()) || region.equals(c.region());
    }

    @GetMapping("/comptes")
    List<CompteDto> lister(@AuthenticationPrincipal AppUser u) {
        String region = AdminCrecheController.regionDe(u);
        List<StructureAdmin> structures = comptes.structures();
        return comptes.lister().stream().filter(c -> appartient(c, region, structures)).toList();
    }

    @GetMapping("/structures")
    List<StructureAdmin> structures(@AuthenticationPrincipal AppUser u) {
        String region = AdminCrecheController.regionDe(u);
        return comptes.structures().stream().filter(s -> region.equals(s.region())).toList();
    }

    @PostMapping("/comptes")
    ResponseEntity<Map<String, Object>> creer(@AuthenticationPrincipal AppUser u, @Valid @RequestBody NouveauCompte c) {
        String region = AdminCrecheController.regionDe(u);
        if (!ROLES.contains(c.role())) {
            return erreur("Vous créez des agents de santé, des états civils et des comptes de centres de santé ou de crèches.");
        }
        if (comptes.existe(c.username())) {
            return erreur("Cet identifiant existe déjà.");
        }
        String zone = vide(c.codeZone());
        String structure = vide(c.codeStructure());
        if ("STRUCTURE".equals(c.role())) {
            boolean ok = structure != null && comptes.structures().stream()
                    .anyMatch(s -> s.code().equals(structure) && region.equals(s.region()));
            if (!ok) {
                return erreur("Choisissez une structure de votre région.");
            }
            zone = null;
        } else {
            if (zone == null || comptes.regionDeZone(zone).filter(region::equals).isEmpty()) {
                return erreur("Choisissez une préfecture de votre région.");
            }
            structure = null;
        }
        String provisoire = motDePasseProvisoire();
        comptes.creer(c.username(), encoder.encode(provisoire), c.nomComplet().trim(), c.role(), zone,
                "STRUCTURE".equals(c.role()) ? null : region, structure);
        acces.tracer(u, "CREER_COMPTE_REGION", c.username());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("username", c.username(), "motDePasseProvisoire", provisoire));
    }

    private CompteDto dansMaRegion(AppUser u, long id) {
        String region = AdminCrecheController.regionDe(u);
        List<StructureAdmin> structures = comptes.structures();
        return comptes.lister().stream().filter(c -> c.id() == id && appartient(c, region, structures)).findFirst()
                .orElse(null);
    }

    @PostMapping("/comptes/{id}/actif")
    ResponseEntity<Map<String, Object>> actif(@AuthenticationPrincipal AppUser u, @PathVariable long id,
                                              @RequestBody Actif a) {
        if (dansMaRegion(u, id) == null) {
            return erreur("Compte introuvable dans votre région.");
        }
        comptes.definirActif(id, a.actif());
        acces.tracer(u, a.actif() ? "REACTIVER_COMPTE_REGION" : "DESACTIVER_COMPTE_REGION", String.valueOf(id));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/comptes/{id}/reinitialiser")
    ResponseEntity<Map<String, Object>> reinitialiser(@AuthenticationPrincipal AppUser u, @PathVariable long id) {
        if (dansMaRegion(u, id) == null) {
            return erreur("Compte introuvable dans votre région.");
        }
        String provisoire = motDePasseProvisoire();
        comptes.changerMotDePasse(id, encoder.encode(provisoire), true);
        acces.tracer(u, "REINITIALISER_COMPTE_REGION", String.valueOf(id));
        return ResponseEntity.ok(Map.of("motDePasseProvisoire", provisoire));
    }

    @PostMapping("/structures")
    ResponseEntity<Map<String, Object>> creerStructure(@AuthenticationPrincipal AppUser u,
                                                       @Valid @RequestBody NouvelleStructure s) {
        String region = AdminCrecheController.regionDe(u);
        if (!TYPES.contains(s.type())) {
            return erreur("Type de structure inconnu (les crèches se créent dans l'onglet Crèches).");
        }
        if (comptes.regionDeZone(s.codeZone()).filter(region::equals).isEmpty()) {
            return erreur("Choisissez une préfecture de votre région.");
        }
        String prefixe = switch (s.type()) {
            case "CENTRE_SANTE" -> "CS";
            case "CENTRE_SOCIAL" -> "CSO";
            default -> "EC";
        };
        String code = prefixe + "-" + s.codeZone() + "-" + (comptes.compterStructures(s.type(), s.codeZone()) + 1);
        comptes.creerStructure(code, s.type(), s.nom().trim(), s.codeZone(), vide(s.telephone()));
        acces.tracer(u, "CREER_STRUCTURE_REGION", code);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("code", code));
    }

    private String motDePasseProvisoire() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(ALPHABET.charAt(hasard.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    private static String vide(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static ResponseEntity<Map<String, Object>> erreur(String message) {
        return ResponseEntity.badRequest().body(Map.of("erreur", message));
    }
}
