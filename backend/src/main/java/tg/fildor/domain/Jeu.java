package tg.fildor.domain;

/** Un jeu d'éveil à faire à la maison avec des objets du quotidien. */
public record Jeu(long id, String code, String titre, String consigne, String materiel, int ageMinMois,
                  int ageMaxMois, boolean aValider) {
}
