package tg.fildor.domain;

/** Comptages bruts par zone ; les pourcentages et le masquage sont calculés dans le service. */
public record ZoneBrute(String code, String nom, String region, double latitude, double longitude,
                        String couvertureReseau, int familles, int famillesSansTelephone,
                        int famillesSansReponse, int rdvRealises, int rdvManques,
                        int enfantsDeclarables, int enfantsDeclares, int famillesEveilEligibles,
                        int famillesEveilActives) {
}
