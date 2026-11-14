package tg.fildor.service;

/**
 * Classe le périmètre brachial (PB, au ruban) d'un enfant de 6 à 59 mois.
 * Seuils usuels de l'OMS : moins de 115 mm = malnutrition aiguë sévère, 115 à 124 mm = modérée.
 * Fil d'Or oriente vers un centre de santé : il ne pose pas de diagnostic.
 */
public final class MuacClassifier {

    public enum Classe { SEVERE, MODEREE, NORMALE, NON_MESURE }

    private MuacClassifier() {
    }

    public static Classe classer(Integer muacMm) {
        if (muacMm == null) {
            return Classe.NON_MESURE;
        }
        if (muacMm < 115) {
            return Classe.SEVERE;
        }
        if (muacMm < 125) {
            return Classe.MODEREE;
        }
        return Classe.NORMALE;
    }
}
