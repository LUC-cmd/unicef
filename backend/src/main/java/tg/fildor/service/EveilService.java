package tg.fildor.service;

import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.domain.Dtos.EveilEnfant;
import tg.fildor.domain.Jeu;
import tg.fildor.repo.EveilRepository;
import tg.fildor.repo.EveilRepository.EnfantEveil;
import tg.fildor.repo.MessageRepository;
import tg.fildor.repo.MessageRepository.CibleJeu;

/**
 * Éveil : un jeu par jour avec des objets de la maison, choisi selon l'âge (même jeu au téléphone,
 * sur la fiche de l'agent et dans le carnet imprimé). La famille note « fait » ; Fil d'Or mesure la part
 * de familles qui jouent chaque semaine.
 */
@Service
public class EveilService {

    private static final Logger LOG = LoggerFactory.getLogger(EveilService.class);

    private final EveilRepository eveil;
    private final MessageRepository messages;

    public EveilService(EveilRepository eveil, MessageRepository messages) {
        this.eveil = eveil;
        this.messages = messages;
    }

    public List<Jeu> catalogue() {
        return eveil.tousLesJeux();
    }

    /** Éveil d'un enfant né à une date donnée. */
    public EveilEnfant pourEnfant(String codeEnfant, long enfantId, LocalDate naissance, LocalDate aujourdhui,
                                  List<Jeu> catalogue) {
        int age = ChoixJeu.ageEnMois(naissance, aujourdhui);
        List<Jeu> semaine = ChoixJeu.semaine(catalogue, age, aujourdhui);
        Jeu jour = ChoixJeu.duJour(catalogue, age, aujourdhui).orElse(null);
        LocalDate lundi = ChoixJeu.lundi(aujourdhui);
        List<LocalDate> faits = eveil.joursFaits(enfantId, lundi, aujourdhui);
        return new EveilEnfant(codeEnfant, age, jour, faits.contains(aujourdhui), semaine, faits);
    }

    public List<EveilEnfant> pourFamille(long familleId, LocalDate aujourdhui) {
        List<Jeu> catalogue = eveil.tousLesJeux();
        return eveil.enfantsNes(familleId).stream()
                .filter(e -> ChoixJeu.ageEnMois(e.dateNaissance(), aujourdhui) < 60)
                .map(e -> pourEnfant(e.code(), e.id(), e.dateNaissance(), aujourdhui, catalogue))
                .toList();
    }

    /** La famille dit « on l'a fait » pour le jeu du jour de cet enfant. */
    public boolean noterFait(long familleId, String codeEnfant, LocalDate aujourdhui) {
        EnfantEveil e = eveil.enfantsNes(familleId).stream().filter(x -> x.code().equals(codeEnfant)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enfant introuvable pour cette famille"));
        int age = ChoixJeu.ageEnMois(e.dateNaissance(), aujourdhui);
        Jeu jeu = ChoixJeu.duJour(eveil.tousLesJeux(), age, aujourdhui)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pas de jeu pour cet âge"));
        return eveil.noterFait(e.id(), jeu.id(), aujourdhui);
    }

    /**
     * Envoie le jeu de la semaine par SMS (simulé), une fois par famille et par semaine.
     * Appelé par le cycle quotidien : si un jour est manqué, le lendemain rattrape.
     */
    public int envoyerJeuxDeLaSemaine(LocalDate aujourdhui) {
        List<Jeu> catalogue = eveil.tousLesJeux();
        LocalDate lundi = ChoixJeu.lundi(aujourdhui);
        int envoyes = 0;
        for (CibleJeu c : messages.ciblesJeuHebdomadaire(aujourdhui)) {
            int age = ChoixJeu.ageEnMois(c.naissanceDuPlusJeune(), aujourdhui);
            List<Jeu> semaine = ChoixJeu.semaine(catalogue, age, aujourdhui);
            if (semaine.isEmpty()) {
                continue;
            }
            String texte = "Fil d'Or : jeu de la semaine pour votre enfant de " + age + " mois : « "
                    + semaine.get(0).titre() + " ». Appelez Fil d'Or pour le jeu du jour.";
            if (messages.ajouterJeuDeLaSemaine(c.familleId(), texte, lundi)) {
                envoyes++;
            }
        }
        LOG.info("Jeux de la semaine du {} : {} message(s)", lundi, envoyes);
        return envoyes;
    }
}
