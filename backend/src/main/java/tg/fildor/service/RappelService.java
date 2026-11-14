package tg.fildor.service;

import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tg.fildor.config.FilDorProperties;
import tg.fildor.repo.MessageRepository;
import tg.fildor.repo.RappelRepository;

/**
 * Cycle quotidien : marque les rendez-vous manqués, repère les rappels restés sans réponse
 * (la famille remonte alors dans la liste de l'agent) et prépare les rappels des deux prochains jours.
 * Les SMS sont ici simulés (écrits en base) : l'envoi réel dépend d'un accord avec un opérateur.
 */
@Service
public class RappelService {

    private static final Logger LOG = LoggerFactory.getLogger(RappelService.class);

    public record Cycle(int rendezVousManques, int rappelsSansReponse, int rappelsCrees, int rappelsAuxProches,
                        int jeuxEnvoyes) {
    }

    private static final String MESSAGE_PROCHE =
            "Fil d'Or : un rendez-vous de santé approche pour un enfant de la famille. "
                    + "Le détail est donné par l'agent de santé.";

    private final RappelRepository rappels;
    private final MessageRepository messages;
    private final EveilService eveil;
    private final FilDorProperties props;

    public RappelService(RappelRepository rappels, MessageRepository messages, EveilService eveil,
                         FilDorProperties props) {
        this.rappels = rappels;
        this.messages = messages;
        this.eveil = eveil;
        this.props = props;
    }

    @Transactional
    public Cycle executerCycle(LocalDate aujourdhui) {
        int manques = rappels.marquerManques(aujourdhui);
        int sansReponse = rappels.marquerSansReponse(aujourdhui);
        int crees = rappels.creerRappelsAVenir(aujourdhui);
        int proches = messages.rappelsGenerauxAuxProches(aujourdhui, aujourdhui.plusDays(2), MESSAGE_PROCHE);
        int jeux = eveil.envoyerJeuxDeLaSemaine(aujourdhui);
        LOG.info("Cycle des rappels du {} : {} manqués, {} sans réponse, {} créés, {} aux proches, {} jeux",
                aujourdhui, manques, sansReponse, crees, proches, jeux);
        return new Cycle(manques, sansReponse, crees, proches, jeux);
    }

    @Scheduled(cron = "0 0 6 * * *")
    void cycleQuotidien() {
        if (props.cycleRappelsActif()) {
            executerCycle(LocalDate.now());
        }
    }
}
