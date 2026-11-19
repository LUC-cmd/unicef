package tg.fildor.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.FilDorProperties;

/**
 * Tests unitaires pour PortailFamilleController (hachage, signature de jeton et validation).
 */
class PortailFamilleControllerTest {

    private final FilDorProperties props = new FilDorProperties(
            "test-pepper-12345",
            true,
            "demo",
            "http://localhost:5173",
            5,
            false,
            "cle-qr-test"
    );

    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-11-19T10:00:00Z"), ZoneId.of("Africa/Lome"));

    @Test
    void hashSha256EstConforme() {
        // Le hash SHA-256 de '1234' doit correspondre à la valeur standard
        String hash = PortailFamilleController.hashSha256("1234");
        assertEquals("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", hash);
    }

    @Test
    void authentificationJetonInvalideLeveException() {
        PortailFamilleController controller = new PortailFamilleController(null, null, props, fixedClock);

        // Sans en-tête Bearer
        assertThrows(ResponseStatusException.class, () -> controller.donneesFamille(null));
        assertThrows(ResponseStatusException.class, () -> controller.donneesFamille("Basic abc"));

        // Jeton invalide ou malformé
        assertThrows(ResponseStatusException.class, () -> controller.donneesFamille("Bearer jeton-invalide"));
    }
}
