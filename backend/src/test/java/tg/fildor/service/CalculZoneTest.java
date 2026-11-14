package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import tg.fildor.domain.ZoneBrute;

class CalculZoneTest {

    private static ZoneBrute zone(int familles, int realises, int manques, int declarables, int declares, int sansReponse) {
        return new ZoneBrute("Z", "Zone", "Maritime", 6.1, 1.2, "INCONNUE", familles, 0, sansReponse, realises,
                manques, declarables, declares, 10, 4);
    }

    @Test
    void zoneTropPetiteEstMasquee() {
        var s = CalculZone.calculer(zone(4, 10, 2, 3, 1, 1), 5);
        assertTrue(s.masquee());
        assertNull(s.indiceOubli());
        assertNull(s.tauxSuiviPct());
    }

    @Test
    void tauxEveilEtZoneSansEnfantEligible() {
        var s = CalculZone.calculer(zone(20, 95, 5, 20, 19, 0), 5);
        assertEquals(40, s.tauxEveilPct());
        var vide = CalculZone.calculer(new ZoneBrute("Z", "Zone", "Maritime", 6.1, 1.2, "INCONNUE", 10, 0, 0, 1, 1, 1, 1, 0, 0), 5);
        assertNull(vide.tauxEveilPct());
    }

    @Test
    void zoneBienSuivieAUnIndiceBas() {
        var s = CalculZone.calculer(zone(20, 95, 5, 20, 19, 0), 5);
        assertEquals(95, s.tauxSuiviPct());
        assertEquals(95, s.tauxNaissancesDeclareesPct());
        assertEquals(4, s.indiceOubli()); // 100 * (0,5*0,05 + 0,3*0,05) = 4
    }

    @Test
    void zoneOublieeAUnIndiceEleve() {
        var s = CalculZone.calculer(zone(10, 40, 60, 10, 2, 5), 5);
        assertEquals(40, s.tauxSuiviPct());
        assertTrue(s.indiceOubli() > 50);
    }

    @Test
    void sansDonneesLaZoneEstConsidereeCommeMalSuivie() {
        var s = CalculZone.calculer(zone(10, 0, 0, 0, 0, 0), 5);
        assertNull(s.tauxSuiviPct());
        assertEquals(80, s.indiceOubli()); // 100 * (0,5 + 0,3)
    }
}
