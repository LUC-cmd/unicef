package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class RegleInscriptionTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 14);

    private static void enfant(LocalDate naissance) {
        RegleInscription.validerEnfant("ENFANT", naissance, null, null, null, AUJOURDHUI);
    }

    private static void grossesse(LocalDate terme, Integer consultations) {
        RegleInscription.validerEnfant("GROSSESSE", null, terme, consultations, null, AUJOURDHUI);
    }

    @Test
    void enfantNormalEstAccepte() {
        enfant(AUJOURDHUI.minusMonths(8));
        enfant(AUJOURDHUI);
    }

    @Test
    void naissanceObligatoireEtPasDansLeFutur() {
        assertThrows(IllegalArgumentException.class, () -> enfant(null));
        assertThrows(IllegalArgumentException.class, () -> enfant(AUJOURDHUI.plusDays(1)));
    }

    @Test
    void enfantDePlusDeCinqAnsRefuse() {
        enfant(AUJOURDHUI.minusYears(5));
        assertThrows(IllegalArgumentException.class, () -> enfant(AUJOURDHUI.minusYears(6)));
    }

    @Test
    void grossesseAvecTermeVraisemblable() {
        grossesse(AUJOURDHUI.plusDays(120), 2);
        grossesse(AUJOURDHUI.minusDays(10), null); // terme légèrement dépassé : acceptée
        assertThrows(IllegalArgumentException.class, () -> grossesse(null, null));
        assertThrows(IllegalArgumentException.class, () -> grossesse(AUJOURDHUI.minusDays(90), null));
        assertThrows(IllegalArgumentException.class, () -> grossesse(AUJOURDHUI.plusDays(400), null));
    }

    @Test
    void nombreDeConsultationsPrenatalesBorne() {
        assertThrows(IllegalArgumentException.class, () -> grossesse(AUJOURDHUI.plusDays(120), -1));
        assertThrows(IllegalArgumentException.class, () -> grossesse(AUJOURDHUI.plusDays(120), 5));
    }

    @Test
    void etapesDeVaccinInconnuesRefusees() {
        assertEquals(2, RegleInscription.etapesValides(List.of(0, 3, 3)).size());
        assertThrows(IllegalArgumentException.class, () -> RegleInscription.etapesValides(List.of(5)));
        assertThrows(IllegalArgumentException.class, () -> RegleInscription.etapesValides(List.of(-1)));
    }
}
