package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import tg.fildor.service.MuacClassifier.Classe;

class MuacClassifierTest {

    @Test
    void seuilsOms() {
        assertEquals(Classe.NON_MESURE, MuacClassifier.classer(null));
        assertEquals(Classe.SEVERE, MuacClassifier.classer(114));
        assertEquals(Classe.MODEREE, MuacClassifier.classer(115));
        assertEquals(Classe.MODEREE, MuacClassifier.classer(124));
        assertEquals(Classe.NORMALE, MuacClassifier.classer(125));
    }
}
