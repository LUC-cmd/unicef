package tg.fildor.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.config.FilDorProperties;
import tg.fildor.service.AccesService;

/**
 * Volet « filles et jeunes mères » du tableau du responsable régional. Comptages seulement, jamais de nom :
 * une zone trop petite pour garantir l'anonymat est masquée.
 */
@RestController
public class FillesImpactController {

    public record Zone(String zone, boolean masquee, Long jeunesMeres, Long adosEnceintes, Long bebesJeunesMeres,
                       Long jeunesMeresRdvManques, Long filles, Long garcons, Long fillesRdvManques,
                       Long garconsRdvManques, Long fillesSansActe) {
    }

    public record Synthese(long jeunesMeres, long adosEnceintes, long bebesJeunesMeres, long jeunesMeresRdvManques,
                           long filles, long garcons, long fillesRdvManques, long garconsRdvManques,
                           long fillesSansActe, List<Zone> zones) {
    }

    private final JdbcClient jdbc;
    private final AccesService acces;
    private final FilDorProperties props;
    private final Clock clock;

    public FillesImpactController(JdbcClient jdbc, AccesService acces, FilDorProperties props, Clock clock) {
        this.jdbc = jdbc;
        this.acces = acces;
        this.props = props;
        this.clock = clock;
    }

    private record Brut(String zone, long familles, long jm, long ae, long bjm, long jmm, long f, long g, long fm,
                        long gm, long fsa) {
    }

    @GetMapping("/api/decideur/filles")
    Synthese lire(@AuthenticationPrincipal AppUser u) {
        acces.tracer(u, "CONSULTER_FILLES", null);
        String region = "DECIDEUR".equals(u.role()) ? u.region() : null;
        String manque = " EXISTS (SELECT 1 FROM rendez_vous r WHERE r.enfant_id = e.id AND r.statut = 'MANQUE') ";
        List<Brut> l = jdbc.sql("""
                SELECT z.nom AS zone,
                  (SELECT count(*) FROM famille ff WHERE ff.zone_id = z.id AND ff.consentement) AS familles,
                  count(DISTINCT f.id) FILTER (WHERE f.mere_adolescente) AS jm,
                  count(*) FILTER (WHERE f.mere_adolescente AND e.statut = 'GROSSESSE') AS ae,
                  count(*) FILTER (WHERE f.mere_adolescente AND e.statut = 'ENFANT'
                        AND e.date_naissance > CAST(:auj AS DATE) - 365) AS bjm,
                  count(*) FILTER (WHERE f.mere_adolescente AND """ + manque + """
                        ) AS jmm,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.sexe = 'F') AS f,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.sexe = 'M') AS g,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.sexe = 'F' AND """ + manque + """
                        ) AS fm,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.sexe = 'M' AND """ + manque + """
                        ) AS gm,
                  count(*) FILTER (WHERE e.statut = 'ENFANT' AND e.sexe = 'F'
                        AND e.date_naissance < CAST(:auj AS DATE) - 45 AND d.id IS NULL AND e.acte_externe IS NULL) AS fsa
                FROM zone z
                JOIN famille f ON f.zone_id = z.id AND f.consentement
                JOIN enfant e ON e.famille_id = f.id
                LEFT JOIN declaration_naissance d ON d.enfant_id = e.id
                WHERE (CAST(:region AS VARCHAR) IS NULL OR z.region = CAST(:region AS VARCHAR))
                GROUP BY z.id, z.nom ORDER BY z.nom""")
                .param("auj", LocalDate.now(clock)).param("region", region)
                .query((rs, n) -> new Brut(rs.getString("zone"), rs.getLong("familles"), rs.getLong("jm"),
                        rs.getLong("ae"), rs.getLong("bjm"), rs.getLong("jmm"), rs.getLong("f"), rs.getLong("g"),
                        rs.getLong("fm"), rs.getLong("gm"), rs.getLong("fsa")))
                .list();
        List<Zone> zones = l.stream().map(b -> b.familles() < props.seuilAnonymat()
                ? new Zone(b.zone(), true, null, null, null, null, null, null, null, null, null)
                : new Zone(b.zone(), false, b.jm(), b.ae(), b.bjm(), b.jmm(), b.f(), b.g(), b.fm(), b.gm(), b.fsa()))
                .toList();
        return new Synthese(l.stream().mapToLong(Brut::jm).sum(), l.stream().mapToLong(Brut::ae).sum(),
                l.stream().mapToLong(Brut::bjm).sum(), l.stream().mapToLong(Brut::jmm).sum(),
                l.stream().mapToLong(Brut::f).sum(), l.stream().mapToLong(Brut::g).sum(),
                l.stream().mapToLong(Brut::fm).sum(), l.stream().mapToLong(Brut::gm).sum(),
                l.stream().mapToLong(Brut::fsa).sum(), zones);
    }
}
