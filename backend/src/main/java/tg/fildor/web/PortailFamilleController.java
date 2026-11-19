package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.FilDorProperties;
import tg.fildor.domain.Dtos.EveilEnfant;
import tg.fildor.domain.Jeu;
import tg.fildor.service.EveilService;

/**
 * Contrôleur du portail famille autonome.
 * Permet aux familles d'accéder à leurs informations de suivi (statut des enfants, vaccins, jeux d'éveil)
 * à l'aide de leur identifiant code famille et d'un code PIN à 4 chiffres.
 *
 * Respecte le principe de minimisation des données :
 * aucun nom, prénom ni donnée sensible n'est renvoyé.
 */
@RestController
@RequestMapping("/api/portail")
public class PortailFamilleController {

    public record AuthRequest(
            @NotBlank String codeFamille,
            @NotBlank @Pattern(regexp = "\\d{4}", message = "Le code PIN doit comporter 4 chiffres") String pin
    ) {
    }

    public record AuthResponse(String jeton, String expiration) {
    }

    public record EnfantPortail(String code, String statut, LocalDate prochainRdv) {
    }

    public record VaccinPortail(String codeEnfant, String libelle, LocalDate datePrevue, String statut, LocalDate dateRealisation) {
    }

    public record FamillePortailResponse(
            String codeFamille,
            List<EnfantPortail> enfants,
            List<VaccinPortail> vaccins,
            Object prochainJeu
    ) {
    }

    private record FamilleLigne(long id, String codeFamille, String pinHash, boolean consentement) {
    }

    private final JdbcTemplate jdbcTemplate;
    private final EveilService eveil;
    private final Clock clock;
    private final SecretKeySpec cleHmac;

    @Autowired
    public PortailFamilleController(JdbcTemplate jdbcTemplate, EveilService eveil, FilDorProperties props, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.eveil = eveil;
        this.clock = clock;
        String secret = (props != null && props.telephonePepper() != null && !props.telephonePepper().isBlank())
                ? props.telephonePepper()
                : "fildor-portail-secret-fallback-cle";
        this.cleHmac = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public PortailFamilleController(JdbcTemplate jdbcTemplate, EveilService eveil, FilDorProperties props) {
        this(jdbcTemplate, eveil, props, Clock.system(ZoneId.of("Africa/Lome")));
    }

    /**
     * Authentification de la famille par son code famille et son PIN à 4 chiffres.
     * En cas de succès, un jeton d'accès temporaire signé par HMAC est renvoyé.
     */
    @PostMapping("/auth")
    public AuthResponse authentifier(@Valid @RequestBody AuthRequest r) {
        String sql = "SELECT id, code_famille, pin_hash, consentement FROM famille WHERE code_famille = ?";
        List<FamilleLigne> familles = jdbcTemplate.query(sql, (rs, rowNum) -> new FamilleLigne(
                rs.getLong("id"),
                rs.getString("code_famille"),
                rs.getString("pin_hash"),
                rs.getBoolean("consentement")
        ), r.codeFamille().trim().toUpperCase());

        if (familles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Code famille ou PIN incorrect");
        }

        FamilleLigne famille = familles.get(0);
        if (famille.pinHash() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Code famille ou PIN incorrect");
        }

        // Le PIN est vérifié en comparant le hash SHA-256 du PIN fourni avec le pin_hash en base
        String hashFourni = hashSha256(r.pin().trim());
        if (!MessageDigest.isEqual(
                famille.pinHash().toLowerCase().getBytes(StandardCharsets.UTF_8),
                hashFourni.toLowerCase().getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Code famille ou PIN incorrect");
        }

        if (!famille.consentement()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La famille n'a pas donné son accord pour le suivi");
        }

        // Jeton valide 2 heures
        Instant expiration = Instant.now(clock).plus(Duration.ofHours(2));
        String jeton = signerJeton(famille.codeFamille(), expiration);
        String expirationIso = DateTimeFormatter.ISO_INSTANT.format(expiration);

        return new AuthResponse(jeton, expirationIso);
    }

    /**
     * Retourne les données publiques de la famille (enfants, vaccins, prochain jeu d'éveil).
     * Accès protégé par le jeton temporaire transmis dans le header Authorization: Bearer <jeton>.
     */
    @GetMapping("/famille")
    public FamillePortailResponse donneesFamille(@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "En-tête Authorization manquant ou invalide");
        }

        String jeton = authHeader.substring(7).trim();
        String codeFamille = validerJeton(jeton);

        // Recherche de la famille en base
        String sqlFamille = "SELECT id, code_famille, consentement FROM famille WHERE code_famille = ?";
        List<FamilleLigne> familles = jdbcTemplate.query(sqlFamille, (rs, rowNum) -> new FamilleLigne(
                rs.getLong("id"),
                rs.getString("code_famille"),
                null,
                rs.getBoolean("consentement")
        ), codeFamille);

        if (familles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Famille introuvable");
        }

        FamilleLigne famille = familles.get(0);
        if (!famille.consentement()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Consentement non accordé");
        }

        LocalDate aujourdhui = LocalDate.now(clock);

        // Récupération des enfants
        String sqlEnfants = """
                SELECT e.id, e.code_enfant, e.statut,
                       (SELECT min(r.date_prevue) FROM rendez_vous r
                        WHERE r.enfant_id = e.id AND r.statut = 'PLANIFIE' AND r.date_prevue >= CAST(? AS DATE)) AS prochain_rdv
                FROM enfant e
                WHERE e.famille_id = ?
                ORDER BY e.id
                """;
        List<EnfantPortail> enfants = jdbcTemplate.query(sqlEnfants, (rs, rowNum) -> new EnfantPortail(
                rs.getString("code_enfant"),
                rs.getString("statut"),
                rs.getObject("prochain_rdv", LocalDate.class)
        ), aujourdhui, famille.id());

        // Récupération des vaccins prévus et réalisés pour la famille
        String sqlVaccins = """
                SELECT e.code_enfant, r.libelle, r.date_prevue, r.statut, r.date_realisation
                FROM rendez_vous r
                JOIN enfant e ON e.id = r.enfant_id
                WHERE e.famille_id = ? AND r.type = 'VACCIN'
                ORDER BY r.date_prevue, r.id
                """;
        List<VaccinPortail> vaccins = jdbcTemplate.query(sqlVaccins, (rs, rowNum) -> new VaccinPortail(
                rs.getString("code_enfant"),
                rs.getString("libelle"),
                rs.getObject("date_prevue", LocalDate.class),
                rs.getString("statut"),
                rs.getObject("date_realisation", LocalDate.class)
        ), famille.id());

        // Recherche du prochain jeu d'éveil pour les enfants éligibles de la famille
        Object prochainJeu = null;
        if (eveil != null) {
            List<EveilEnfant> eveilEnfants = eveil.pourFamille(famille.id(), aujourdhui);
            prochainJeu = eveilEnfants.stream()
                    .map(EveilEnfant::jeuDuJour)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        }

        return new FamillePortailResponse(famille.codeFamille(), enfants, vaccins, prochainJeu);
    }

    /**
     * Calcule le hash SHA-256 en hexadécimal (64 caractères minuscules).
     */
    public static String hashSha256(String texte) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] h = sha.digest(texte.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Algorithme SHA-256 indisponible", e);
        }
    }

    /**
     * Signe un jeton contenant le code famille et la date d'expiration via HMAC-SHA256.
     */
    private String signerJeton(String codeFamille, Instant expiration) {
        String payload = codeFamille + ":" + expiration.getEpochSecond();
        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);
        byte[] signature = hmac(payloadBytes);

        String b64Payload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadBytes);
        String b64Sig = Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        return b64Payload + "." + b64Sig;
    }

    /**
     * Vérifie la validité d'un jeton : format, signature HMAC et non-expiration.
     * Renvoie le code famille extrait en cas de succès.
     */
    private String validerJeton(String jeton) {
        if (jeton == null || !jeton.contains(".")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton invalide");
        }
        String[] parts = jeton.split("\\.");
        if (parts.length != 2) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Format de jeton invalide");
        }

        byte[] payloadBytes;
        byte[] sigBytes;
        try {
            payloadBytes = Base64.getUrlDecoder().decode(parts[0]);
            sigBytes = Base64.getUrlDecoder().decode(parts[1]);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton corrompu ou illisible");
        }

        byte[] attendu = hmac(payloadBytes);
        if (!MessageDigest.isEqual(attendu, sigBytes)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Signature du jeton invalide");
        }

        String payload = new String(payloadBytes, StandardCharsets.UTF_8);
        int idx = payload.lastIndexOf(':');
        if (idx <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Structure de jeton invalide");
        }

        String codeFamille = payload.substring(0, idx);
        long epochSecond;
        try {
            epochSecond = Long.parseLong(payload.substring(idx + 1));
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Date d'expiration invalide dans le jeton");
        }

        Instant expiration = Instant.ofEpochSecond(epochSecond);
        if (Instant.now(clock).isAfter(expiration)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton expiré");
        }

        return codeFamille;
    }

    private byte[] hmac(byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(cleHmac);
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("Erreur lors du calcul HMAC", e);
        }
    }
}
