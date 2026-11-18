package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import tg.fildor.config.FilDorProperties;
import tg.fildor.domain.Dtos.Carnet;
import tg.fildor.domain.Dtos.CarnetEnfant;
import tg.fildor.domain.Dtos.RendezVousDto;

/** Le QR du carnet : se signe, se relit, refuse le moindre changement. Aucun nom dans le contenu. */
class CarnetQrServiceTest {

    private static final String CLE_DEMO = "MC4CAQAwBQYDK2VwBCIEIMy8p9X8GOGe5tSIbDuQ2zlrOO7UB5RROZtlLKFb1pgc";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 18);

    private static FilDorProperties props() {
        return new FilDorProperties("poivre", false, "mdp", "http://localhost", 5, false, CLE_DEMO);
    }

    private static Carnet carnet() {
        return new Carnet("F-0033", "Vo (Vogan)", "fr", List.of(
                new CarnetEnfant("T033A", "ENFANT", LocalDate.of(2026, 5, 2), null, List.of(
                        new RendezVousDto(1, "VACCIN", "BCG", LocalDate.of(2026, 5, 4), "REALISE", LocalDate.of(2026, 5, 4)),
                        new RendezVousDto(2, "PESEE", "Pesée du mois", LocalDate.of(2026, 7, 1), "REALISE", LocalDate.of(2026, 7, 3)),
                        new RendezVousDto(3, "VACCIN", "Pentavalent 2", LocalDate.of(2026, 9, 1), "PLANIFIE", null)),
                        List.of())), null);
    }

    @Test
    void leJetonSeSigneEtSeRelit() {
        CarnetQrService qr = new CarnetQrService(props(), MAPPER);
        String jeton = qr.jeton(carnet(), AUJOURDHUI);
        assertTrue(jeton.startsWith(CarnetQrService.PREFIXE + "."));

        CarnetQrService.Verification v = qr.verifier(jeton);
        assertTrue(v.valide(), () -> "attendu valide, erreur : " + v.erreur());
        JsonNode n = v.contenu();
        assertEquals("F-0033", n.path("fam").asText());
        assertEquals(1, n.path("e").size());
        assertEquals("T033A", n.path("e").get(0).path("c").asText());
        assertEquals(2, n.path("e").get(0).path("ok").size());
        assertEquals("V@2026-09-01", n.path("e").get(0).path("p").asText());
        // Aucun nom ne doit jamais entrer dans le QR
        assertFalse(jeton.contains("Nom"));
    }

    @Test
    void leJetonEstDeterministe() {
        CarnetQrService qr = new CarnetQrService(props(), MAPPER);
        assertEquals(qr.jeton(carnet(), AUJOURDHUI), qr.jeton(carnet(), AUJOURDHUI));
    }

    @Test
    void unContenuModifieEstRefuse() {
        CarnetQrService qr = new CarnetQrService(props(), MAPPER);
        String jeton = qr.jeton(carnet(), AUJOURDHUI);
        String[] parts = jeton.split("\\.");
        // On remplace la date de naissance par une autre dans le contenu : la signature ne suit plus.
        byte[] contenu = java.util.Base64.getUrlDecoder().decode(parts[1]);
        String modifie = new String(contenu, java.nio.charset.StandardCharsets.UTF_8).replace("2026-05-02", "2026-05-03");
        String falsifie = parts[0] + "."
                + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(modifie.getBytes(java.nio.charset.StandardCharsets.UTF_8))
                + "." + parts[2];
        CarnetQrService.Verification v = qr.verifier(falsifie);
        assertFalse(v.valide());
        assertTrue(v.erreur().contains("ignature"));
    }

    @Test
    void uneAutreCleNePeutPasVerifier() {
        String autreCle = "MC4CAQAwBQYDK2VwBCIEID5zk8lvYCyCguMn80FeKIQ60o4vef2hZCw011z4NJa+";
        CarnetQrService signataire = new CarnetQrService(
                new FilDorProperties("p", false, "m", "http://x", 5, false, CLE_DEMO), MAPPER);
        CarnetQrService verificateur = new CarnetQrService(
                new FilDorProperties("p", false, "m", "http://x", 5, false, autreCle), MAPPER);
        String jeton = signataire.jeton(carnet(), AUJOURDHUI);
        assertFalse(verificateur.verifier(jeton).valide());
    }

    @Test
    void unJetonSansRapportEstRefuse() {
        CarnetQrService qr = new CarnetQrService(props(), MAPPER);
        assertFalse(qr.verifier(null).valide());
        assertFalse(qr.verifier("").valide());
        assertFalse(qr.verifier("bonjour").valide());
        assertFalse(qr.verifier("fildor1.pas-du-base64@@.x").valide());
        assertFalse(qr.verifier(CarnetQrService.PREFIXE + ".AAAA.AAAA").valide());
    }

    @Test
    void sansCleConfigureeUneCleEphemereEstGeneree() {
        CarnetQrService qr = new CarnetQrService(
                new FilDorProperties("p", false, "m", "http://x", 5, false, ""), MAPPER);
        assertFalse(qr.cleDepuisEnvironnement());
        String jeton = qr.jeton(carnet(), AUJOURDHUI);
        assertTrue(qr.verifier(jeton).valide());
    }

    @Test
    void lesTypesSontAbbregies() {
        assertEquals("V", CarnetQrService.abbr("VACCIN"));
        assertEquals("C", CarnetQrService.abbr("CONSULTATION_PRENATALE"));
        assertEquals("P", CarnetQrService.abbr("PESEE"));
        assertEquals("N", CarnetQrService.abbr("NUTRITION"));
        assertNotEquals("V", CarnetQrService.abbr("AUTRE"));
    }
}
