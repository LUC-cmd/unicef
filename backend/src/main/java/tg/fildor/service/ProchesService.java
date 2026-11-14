package tg.fildor.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.ProchesRepository;
import tg.fildor.repo.ProchesRepository.Proche;

/**
 * Proches informés : numéro relais (famille sans téléphone), père, grands-parents.
 * Ils ne reçoivent que des rappels généraux (« un rendez-vous approche »), sans nom d'enfant ni détail médical.
 * Il faut l'accord de la famille ET celui du proche ; ajout et retrait passent par l'agent.
 */
@Service
public class ProchesService {

    private final ProchesRepository proches;
    private final SuiviService suivi;
    private final TelephoneHasher hasher;
    private final AccesService acces;

    public ProchesService(ProchesRepository proches, SuiviService suivi, TelephoneHasher hasher, AccesService acces) {
        this.proches = proches;
        this.suivi = suivi;
        this.hasher = hasher;
        this.acces = acces;
    }

    public List<Proche> lister(AppUser u, String codeFamille) {
        long id = suivi.familleAutorisee(u, codeFamille);
        acces.tracer(u, "LISTER_PROCHES", codeFamille);
        return proches.lister(id);
    }

    public void ajouter(AppUser u, String codeFamille, String role, String telephone, boolean accordProche) {
        long id = suivi.familleAutorisee(u, codeFamille);
        if (!accordProche) {
            throw new IllegalArgumentException("Le proche doit avoir accepté de recevoir les rappels");
        }
        if (proches.compter(id) >= InscriptionService.MAX_PROCHES) {
            throw new IllegalArgumentException("Nombre maximum de proches atteint");
        }
        String hash = hasher.hash(telephone);
        if (proches.estTelephoneDeLaFamille(id, hash)) {
            throw new IllegalArgumentException("Le numéro d'un proche doit être différent de celui de la famille");
        }
        if (proches.existe(id, hash)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce proche est déjà enregistré");
        }
        proches.ajouter(id, role, hash);
        acces.tracer(u, "AJOUTER_PROCHE", codeFamille);
    }

    public void supprimer(AppUser u, String codeFamille, long contactId) {
        long id = suivi.familleAutorisee(u, codeFamille);
        if (!proches.supprimer(id, contactId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Proche introuvable");
        }
        acces.tracer(u, "SUPPRIMER_PROCHE", codeFamille);
    }
}
