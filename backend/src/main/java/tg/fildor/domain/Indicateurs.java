package tg.fildor.domain;

import java.time.LocalDate;

/** Ce que l'on sait d'un enfant à un instant donné, avant de calculer sa priorité de visite. */
public record Indicateurs(
        String statut,                 // GROSSESSE ou ENFANT
        LocalDate dateNaissance,       // null pendant la grossesse
        int rdvManques,
        int retardMaxJours,
        int rappelsSansReponse,
        Integer dernierMuacMm,         // périmètre brachial en mm, null si jamais mesuré
        String statutDeclaration,      // null si aucune déclaration de naissance
        boolean familleSansTelephone) {
}
