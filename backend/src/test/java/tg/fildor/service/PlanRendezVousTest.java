package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PlanRendezVousTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 14);

    @Test
    void nouveauNeTousLesVaccinsSontAVenirSaufLaNaissance() {
        var plan = PlanRendezVous.vaccins(AUJOURDHUI, Set.of(), AUJOURDHUI);
        assertEquals(5, plan.size());
        assertEquals("PLANIFIE", plan.get(0).statut()); // le jour même n'est pas encore « passé »
        assertEquals("PLANIFIE", plan.get(4).statut());
    }

    @Test
    void enfantDeHuitMoisSansCarnetDeSanteLesVaccinsPassesSontManques() {
        LocalDate naissance = AUJOURDHUI.minusMonths(8);
        var plan = PlanRendezVous.vaccins(naissance, Set.of(), AUJOURDHUI);
        assertEquals("MANQUE", plan.get(0).statut());
        assertEquals("MANQUE", plan.get(3).statut());
        assertEquals("PLANIFIE", plan.get(4).statut()); // rougeole à 9 mois : à venir
    }

    @Test
    void lesEtapesVuesSurLeCarnetSontRealisees() {
        LocalDate naissance = AUJOURDHUI.minusMonths(8);
        var plan = PlanRendezVous.vaccins(naissance, Set.of(0, 1, 2), AUJOURDHUI);
        assertEquals("REALISE", plan.get(0).statut());
        assertEquals(naissance, plan.get(0).dateRealisation());
        assertEquals("REALISE", plan.get(2).statut());
        assertEquals("MANQUE", plan.get(3).statut());
    }

    @Test
    void uneEtapeFuturePrecocheeResteAVenir() {
        var plan = PlanRendezVous.vaccins(AUJOURDHUI.minusDays(10), Set.of(4), AUJOURDHUI);
        assertEquals("PLANIFIE", plan.get(4).statut());
    }

    @Test
    void grosseessePremiereConsultationsFaitesLesSuivantesManquees() {
        LocalDate terme = AUJOURDHUI.plusDays(70); // il reste 70 jours : -150 et -100 sont passées
        var plan = PlanRendezVous.prenatal(terme, 1, AUJOURDHUI);
        assertEquals("REALISE", plan.get(0).statut());
        assertEquals("MANQUE", plan.get(1).statut());
        assertEquals("PLANIFIE", plan.get(2).statut()); // terme - 60 = dans 10 jours
        assertEquals("PLANIFIE", plan.get(3).statut());
    }

    @Test
    void grossesseDebutToutEstAVenir() {
        var plan = PlanRendezVous.prenatal(AUJOURDHUI.plusDays(250), 0, AUJOURDHUI);
        assertEquals(4, plan.size());
        assertEquals(0L, plan.stream().filter(p -> !p.statut().equals("PLANIFIE")).count());
    }
}
