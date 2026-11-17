package tg.fildor.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.repo.RappelRepository;
import tg.fildor.repo.RappelRepository.Identite;

/**
 * Connexion simple d'une famille : le numéro de téléphone et le code famille (écrit sur sa carte de famille).
 * Un proche ne peut pas se connecter. Le message d'erreur est le même quel que soit le motif, pour ne rien révéler.
 */
@Component
public class AccesFamille {

    private final TelephoneHasher hasher;
    private final RappelRepository rappels;

    public AccesFamille(TelephoneHasher hasher, RappelRepository rappels) {
        this.hasher = hasher;
        this.rappels = rappels;
    }

    public Identite verifier(String telephone, String codeFamille) {
        String code = codeFamille == null ? "" : codeFamille.trim();
        Identite i = rappels.identiteParTelephone(hasher.hash(telephone)).orElse(null);
        if (i == null || i.estProche() || !i.consentement() || !i.codeFamille().equalsIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Numéro ou code famille incorrect");
        }
        return i;
    }
}
