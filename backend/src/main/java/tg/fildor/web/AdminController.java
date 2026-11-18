package tg.fildor.web;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ApercuRepository;
import tg.fildor.repo.AnnuaireRepository;
import tg.fildor.repo.UserRepository;
import tg.fildor.service.RappelService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final RappelService rappels;
    private final ApercuRepository apercu;
    private final Clock clock;
    private final UserRepository users;
    private final AnnuaireRepository annuaire;

    public AdminController(RappelService rappels, ApercuRepository apercu, Clock clock,
                          UserRepository users, AnnuaireRepository annuaire) {
        this.rappels = rappels;
        this.apercu = apercu;
        this.clock = clock;
        this.users = users;
        this.annuaire = annuaire;
    }

    /** Vue d'ensemble de la plateforme : totaux, activité des 30 derniers jours, répartitions. */
    @GetMapping("/apercu")
    java.util.Map<String, Object> apercu() {
        return apercu.apercu();
    }

    /**
     * Lance le cycle des rappels maintenant, ou « comme si » on était à une autre date (pratique pour la démo :
     * avancer de quelques jours fait apparaître des rendez-vous manqués et des rappels sans réponse).
     */
    @PostMapping("/cycle")
    RappelService.Cycle cycle(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return rappels.executerCycle(date != null ? date : LocalDate.now(clock));
    }

    /** Créer un compte (agent, centre de santé, mairie, responsable régional). */
    @PostMapping("/comptes")
    java.util.Map<String, String> creerCompte(@RequestBody CreerCompte req, @AuthenticationPrincipal AppUser u) {
        if (!"ADMIN".equals(u.role())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Seul l'administrateur peut créer des comptes.");
        }
        if (req.region != null && !req.region.isBlank()) {
            users.creerAvecRegion(req.username, req.passwordHash, req.nom, req.role, req.codeZone, req.codeStructure, req.region);
        } else {
            users.creer(req.username, req.passwordHash, req.nom, req.role, req.codeZone, req.codeStructure);
        }
        return java.util.Map.of("message", "Compte créé avec succès.");
    }

    /** Activer ou désactiver un compte. */
    @PostMapping("/comptes/{id}/actif")
    java.util.Map<String, String> changerActif(long id, @RequestBody ActifCompte req, @AuthenticationPrincipal AppUser u) {
        if (!"ADMIN".equals(u.role())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Seul l'administrateur peut modifier les comptes.");
        }
        if (req.actif) {
            users.activer(id);
        } else {
            users.desactiver(id);
        }
        return java.util.Map.of("message", req.actif ? "Compte activé." : "Compte désactivé.");
    }

    /** Créer une structure (centre de santé, crèche, centre social, état civil). */
    @PostMapping("/structures")
    java.util.Map<String, String> creerStructure(@RequestBody CreerStructure req, @AuthenticationPrincipal AppUser u) {
        if (!"ADMIN".equals(u.role())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Seul l'administrateur peut créer des structures.");
        }
        long id = annuaire.creerStructure(req.code, req.type, req.nom, req.codeZone, req.telephone,
                                          req.horaires, req.services, req.besoinsSpecifiques,
                                          req.latitude, req.longitude);
        return java.util.Map.of("message", "Structure créée avec succès.", "id", String.valueOf(id));
    }

    /** DTO pour créer un compte. */
    public record CreerCompte(
        String username,
        String passwordHash,
        String nom,
        String role,
        String codeZone,
        String codeStructure,
        String region
    ) {}

    /** DTO pour activer/désactiver un compte. */
    public record ActifCompte(boolean actif) {}

    /** DTO pour créer une structure. */
    public record CreerStructure(
        String code,
        String type,
        String nom,
        String codeZone,
        String telephone,
        String horaires,
        String services,
        boolean besoinsSpecifiques,
        double latitude,
        double longitude
    ) {}
}
