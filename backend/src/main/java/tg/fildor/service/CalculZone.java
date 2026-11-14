package tg.fildor.service;

import tg.fildor.domain.Dtos.StatsZone;
import tg.fildor.domain.ZoneBrute;

/** Calcul pur des indicateurs d'une zone (sans accès à la base, donc facile à tester). */
final class CalculZone {

    private CalculZone() {
    }

    static StatsZone calculer(ZoneBrute z, int seuilAnonymat) {
        if (z.familles() < seuilAnonymat) {
            return new StatsZone(z.code(), z.nom(), z.region(), z.latitude(), z.longitude(), z.couvertureReseau(),
                    z.familles(), true, null, null, null, null, null, null);
        }
        int suiviTotal = z.rdvRealises() + z.rdvManques();
        Double suivi = suiviTotal == 0 ? null : (double) z.rdvRealises() / suiviTotal;
        Double naissances = z.enfantsDeclarables() == 0 ? null : (double) z.enfantsDeclares() / z.enfantsDeclarables();
        Integer eveil = z.famillesEveilEligibles() == 0 ? null
                : (int) Math.round(100.0 * z.famillesEveilActives() / z.famillesEveilEligibles());
        double partSansReponse = (double) z.famillesSansReponse() / z.familles();

        // Indice d'oubli de 0 (bien suivie) à 100 (oubliée) : suivi 50 %, naissances 30 %, rappels sans réponse 20 %.
        // Une zone sans aucune donnée est comptée comme oubliée : ne rien savoir d'une zone est déjà un signal.
        double indice = 100 * (0.5 * (1 - (suivi == null ? 0 : suivi))
                + 0.3 * (1 - (naissances == null ? 0 : naissances))
                + 0.2 * partSansReponse);
        return new StatsZone(z.code(), z.nom(), z.region(), z.latitude(), z.longitude(), z.couvertureReseau(),
                z.familles(), false,
                suivi == null ? null : (int) Math.round(suivi * 100),
                naissances == null ? null : (int) Math.round(naissances * 100),
                z.famillesSansReponse(), z.famillesSansTelephone(), (int) Math.round(indice), eveil);
    }
}
