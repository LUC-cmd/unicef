package tg.fildor.service;

import java.time.LocalDate;
import java.util.List;

/**
 * Calendrier vaccinal INDICATIF de l'enfant de 0 à 9 mois.
 * À valider avec le Programme élargi de vaccination (PEV) du ministère de la Santé avant tout usage réel.
 */
public final class CalendrierVaccinal {

    public record Etape(String libelle, int joursApresNaissance) {
    }

    public static final List<Etape> ETAPES = List.of(
            new Etape("BCG et polio 0 (naissance)", 0),
            new Etape("Penta 1, pneumo 1, polio 1, rota 1", 42),
            new Etape("Penta 2, pneumo 2, polio 2, rota 2", 70),
            new Etape("Penta 3, pneumo 3, polio 3, VPI", 98),
            new Etape("Rougeole-rubéole et fièvre jaune", 274));

    public record RendezVousPrevu(String libelle, LocalDate date) {
    }

    private CalendrierVaccinal() {
    }

    public static List<RendezVousPrevu> pour(LocalDate naissance) {
        return ETAPES.stream()
                .map(e -> new RendezVousPrevu(e.libelle(), naissance.plusDays(e.joursApresNaissance())))
                .toList();
    }
}
