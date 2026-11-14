package tg.fildor.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import tg.fildor.domain.Jeu;

/**
 * Choisit le jeu du jour d'un enfant selon son âge. Le choix est déterministe : sans état à stocker,
 * le téléphone, l'agent et le carnet imprimé proposent le même jeu au même enfant le même jour.
 */
public final class ChoixJeu {

    public static final int JEUX_PAR_SEMAINE = 7;

    private ChoixJeu() {
    }

    public static int ageEnMois(LocalDate naissance, LocalDate date) {
        return (int) Math.max(0, ChronoUnit.MONTHS.between(naissance, date));
    }

    public static LocalDate lundi(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /** Les jeux de la semaine (jusqu'à sept, un par jour) pour un enfant de cet âge. */
    public static List<Jeu> semaine(List<Jeu> tous, int ageMois, LocalDate date) {
        List<Jeu> eligibles = tous.stream()
                .filter(j -> ageMois >= j.ageMinMois() && ageMois <= j.ageMaxMois())
                .sorted(Comparator.comparingLong(Jeu::id))
                .toList();
        if (eligibles.isEmpty()) {
            return List.of();
        }
        int n = eligibles.size();
        int depart = (int) ((lundi(date).toEpochDay() / 7) % n);
        List<Jeu> semaine = new ArrayList<>();
        for (int i = 0; i < Math.min(JEUX_PAR_SEMAINE, n); i++) {
            semaine.add(eligibles.get((depart + i) % n));
        }
        return List.copyOf(semaine);
    }

    public static Optional<Jeu> duJour(List<Jeu> tous, int ageMois, LocalDate date) {
        List<Jeu> semaine = semaine(tous, ageMois, date);
        if (semaine.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(semaine.get((date.getDayOfWeek().getValue() - 1) % semaine.size()));
    }
}
