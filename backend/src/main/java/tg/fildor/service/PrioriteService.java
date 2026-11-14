package tg.fildor.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import tg.fildor.domain.Indicateurs;
import tg.fildor.domain.Niveau;
import tg.fildor.domain.Priorite;

/**
 * Calcule la place d'un enfant dans la liste de visites de l'agent de santé.
 * Règle centrale du projet : un rappel resté sans réponse fait monter la famille dans la liste.
 * Les raisons sont toujours renvoyées avec le score, pour que l'agent comprenne pourquoi.
 */
@Service
public class PrioriteService {

    public Priorite calculer(Indicateurs i, LocalDate aujourdhui) {
        int score = 0;
        List<String> raisons = new ArrayList<>();

        switch (MuacClassifier.classer(i.dernierMuacMm())) {
            case SEVERE -> {
                score += 50;
                raisons.add("Périmètre brachial très bas (" + i.dernierMuacMm() + " mm) : à orienter vers le centre de santé");
            }
            case MODEREE -> {
                score += 30;
                raisons.add("Périmètre brachial bas (" + i.dernierMuacMm() + " mm) : à suivre de près");
            }
            default -> {
            }
        }

        if (i.rappelsSansReponse() > 0) {
            score += Math.min(25 + 5 * (i.rappelsSansReponse() - 1), 40);
            raisons.add(i.rappelsSansReponse() == 1
                    ? "Un rappel est resté sans réponse"
                    : i.rappelsSansReponse() + " rappels sont restés sans réponse");
        }

        if (i.rdvManques() > 0) {
            score += Math.min(15 * i.rdvManques(), 45);
            raisons.add(i.rdvManques() == 1
                    ? "Un rendez-vous ou vaccin manqué"
                    : i.rdvManques() + " rendez-vous ou vaccins manqués");
            if (i.retardMaxJours() > 30) {
                score += 10;
                raisons.add("Retard de plus de 30 jours");
            }
        }

        if ("ENFANT".equals(i.statut()) && i.dateNaissance() != null && declarationAbsente(i.statutDeclaration())) {
            long age = ChronoUnit.DAYS.between(i.dateNaissance(), aujourdhui);
            if (age > 45) {
                score += 25;
                raisons.add("Naissance non déclarée, délai gratuit de 45 jours dépassé");
            } else if (age > 30) {
                score += 20;
                raisons.add("Naissance non déclarée, il reste " + (45 - age) + " jour(s) de délai gratuit");
            }
        }

        if (i.familleSansTelephone() && score > 0) {
            score += 5;
            raisons.add("Famille sans téléphone : seule la visite peut l'atteindre");
        }

        Niveau niveau = score >= 60 ? Niveau.URGENT : score >= 30 ? Niveau.PRIORITAIRE : Niveau.NORMAL;
        return new Priorite(score, niveau, List.copyOf(raisons));
    }

    private static boolean declarationAbsente(String statut) {
        return statut == null || "BROUILLON".equals(statut) || "REJETEE".equals(statut);
    }
}
