package tg.fildor.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tg.fildor.repo.UserRepository;

/** Crée les comptes de démonstration absents au démarrage (fildor.comptes-demo=true). */
@Component
public class ComptesDemo implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(ComptesDemo.class);

    private record Compte(String username, String nom, String role, String zone, String structure) {
    }

    private static final java.util.List<Compte> COMPTES = java.util.List.of(
            new Compte("agent.golfe", "Agent de santé (Golfe)", "AGENT", "GOLFE", null),
            new Compte("agent.zio", "Agent de santé (Zio)", "AGENT", "ZIO", null),
            new Compte("agent.vo", "Agent de santé (Vo)", "AGENT", "VO", null),
            new Compte("mairie", "Agent d'état civil", "MAIRIE", null, null),
            new Compte("decideur", "Responsable régional", "DECIDEUR", null, null),
            new Compte("structure.golfe", "Centre de santé du Golfe", "STRUCTURE", null, "CS-GOLFE"),
            new Compte("structure.vo", "Centre de santé de Vo", "STRUCTURE", null, "CS-VO"),
            new Compte("creche.golfe", "Crèche communautaire du Golfe", "STRUCTURE", null, "CR-GOLFE"),
            new Compte("admin", "Administrateur", "ADMIN", null, null));

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final FilDorProperties props;

    public ComptesDemo(UserRepository users, PasswordEncoder encoder, FilDorProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.comptesDemo()) {
            return;
        }
        String hash = null;
        int crees = 0;
        for (Compte c : COMPTES) {
            if (users.parUsername(c.username()).isPresent()) {
                continue;
            }
            if (hash == null) {
                hash = encoder.encode(props.motDePasseDemo());
            }
            users.creer(c.username(), hash, c.nom(), c.role(), c.zone(), c.structure());
            crees++;
        }
        if (crees > 0) {
            LOG.warn("{} compte(s) de DÉMONSTRATION créé(s) (mot de passe du fichier de configuration). "
                    + "Ne pas utiliser en production.", crees);
        }
    }
}
