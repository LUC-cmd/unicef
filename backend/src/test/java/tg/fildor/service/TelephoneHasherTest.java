package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import tg.fildor.config.FilDorProperties;

class TelephoneHasherTest {

    private final TelephoneHasher hasher = new TelephoneHasher(
            new FilDorProperties("fildor-demo-pepper", true, "x", "http://localhost", 5, false, null));

    @Test
    void memeNumeroQuelleQueSoitLaForme() {
        assertEquals(hasher.hash("90000001"), hasher.hash("+228 90 00 00 01"));
        assertEquals(hasher.hash("90000001"), hasher.hash("00228-90000001"));
    }

    @Test
    void numerosDifferents() {
        assertNotEquals(hasher.hash("90000001"), hasher.hash("90000002"));
    }

    @Test
    void numeroTropCourt() {
        assertThrows(IllegalArgumentException.class, () -> hasher.hash("1234"));
    }

    @Test
    void correspondAuHashDesDonneesDeDemo() {
        // Valeur calculée par la migration V2 (SQL) pour le téléphone de démo 90000001 (famille F-0001)
        assertEquals("06be89abc377efd8b67f7e5b9778b4e863025b34303dbaa93f1ab0b55869062e", hasher.hash("90000001"));
    }
}
