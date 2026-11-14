package tg.fildor.repo;

import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tg.fildor.domain.ZoneBrute;

@Repository
public class ZoneRepository {

    private final JdbcClient jdbc;

    public ZoneRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record ZonePublique(String code, String nom) {
    }

    /** Noms de zones seulement : le point d'écoute ne reçoit aucun chiffre sur les familles. */
    public List<ZonePublique> publiques() {
        return jdbc.sql("SELECT code, nom FROM zone ORDER BY nom")
                .query((rs, n) -> new ZonePublique(rs.getString("code"), rs.getString("nom")))
                .list();
    }

    public List<ZoneBrute> comptages(LocalDate aujourdhui) {
        return jdbc.sql("""
                SELECT z.code, z.nom, z.region, z.latitude, z.longitude, z.couverture_reseau,
                  (SELECT count(*) FROM famille f WHERE f.zone_id = z.id AND f.consentement) AS familles,
                  (SELECT count(*) FROM famille f WHERE f.zone_id = z.id AND f.consentement AND NOT f.a_telephone)
                      AS familles_sans_telephone,
                  (SELECT count(DISTINCT f.id) FROM famille f
                     JOIN enfant e ON e.famille_id = f.id
                     JOIN rendez_vous r ON r.enfant_id = e.id AND r.statut = 'MANQUE'
                     JOIN rappel ra ON ra.rendez_vous_id = r.id AND ra.statut = 'SANS_REPONSE'
                    WHERE f.zone_id = z.id AND f.consentement) AS familles_sans_reponse,
                  (SELECT count(*) FROM rendez_vous r JOIN enfant e ON e.id = r.enfant_id
                     JOIN famille f ON f.id = e.famille_id
                    WHERE f.zone_id = z.id AND f.consentement AND r.statut = 'REALISE') AS rdv_realises,
                  (SELECT count(*) FROM rendez_vous r JOIN enfant e ON e.id = r.enfant_id
                     JOIN famille f ON f.id = e.famille_id
                    WHERE f.zone_id = z.id AND f.consentement AND r.statut = 'MANQUE') AS rdv_manques,
                  (SELECT count(*) FROM enfant e JOIN famille f ON f.id = e.famille_id
                    WHERE f.zone_id = z.id AND f.consentement AND e.statut = 'ENFANT'
                      AND e.date_naissance <= CAST(:today AS DATE) - 45) AS enfants_declarables,
                  (SELECT count(*) FROM enfant e JOIN famille f ON f.id = e.famille_id
                     JOIN declaration_naissance d ON d.enfant_id = e.id AND d.statut IN ('ENVOYEE', 'VALIDEE')
                    WHERE f.zone_id = z.id AND f.consentement AND e.statut = 'ENFANT'
                      AND e.date_naissance <= CAST(:today AS DATE) - 45) AS enfants_declares,
                  (SELECT count(DISTINCT f.id) FROM famille f JOIN enfant e ON e.famille_id = f.id
                    WHERE f.zone_id = z.id AND f.consentement AND e.statut = 'ENFANT'
                      AND e.date_naissance > CAST(:today AS DATE) - INTERVAL '60 months') AS eveil_eligibles,
                  (SELECT count(DISTINCT f.id) FROM famille f JOIN enfant e ON e.famille_id = f.id
                     JOIN activite_eveil a ON a.enfant_id = e.id AND a.date_activite > CAST(:today AS DATE) - 7
                    WHERE f.zone_id = z.id AND f.consentement AND e.statut = 'ENFANT'
                      AND e.date_naissance > CAST(:today AS DATE) - INTERVAL '60 months') AS eveil_actives
                FROM zone z ORDER BY z.id""")
                .param("today", aujourdhui)
                .query((rs, n) -> new ZoneBrute(rs.getString("code"), rs.getString("nom"), rs.getString("region"),
                        rs.getDouble("latitude"), rs.getDouble("longitude"), rs.getString("couverture_reseau"),
                        rs.getInt("familles"), rs.getInt("familles_sans_telephone"), rs.getInt("familles_sans_reponse"),
                        rs.getInt("rdv_realises"), rs.getInt("rdv_manques"),
                        rs.getInt("enfants_declarables"), rs.getInt("enfants_declares"),
                        rs.getInt("eveil_eligibles"), rs.getInt("eveil_actives")))
                .list();
    }
}
