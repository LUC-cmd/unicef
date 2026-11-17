package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
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

/**
 * Création des comptes par l'administrateur : agents de santé, centres de santé, états civils (mairies),
 * responsables régionaux. Chaque compte est rattaché à sa préfecture, sa région ou sa structure.
 * Le mot de passe provisoire est montré une seule fois à l'administrateur, qui le transmet de vive voix.
 */
@RestController
@RequestMapping("/api/admin")
public class ComptesController {

    private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final List<String> ROLES = List.of("AGENT", "STRUCTURE", "MAIRIE", "DECIDEUR", "ADMIN");
    private static final List<String> TYPES = List.of("CENTRE_SANTE", "CRECHE", "CENTRE_SOCIAL", "ETAT_CIVIL");
    private static final List<String> REGIONS = List.of("Maritime", "Plateaux", "Centrale", "Kara", "Savanes");

    public record NouveauCompte(
            @NotBlank @Size(min = 3, max = 40) @Pattern(regexp = "[a-z0-9._-]+") String username,
            @NotBlank @Size(max = 100) String nomComplet,
            @NotBlank String role,
            String codeZone,
            String region,
            String codeStructure) {
    }

    public record NouvelleStructure(@NotBlank String type, @NotBlank @Size(max = 120) String nom,
                                    @NotBlank String codeZone, @Size(max = 30) String telephone) {
    }

    public record Actif(boolean actif) {
    }

    private final ComptesRepository comptes;
    private final PasswordEncoder encoder;
    private final SecureRandom hasard = new SecureRandom();

    public ComptesController(ComptesRepository comptes, PasswordEncoder encoder) {
        this.comptes = comptes;
        this.encoder = encoder;
    }

    @GetMapping("/comptes")
    List<CompteDto> lister() {
        return comptes.lister();
    }

    @GetMapping("/structures")
    List<StructureAdmin> structures() {
        return comptes.structures();
    }

    @PostMapping("/comptes")
    ResponseEntity<Map<String, Object>> creer(@Valid @RequestBody NouveauCompte c) {
        if (!ROLES.contains(c.role())) {
            return erreur("Rôle inconnu.");
        }
        if (comptes.existe(c.username())) {
            return erreur("Cet identifiant existe déjà.");
        }
        String zone = vide(c.codeZone());
        String region = vide(c.region());
        String structure = vide(c.codeStructure());
        switch (c.role()) {
            case "AGENT" -> {
                if (zone == null || !comptes.zoneExiste(zone)) {
                    return erreur("Un agent de santé est rattaché à une préfecture : choisissez-la.");
                }
                region = comptes.regionDeZone(zone).orElse(null);
                structure = null;
            }
            case "STRUCTURE" -> {
                if (structure == null || comptes.typeStructure(structure).isEmpty()) {
                    return erreur("Un compte de structure est rattaché à une structure : choisissez-la ou créez-la.");
                }
                zone = null;
                region = null;
            }
            case "MAIRIE" -> {
                if (zone == null || !comptes.zoneExiste(zone)) {
                    return erreur("Un état civil est rattaché à une préfecture : choisissez-la.");
                }
                region = comptes.regionDeZone(zone).orElse(null);
                structure = null;
            }
            case "DECIDEUR" -> {
                if (region != null && !REGIONS.contains(region)) {
                    return erreur("Région inconnue.");
                }
                zone = null;
                structure = null;
            }
            default -> {
                zone = null;
                region = null;
                structure = null;
            }
        }
        String provisoire = motDePasseProvisoire();
        comptes.creer(c.username(), encoder.encode(provisoire), c.nomComplet().trim(), c.role(), zone, region, structure);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("username", c.username(), "motDePasseProvisoire", provisoire));
    }

    @PostMapping("/comptes/{id}/actif")
    ResponseEntity<Map<String, Object>> actif(@PathVariable long id, @RequestBody Actif a,
                                              @AuthenticationPrincipal AppUser moi) {
        if (id == moi.id() && !a.actif()) {
            return erreur("Vous ne pouvez pas désactiver votre propre compte.");
        }
        return comptes.definirActif(id, a.actif()) == 0 ? erreur("Compte introuvable.")
                : ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/comptes/{id}/reinitialiser")
    ResponseEntity<Map<String, Object>> reinitialiser(@PathVariable long id) {
        String provisoire = motDePasseProvisoire();
        return comptes.changerMotDePasse(id, encoder.encode(provisoire), true) == 0 ? erreur("Compte introuvable.")
                : ResponseEntity.ok(Map.of("motDePasseProvisoire", provisoire));
    }

    @PostMapping("/structures")
    ResponseEntity<Map<String, Object>> creerStructure(@Valid @RequestBody NouvelleStructure s) {
        if (!TYPES.contains(s.type())) {
            return erreur("Type de structure inconnu.");
        }
        if (!comptes.zoneExiste(s.codeZone())) {
            return erreur("Préfecture inconnue.");
        }
        String prefixe = switch (s.type()) {
            case "CENTRE_SANTE" -> "CS";
            case "CRECHE" -> "CR";
            case "CENTRE_SOCIAL" -> "CSO";
            default -> "EC";
        };
        String code = prefixe + "-" + s.codeZone() + "-" + (comptes.compterStructures(s.type(), s.codeZone()) + 1);
        comptes.creerStructure(code, s.type(), s.nom().trim(), s.codeZone(), vide(s.telephone()));
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
