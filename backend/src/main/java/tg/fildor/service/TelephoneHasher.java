package tg.fildor.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Component;
import tg.fildor.config.FilDorProperties;

/** Les numéros ne sont jamais stockés en clair : SHA-256 de (poivre + 8 derniers chiffres). */
@Component
public class TelephoneHasher {

    private final String poivre;

    public TelephoneHasher(FilDorProperties props) {
        this.poivre = props.telephonePepper();
    }

    /** Ne garde que les chiffres, puis les 8 derniers (numéros togolais à 8 chiffres, avec ou sans +228). */
    public static String normaliser(String numero) {
        String chiffres = numero == null ? "" : numero.replaceAll("\\D", "");
        if (chiffres.length() < 8) {
            throw new IllegalArgumentException("Numéro invalide : 8 chiffres attendus");
        }
        return chiffres.substring(chiffres.length() - 8);
    }

    public String hash(String numero) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] h = sha.digest((poivre + normaliser(numero)).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
