package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import tg.fildor.domain.Indicateurs;
import tg.fildor.domain.Niveau;
import tg.fildor.domain.Priorite;

class PrioriteServiceTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 14);
    private final PrioriteService service = new PrioriteService();

    private static Indicateurs enfant(LocalDate naissance, int manques, int retard, int sansReponse, Integer muac,
                                      String declaration, boolean sansTel) {
        return new Indicateurs("ENFANT", naissance, manques, retard, sansReponse, muac, declaration, sansTel);
    }

    @Test
    void enfantAJourEstNormal() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(200), 0, 0, 0, 140, "VALIDEE", false), AUJOURDHUI);
        assertEquals(0, p.score());
        assertEquals(Niveau.NORMAL, p.niveau());
        assertTrue(p.raisons().isEmpty());
    }

    @Test
    void unRappelSansReponseFaitMonterLaFamille() {
        Priorite sans = service.calculer(enfant(AUJOURDHUI.minusDays(200), 1, 5, 0, 140, "VALIDEE", false), AUJOURDHUI);
        Priorite avec = service.calculer(enfant(AUJOURDHUI.minusDays(200), 1, 5, 1, 140, "VALIDEE", false), AUJOURDHUI);
        assertTrue(avec.score() > sans.score());
        assertEquals(25, avec.score() - sans.score());
    }

    @Test
    void malnutritionSevereEstUrgente() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(300), 1, 10, 1, 110, "VALIDEE", false), AUJOURDHUI);
        assertEquals(Niveau.URGENT, p.niveau());
        assertTrue(p.raisons().get(0).contains("110 mm"));
    }

    @Test
    void malnutritionModereeSeule() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(300), 0, 0, 0, 120, "VALIDEE", false), AUJOURDHUI);
        assertEquals(30, p.score());
        assertEquals(Niveau.PRIORITAIRE, p.niveau());
    }

    @Test
    void naissanceNonDeclareeApres45Jours() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(60), 0, 0, 0, null, null, false), AUJOURDHUI);
        assertEquals(25, p.score());
        assertTrue(p.raisons().get(0).contains("dépassé"));
    }

    @Test
    void naissanceNonDeclareeBientotHorsDelai() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(35), 0, 0, 0, null, null, false), AUJOURDHUI);
        assertEquals(20, p.score());
        assertTrue(p.raisons().get(0).contains("10 jour"));
    }

    @Test
    void nouveauNeRecentSansDeclarationNEstPasEncoreSignale() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(10), 0, 0, 0, null, null, false), AUJOURDHUI);
        assertEquals(0, p.score());
    }

    @Test
    void declarationEnvoyeeNeCompteQueSiRejetee() {
        assertEquals(0, service.calculer(enfant(AUJOURDHUI.minusDays(60), 0, 0, 0, null, "ENVOYEE", false), AUJOURDHUI).score());
        assertEquals(25, service.calculer(enfant(AUJOURDHUI.minusDays(60), 0, 0, 0, null, "REJETEE", false), AUJOURDHUI).score());
    }

    @Test
    void familleSansTelephoneAjouteUnPetitPoidsSeulementSiProbleme() {
        assertEquals(0, service.calculer(enfant(AUJOURDHUI.minusDays(200), 0, 0, 0, 140, "VALIDEE", true), AUJOURDHUI).score());
        assertEquals(20, service.calculer(enfant(AUJOURDHUI.minusDays(200), 1, 5, 0, 140, "VALIDEE", true), AUJOURDHUI).score());
    }

    @Test
    void plafondSurLesRendezVousManques() {
        Priorite p = service.calculer(enfant(AUJOURDHUI.minusDays(500), 6, 10, 0, 140, "VALIDEE", false), AUJOURDHUI);
        assertEquals(45, p.score());
    }

    @Test
    void grossesseSansNaissance() {
        Indicateurs i = new Indicateurs("GROSSESSE", null, 1, 40, 0, null, null, false);
        Priorite p = service.calculer(i, AUJOURDHUI);
        assertEquals(25, p.score()); // 15 (un rendez-vous manqué) + 10 (retard > 30 jours)
    }
}
