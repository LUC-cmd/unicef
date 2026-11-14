package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CalendrierVaccinalTest {

    @Test
    void datesRelativesALaNaissance() {
        var rdv = CalendrierVaccinal.pour(LocalDate.of(2026, 1, 1));
        assertEquals(5, rdv.size());
        assertEquals(LocalDate.of(2026, 1, 1), rdv.get(0).date());
        assertEquals(LocalDate.of(2026, 2, 12), rdv.get(1).date());
        assertEquals(LocalDate.of(2026, 10, 2), rdv.get(4).date());
    }
}
