package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import tg.fildor.service.RisqueNutritionnel.Evaluation;
import tg.fildor.service.RisqueNutritionnel.Niveau;

/**
 * Tests unitaires du service RisqueNutritionnel.
 */
class RisqueNutritionnelTest {

    private final RisqueNutritionnel service = new RisqueNutritionnel();

    @Test
    void enfantNormalSansRisque() {
        // Enfant sans problème : MUAC normal (140mm), pas de retard, aucun rappel manqué, pesé récemment, pas mère ado
        Evaluation eval = service.calculer(140, 0, 0, false, false);
        assertEquals(0, eval.score());
        assertEquals(Niveau.NORMAL, eval.niveau());
        assertEquals("Continuer le suivi habituel", eval.recommandation());
        assertTrue(eval.raisons().isEmpty());
    }

    @Test
    void muacMoinsDe115EstCritique() {
        // MUAC < 115mm donne +40 points
        Evaluation eval = service.calculer(110, 0, 0, false, false);
        assertEquals(40, eval.score());
        assertEquals(Niveau.A_RISQUE, eval.niveau());
        assertEquals("Renforcer le suivi nutritionnel, peser chaque semaine", eval.recommandation());
        assertTrue(eval.raisons().get(0).contains("110 mm"));
    }

    @Test
    void muacEntre115Et125Donne25Points() {
        // MUAC 115-125mm donne +25 points
        Evaluation eval1 = service.calculer(115, 0, 0, false, false);
        assertEquals(25, eval1.score());
        assertEquals(Niveau.A_SURVEILLER, eval1.niveau());
        assertEquals("Maintenir les rendez-vous et surveiller l'alimentation", eval1.recommandation());

        Evaluation eval2 = service.calculer(125, 0, 0, false, false);
        assertEquals(25, eval2.score());
        assertEquals(Niveau.A_SURVEILLER, eval2.niveau());

        Evaluation eval3 = service.calculer(126, 0, 0, false, false);
        assertEquals(0, eval3.score());
        assertEquals(Niveau.NORMAL, eval3.niveau());
    }

    @Test
    void retardRendezVousPlusDe30Jours() {
        // Retard > 30 jours donne +15 points
        Evaluation eval1 = service.calculer(135, 31, 0, false, false);
        assertEquals(15, eval1.score());
        assertEquals(Niveau.A_SURVEILLER, eval1.niveau());
        assertTrue(eval1.raisons().get(0).contains("Retard"));

        // Retard <= 30 jours ne donne pas de point
        Evaluation eval2 = service.calculer(135, 30, 0, false, false);
        assertEquals(0, eval2.score());
        assertEquals(Niveau.NORMAL, eval2.niveau());
    }

    @Test
    void rappelsSansReponseAvecPlafondA20() {
        // +5 par rappel, plafonné à 20
        assertEquals(5, service.calculer(140, 0, 1, false, false).score());
        assertEquals(10, service.calculer(140, 0, 2, false, false).score());
        assertEquals(15, service.calculer(140, 0, 3, false, false).score());
        assertEquals(20, service.calculer(140, 0, 4, false, false).score());
        assertEquals(20, service.calculer(140, 0, 5, false, false).score());
        assertEquals(20, service.calculer(140, 0, 10, false, false).score());
    }

    @Test
    void absencePoidsMesureDerniers60Jours() {
        // Absence de poids donne +10 points
        Evaluation eval = service.calculer(140, 0, 0, true, false);
        assertEquals(10, eval.score());
        assertEquals(Niveau.NORMAL, eval.niveau()); // score 10 < 15
        assertTrue(eval.raisons().get(0).contains("60 derniers jours"));
    }

    @Test
    void mereAdolescente() {
        // Mère adolescente donne +10 points
        Evaluation eval = service.calculer(140, 0, 0, false, true);
        assertEquals(10, eval.score());
        assertEquals(Niveau.NORMAL, eval.niveau());
        assertTrue(eval.raisons().get(0).contains("Mère adolescente"));
    }

    @Test
    void scoreCritiqueSuperieurOuEgalA60() {
        // MUAC < 115 (+40) + retard > 30j (+15) + absence pesée (+10) = 65 -> CRITIQUE
        Evaluation eval = service.calculer(105, 45, 0, true, false);
        assertEquals(65, eval.score());
        assertEquals(Niveau.CRITIQUE, eval.niveau());
        assertEquals("Référer immédiatement vers un centre de récupération nutritionnelle", eval.recommandation());
        assertEquals(3, eval.raisons().size());
    }

    @Test
    void cumulTousCriteres() {
        // MUAC < 115 (+40) + retard (+15) + 4 rappels (+20) + absence pesée (+10) + mère ado (+10) = 95
        Evaluation eval = service.calculer(100, 40, 4, true, true);
        assertEquals(95, eval.score());
        assertEquals(Niveau.CRITIQUE, eval.niveau());
        assertEquals(5, eval.raisons().size());
    }
}
