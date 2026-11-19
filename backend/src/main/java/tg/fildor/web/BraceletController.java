package tg.fildor.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.config.AppUser;
import tg.fildor.service.AccesService;
import tg.fildor.service.SuiviService;

/**
 * Bracelet du nouveau-né fragile (centre de santé). Fil d'Or marche sans lui : une mesure du bracelet suit le même chemin
 * qu'une mesure notée à la main. Les seuils sont des repères d'alerte à faire valider par l'équipe de santé.
 */
@RestController
public class BraceletController {

    public record Mesure(@NotNull @DecimalMin("30.0") @DecimalMax("43.0") BigDecimal temperature,
                         @NotNull @Min(40) @Max(250) Integer pouls) {
    }

    public record Ligne(OffsetDateTime le, BigDecimal temperature, int pouls, String source) {
    }

    public record Lecture(String niveau, List<String> messages, List<Ligne> mesures) {
    }

    private final JdbcClient jdbc;
    private final SuiviService suivi;
    private final AccesService acces;

    public BraceletController(JdbcClient jdbc, SuiviService suivi, AccesService acces) {
        this.jdbc = jdbc;
        this.suivi = suivi;
        this.acces = acces;
    }

    @GetMapping("/api/agent/enfants/{code}/bracelet")
    Lecture lire(@AuthenticationPrincipal AppUser u, @PathVariable String code) {
        return lecture(suivi.enfantAutorise(u, code).id());
    }

    @PostMapping("/api/agent/enfants/{code}/bracelet")
    Lecture noter(@AuthenticationPrincipal AppUser u, @PathVariable String code, @RequestBody @Valid Mesure m) {
        long id = suivi.enfantAutorise(u, code).id();
        jdbc.sql("INSERT INTO mesure_bracelet (enfant_id, temperature_c, pouls) VALUES (:e, :t, :p)")
                .param("e", id).param("t", m.temperature()).param("p", m.pouls()).update();
        acces.tracer(u, "MESURE_BRACELET", code);
        return lecture(id);
    }

    private Lecture lecture(long enfantId) {
        List<Ligne> l = jdbc.sql("""
                SELECT mesuree_le, temperature_c, pouls, source FROM mesure_bracelet
                WHERE enfant_id = :e ORDER BY mesuree_le DESC, id DESC LIMIT 8""")
                .param("e", enfantId)
                .query((rs, n) -> new Ligne(rs.getObject("mesuree_le", OffsetDateTime.class),
                        rs.getBigDecimal("temperature_c"), rs.getInt("pouls"), rs.getString("source")))
                .list();
        List<String> messages = new ArrayList<>();
        String niveau = "NORMAL";
        if (!l.isEmpty()) {
            Ligne d = l.get(0);
            if (d.temperature().compareTo(new BigDecimal("36.0")) < 0) {
                niveau = "URGENT";
                messages.add("Température basse : réchauffer le bébé peau contre peau et l'orienter le jour même vers le centre de santé.");
            } else if (d.temperature().compareTo(new BigDecimal("38.0")) >= 0) {
                niveau = "URGENT";
                messages.add("Fièvre chez un nouveau-né : l'orienter sans attendre vers le centre de santé.");
            } else if (d.temperature().compareTo(new BigDecimal("37.5")) > 0) {
                niveau = "A_CONTROLER";
                messages.add("Température un peu haute : la reprendre dans une heure.");
            }
            if (d.pouls() < 90 || d.pouls() > 180) {
                niveau = "URGENT";
                messages.add("Pouls en dehors des repères (90 à 180 par minute) : contrôler et orienter.");
            }
            if (messages.isEmpty()) {
                messages.add("Dernière mesure dans les repères. Reprendre la mesure à la prochaine visite.");
            }
        }
        return new Lecture(niveau, messages, l);
    }
}
