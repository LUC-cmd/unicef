package tg.fildor.service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Règles de validité d'une inscription (sans accès à la base : faciles à tester). */
public final class RegleInscription {

    /** Fil d'Or suit les enfants jusqu'à 5 ans ; petite marge pour ne pas refuser un enfant tout juste 5 ans. */
    public static final int AGE_MAX_JOURS = 5 * 366 + 60;
    public static final int GROSSESSE_MAX_JOURS = 300;
    public static final int ACCOUCHEMENT_RETARD_MAX_JOURS = 60;

    private RegleInscription() {
    }

    public static void validerEnfant(String statut, LocalDate dateNaissance, LocalDate dateTermePrevue,
                                     Integer consultationsFaites, List<Integer> etapesFaites, LocalDate aujourdhui) {
        if ("ENFANT".equals(statut)) {
            if (dateNaissance == null) {
                throw new IllegalArgumentException("La date de naissance est obligatoire");
            }
            if (dateNaissance.isAfter(aujourdhui)) {
                throw new IllegalArgumentException("La date de naissance est dans le futur");
            }
            if (dateNaissance.isBefore(aujourdhui.minusDays(AGE_MAX_JOURS))) {
                throw new IllegalArgumentException("Fil d'Or suit les enfants de 0 à 5 ans");
            }
            etapesValides(etapesFaites);
        } else {
            if (dateTermePrevue == null) {
                throw new IllegalArgumentException("La date prévue d'accouchement est obligatoire");
            }
            if (dateTermePrevue.isBefore(aujourdhui.minusDays(30))
                    || dateTermePrevue.isAfter(aujourdhui.plusDays(GROSSESSE_MAX_JOURS))) {
                throw new IllegalArgumentException("Date prévue d'accouchement invraisemblable");
            }
            if (consultationsFaites != null
                    && (consultationsFaites < 0 || consultationsFaites > PlanRendezVous.PRENATAL_JOURS_AVANT_TERME.length)) {
                throw new IllegalArgumentException("Nombre de consultations prénatales invalide");
            }
        }
    }

    public static Set<Integer> etapesValides(List<Integer> etapes) {
        Set<Integer> s = new HashSet<>();
        if (etapes != null) {
            for (Integer i : etapes) {
                if (i == null || i < 0 || i >= CalendrierVaccinal.ETAPES.size()) {
                    throw new IllegalArgumentException("Vaccin inconnu dans la liste des vaccins déjà faits");
                }
                s.add(i);
            }
        }
        return s;
    }
}
