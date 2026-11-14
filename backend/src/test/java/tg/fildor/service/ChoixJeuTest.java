package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import tg.fildor.domain.Jeu;

class ChoixJeuTest {

    private static Jeu jeu(long id, int min, int max) {
        return new Jeu(id, "J" + id, "Jeu " + id, "consigne", "aucun", min, max, true);
    }

    private final List<Jeu> catalogue = new ArrayList<>(List.of(
            jeu(1, 0, 5), jeu(2, 0, 5), jeu(3, 0, 8), jeu(4, 6, 18), jeu(5, 6, 18), jeu(6, 6, 18),
            jeu(7, 6, 36), jeu(8, 6, 36), jeu(9, 6, 36), jeu(10, 24, 60), jeu(11, 6, 36), jeu(12, 6, 36)));

    private static final LocalDate LUNDI = LocalDate.of(2026, 11, 9);

    @Test
    void lundiDeLaSemaine() {
        assertEquals(LUNDI, ChoixJeu.lundi(LocalDate.of(2026, 11, 15)));
        assertEquals(LUNDI, ChoixJeu.lundi(LUNDI));
    }

    @Test
    void ageEnMoisCalendaire() {
        assertEquals(8, ChoixJeu.ageEnMois(LocalDate.of(2026, 3, 14), LocalDate.of(2026, 11, 14)));
        assertEquals(7, ChoixJeu.ageEnMois(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 11, 14)));
        assertEquals(0, ChoixJeu.ageEnMois(LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 14)));
    }

    @Test
    void neProposeQueLesJeuxDeSonAge() {
        var s = ChoixJeu.semaine(catalogue, 2, LUNDI);
        assertEquals(3, s.size());
        assertTrue(s.stream().allMatch(j -> j.ageMinMois() <= 2 && j.ageMaxMois() >= 2));
    }

    @Test
    void jusquASeptJeuxDistinctsParSemaine() {
        var s = ChoixJeu.semaine(catalogue, 10, LUNDI);
        assertEquals(7, s.size());
        assertEquals(7, new HashSet<>(s).size());
    }

    @Test
    void memeJourMemeEnfantMemeJeu() {
        var a = ChoixJeu.duJour(catalogue, 10, LocalDate.of(2026, 11, 12)).orElseThrow();
        var b = ChoixJeu.duJour(catalogue, 10, LocalDate.of(2026, 11, 12)).orElseThrow();
        assertEquals(a, b);
    }

    @Test
    void unJeuDifferentChaqueJourDeLaSemaine() {
        var jours = new HashSet<Long>();
        for (int i = 0; i < 7; i++) {
            jours.add(ChoixJeu.duJour(catalogue, 10, LUNDI.plusDays(i)).orElseThrow().id());
        }
        assertEquals(7, jours.size());
    }

    @Test
    void laSemaineChangeLaSemaineSuivante() {
        var cette = ChoixJeu.semaine(catalogue, 10, LUNDI);
        var suivante = ChoixJeu.semaine(catalogue, 10, LUNDI.plusDays(7));
        assertTrue(!cette.equals(suivante));
    }

    @Test
    void aucunJeuHorsTranche() {
        assertTrue(ChoixJeu.semaine(catalogue, 70, LUNDI).isEmpty());
        assertTrue(ChoixJeu.duJour(catalogue, 70, LUNDI).isEmpty());
    }
}
