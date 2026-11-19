package tg.fildor.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tg.fildor.service.TelephoneHasher;

/**
 * Les familles de démonstration (F-0001 à F-0045, numéros 90000001 à 90000045) ont été créées avec le poivre par défaut.
 * Quand le serveur utilise un autre poivre (variable FILDOR_PEPPER), leurs numéros ne correspondaient plus et l'espace
 * famille de démonstration refusait l'entrée. Au démarrage, on recalcule donc ces empreintes avec le poivre en vigueur.
 * Rien n'est lu ni écrit pour les familles réelles : seuls les codes de démonstration sont concernés.
 */
@Component
public class TelephonesDemo implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(TelephonesDemo.class);

    private final JdbcClient jdbc;
    private final TelephoneHasher hasher;
    private final FilDorProperties props;

    public TelephonesDemo(JdbcClient jdbc, TelephoneHasher hasher, FilDorProperties props) {
        this.jdbc = jdbc;
        this.hasher = hasher;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.comptesDemo()) {
            return;
        }
        int maj = 0;
        for (int i = 1; i <= 45; i++) {
            String code = String.format("F-%04d", i);
            String numero = String.format("9000%04d", i);
            maj += jdbc.sql("UPDATE famille SET telephone_hash = :h WHERE code_famille = :c AND a_telephone = TRUE "
                    + "AND telephone_hash IS DISTINCT FROM :h")
                    .param("h", hasher.hash(numero)).param("c", code).update();
        }
        String[][] proches = {{"F-0001", "91000001"}, {"F-0002", "91000002"}, {"F-0046", "91000046"}};
        for (String[] p : proches) {
            maj += jdbc.sql("UPDATE contact_famille SET telephone_hash = :h WHERE famille_id = "
                    + "(SELECT id FROM famille WHERE code_famille = :c) AND telephone_hash IS DISTINCT FROM :h")
                    .param("h", hasher.hash(p[1])).param("c", p[0]).update();
        }
        if (maj > 0) {
            LOG.info("{} numéro(s) de démonstration ré-alignés sur le poivre en vigueur.", maj);
        }
    }
}
