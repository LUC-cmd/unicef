package tg.fildor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tg.fildor.config.FilDorProperties;
import tg.fildor.domain.Dtos.Carnet;
import tg.fildor.domain.Dtos.CarnetEnfant;
import tg.fildor.domain.Dtos.RendezVousDto;

/**
 * Le carnet devient la base de données : le carnet illustré porte un code QR signé qui résume
 * l'état du suivi (vaccins faits, prochain rendez-vous), sans aucun nom, adresse ni position.
 * N'importe quel centre peut le relire depuis la page « Vérifier un QR » ; la signature Ed25519
 * empêche de falsifier le contenu. Ed25519 est déterministe : vérifier = re-signer et comparer.
 */
@Service
public class CarnetQrService {

    public static final String PREFIXE = "fildor1";
    private static final Logger LOG = LoggerFactory.getLogger(CarnetQrService.class);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;
    /** Abréviation des types de rendez-vous pour garder le QR lisible par un lecteur simple. */
    private static final List<String> TYPES_ABBR = List.of("VACCIN", "CONSULTATION_PRENATALE", "PESEE", "NUTRITION");

    private final ObjectMapper mapper;
    private final PrivateKey clePrivee;
    private final boolean cleDepuisEnvironnement;

    public CarnetQrService(FilDorProperties props, ObjectMapper mapper) {
        this.mapper = mapper;
        String b64 = props.cleQr();
        PrivateKey cle = null;
        if (b64 != null && !b64.isBlank()) {
            try {
                cle = cleDepuisPkcs8(Base64.getDecoder().decode(b64.trim()));
            } catch (IllegalArgumentException | InvalidKeySpecException | NoSuchAlgorithmException e) {
                LOG.warn("FILDOR_CLE_QR fournie mais illisible ({}) : une clé éphémère sera générée", e.getMessage());
            }
        }
        if (cle == null) {
            cle = genererCle();
            this.cleDepuisEnvironnement = false;
            LOG.info("Clé QR générée pour ce démarrage. Donnez FILDOR_CLE_QR (PKCS#8 Ed25519 en Base64) "
                    + "pour que les QR restent vérifiables après un redémarrage.");
        } else {
            this.cleDepuisEnvironnement = true;
        }
        this.clePrivee = cle;
    }

    /** Une clé Ed25519 encodée PKCS#8 (préfixe DER standard puis la graine de 32 octets). */
    static PrivateKey cleDepuisPkcs8(byte[] pkcs8)
            throws InvalidKeySpecException, NoSuchAlgorithmException {
        return KeyFactory.getInstance("Ed25519").generatePrivate(new PKCS8EncodedKeySpec(pkcs8));
    }

    private static PrivateKey genererCle() {
        try {
            var generateur = java.security.KeyPairGenerator.getInstance("Ed25519");
            return generateur.generateKeyPair().getPrivate();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Ed25519 indisponible dans cette JVM", e);
        }
    }

    /** Le jeton imprimé dans le carnet : fildor1.<contenu en Base64url>.<signature en Base64url>. */
    public String jeton(Carnet carnet, LocalDate aujourdhui) {
        try {
            ObjectNode racine = mapper.createObjectNode();
            racine.put("v", 1);
            racine.put("fam", carnet.codeFamille());
            ArrayNode enfants = racine.putArray("e");
            for (CarnetEnfant e : carnet.enfants()) {
                ObjectNode o = enfants.addObject();
                o.put("c", e.codeEnfant());
                o.put("s", e.statut());
                if (e.dateNaissance() != null) o.put("n", e.dateNaissance().format(ISO));
                if (e.dateTermePrevue() != null) o.put("t", e.dateTermePrevue().format(ISO));
                ArrayNode faits = o.putArray("ok");
                RendezVousDto prochain = null;
                for (RendezVousDto r : e.rendezVous()) {
                    if ("REALISE".equals(r.statut())) {
                        LocalDate faite = r.dateRealisation() != null ? r.dateRealisation() : r.datePrevue();
                        faits.add(abbr(r.type()) + "@" + (faite == null ? "" : faite.format(ISO)));
                    } else if (prochain == null || (r.datePrevue() != null && r.datePrevue().isBefore(prochain.datePrevue()))) {
                        prochain = r;
                    }
                }
                if (prochain != null && prochain.datePrevue() != null) {
                    o.put("p", abbr(prochain.type()) + "@" + prochain.datePrevue().format(ISO));
                }
            }
            racine.put("g", aujourdhui.format(ISO));
            byte[] contenu = mapper.writeValueAsBytes(racine);
            return PREFIXE + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(contenu)
                    + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(signer(contenu));
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de signer le carnet", e);
        }
    }

    public record Verification(boolean valide, String erreur, JsonNode contenu) {
    }

    /** Vérifie la signature puis renvoie le contenu décodé. Aucune donnée n'est relue en base :
     *  le jeton se suffit à lui-même, ce qui marche même depuis un autre site ou une autre zone. */
    public Verification verifier(String jeton) {
        if (jeton == null) return new Verification(false, "Code vide", null);
        String[] parts = jeton.trim().split("\\.");
        if (parts.length != 3 || !PREFIXE.equals(parts[0])) {
            return new Verification(false, "Ce code n'est pas un code de suivi Fil d'Or", null);
        }
        byte[] contenu;
        byte[] signature;
        try {
            contenu = Base64.getUrlDecoder().decode(parts[1]);
            signature = Base64.getUrlDecoder().decode(parts[2]);
        } catch (IllegalArgumentException e) {
            return new Verification(false, "Code illisible", null);
        }
        byte[] attendue = signer(contenu);
        // MessageDigest.isEqual compare en temps constant : pas d'attaque par chronométrage.
        if (!MessageDigest.isEqual(attendue, signature)) {
            return new Verification(false, "Signature invalide : ce code a été modifié ou ne vient pas de Fil d'Or", null);
        }
        try {
            JsonNode n = mapper.readTree(new String(contenu, StandardCharsets.UTF_8));
            if (n.path("v").asInt() != 1 || n.path("fam").asText("").isBlank()) {
                return new Verification(false, "Contenu non reconnu", null);
            }
            return new Verification(true, null, n);
        } catch (Exception e) {
            return new Verification(false, "Contenu non reconnu", null);
        }
    }

    boolean cleDepuisEnvironnement() {
        return cleDepuisEnvironnement;
    }

    private byte[] signer(byte[] contenu) {
        try {
            // Ed25519 est déterministe (RFC 8032) : la même clé et le même contenu donnent la même signature.
            Signature s = Signature.getInstance("Ed25519");
            s.initSign(clePrivee);
            s.update(contenu);
            return s.sign();
        } catch (Exception e) {
            throw new IllegalStateException("Signature impossible", e);
        }
    }

    static String abbr(String type) {
        int i = TYPES_ABBR.indexOf(type);
        return i >= 0 ? TYPES_ABBR.get(i).substring(0, 1) : (type == null || type.isBlank() ? "R" : type.substring(0, 1));
    }
}
