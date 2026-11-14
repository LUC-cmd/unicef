package tg.fildor.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Plan de rendez-vous créé à l'inscription d'un enfant ou à la naissance d'une grossesse.
 * Ce qui est déjà passé et que l'agent n'a pas pu voir sur le carnet de santé devient « manqué » :
 * l'enfant remonte dans la liste de l'agent pour un rattrapage. Calendriers indicatifs, à valider avec le PEV.
 */
public final class PlanRendezVous {

    public record Prevu(String type, String libelle, LocalDate date, String statut, LocalDate dateRealisation) {
    }

    /** Consultations prénatales : jours avant le terme. */
    public static final int[] PRENATAL_JOURS_AVANT_TERME = {150, 100, 60, 30};

    private PlanRendezVous() {
    }

    /**
     * @param etapesFaites indices (dans CalendrierVaccinal.ETAPES) des vaccins vus sur le carnet de santé
     */
    public static List<Prevu> vaccins(LocalDate naissance, Set<Integer> etapesFaites, LocalDate aujourdhui) {
        List<Prevu> plan = new ArrayList<>();
        List<CalendrierVaccinal.Etape> etapes = CalendrierVaccinal.ETAPES;
        for (int i = 0; i < etapes.size(); i++) {
            LocalDate date = naissance.plusDays(etapes.get(i).joursApresNaissance());
            boolean passe = date.isBefore(aujourdhui);
            if (etapesFaites != null && etapesFaites.contains(i) && !date.isAfter(aujourdhui)) {
                plan.add(new Prevu("VACCIN", etapes.get(i).libelle(), date, "REALISE", date));
            } else if (passe) {
                plan.add(new Prevu("VACCIN", etapes.get(i).libelle(), date, "MANQUE", null));
            } else {
                plan.add(new Prevu("VACCIN", etapes.get(i).libelle(), date, "PLANIFIE", null));
            }
        }
        return plan;
    }

    /** Les premières consultations passées (dans l'ordre) sont les consultations déjà faites. */
    public static List<Prevu> prenatal(LocalDate termePrevu, int consultationsFaites, LocalDate aujourdhui) {
        List<Prevu> plan = new ArrayList<>();
        int restantes = Math.max(0, consultationsFaites);
        for (int jours : PRENATAL_JOURS_AVANT_TERME) {
            LocalDate date = termePrevu.minusDays(jours);
            if (!date.isBefore(aujourdhui)) {
                plan.add(new Prevu("CONSULTATION_PRENATALE", "Consultation prénatale", date, "PLANIFIE", null));
            } else if (restantes > 0) {
                restantes--;
                plan.add(new Prevu("CONSULTATION_PRENATALE", "Consultation prénatale", date, "REALISE", date));
            } else {
                plan.add(new Prevu("CONSULTATION_PRENATALE", "Consultation prénatale", date, "MANQUE", null));
            }
        }
        return plan;
    }
}
