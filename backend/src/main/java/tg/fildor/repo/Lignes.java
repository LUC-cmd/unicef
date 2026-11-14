package tg.fildor.repo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Petites aides de lecture JDBC pour les colonnes nullables. */
final class Lignes {
    private Lignes() {
    }

    static LocalDate date(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, LocalDate.class);
    }

    static OffsetDateTime horodatage(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, OffsetDateTime.class);
    }

    static Integer entier(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, Integer.class);
    }
}
