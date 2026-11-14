package tg.fildor.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.DeclarationDto;
import tg.fildor.repo.DeclarationRepository;
import tg.fildor.repo.DeclarationRepository.ContexteFamille;
import tg.fildor.repo.MessageRepository;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * Déclaration de naissance lancée par l'agent ou l'accoucheuse, validée à distance par la mairie.
 * Gratuite dans les 45 jours (depuis le 01/01/2022) ; au-delà : jugement supplétif à 6 000 FCFA.
 * Le reçu horodaté est une preuve d'envoi : sa valeur légale reste à confirmer avec l'état civil.
 */
@Service
public class NaissanceService {

    public static final int DELAI_GRATUIT_JOURS = 45;

    public record Resultat(boolean creee, DeclarationDto declaration) {
    }

    private final DeclarationRepository declarations;
    private final SuiviService suivi;
    private final AccesService acces;
    private final MessageRepository messages;

    public NaissanceService(DeclarationRepository declarations, SuiviService suivi, AccesService acces,
                            MessageRepository messages) {
        this.declarations = declarations;
        this.suivi = suivi;
        this.acces = acces;
        this.messages = messages;
    }

    // Pas de @Transactional ici : appelée dans la synchronisation, une exception rattrapée marquerait sinon
    // toute la transaction de synchronisation comme à annuler. L'insertion est atomique à elle seule.
    public Resultat declarer(AppUser u, String codeEnfant, String lieu, boolean certificat, LocalDate aujourdhui) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        if (!"ENFANT".equals(e.statut()) || e.dateNaissance() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cet enfant n'est pas encore né");
        }
        if (e.dateNaissance().isAfter(aujourdhui)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date de naissance dans le futur");
        }
        boolean dansDelai = ChronoUnit.DAYS.between(e.dateNaissance(), aujourdhui) <= DELAI_GRATUIT_JOURS;
        String recu = "FDO-" + aujourdhui.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + String.format("%06d", e.id());
        boolean creee = declarations.creer(e.id(), lieu, certificat, recu, dansDelai);
        acces.tracer(u, creee ? "DECLARER_NAISSANCE" : "DECLARATION_DEJA_ENVOYEE", codeEnfant);
        DeclarationDto d = declarations.parEnfant(e.id()).orElseThrow();
        return new Resultat(creee, d);
    }

    public java.util.List<DeclarationDto> lister(AppUser u, String statut) {
        acces.tracer(u, "LISTER_DECLARATIONS", statut == null ? "toutes" : statut);
        return declarations.lister(statut);
    }

    @Transactional
    public String valider(AppUser u, long id) {
        if (!declarations.traiter(id, "VALIDEE", u.id(), null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Déclaration introuvable ou déjà traitée");
        }
        acces.tracer(u, "VALIDER_DECLARATION", String.valueOf(id));
        return prevenir(id, true, null);
    }

    @Transactional
    public String rejeter(AppUser u, long id, String motif) {
        if (motif == null || motif.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un motif de rejet est obligatoire");
        }
        String motifNet = motif.strip();
        if (!declarations.traiter(id, "REJETEE", u.id(), motifNet)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Déclaration introuvable ou déjà traitée");
        }
        acces.tracer(u, "REJETER_DECLARATION", String.valueOf(id));
        return prevenir(id, false, motifNet);
    }

    /** SMS simulé vers le téléphone de la famille. Sans téléphone, l'agent voit le résultat sur la fiche. */
    private String prevenir(long id, boolean validee, String motif) {
        ContexteFamille c = declarations.contexte(id).orElse(null);
        if (c == null || !c.consentement() || !c.aTelephone()) {
            return validee
                    ? "Déclaration validée. Pas de téléphone : l'agent verra le résultat sur la fiche."
                    : "Déclaration rejetée. Pas de téléphone : l'agent verra le motif sur la fiche.";
        }
        String texte = validee
                ? "Fil d'Or : la mairie a enregistré la déclaration de naissance de l'enfant " + c.codeEnfant()
                        + ". Gardez le reçu. Ce message n'est pas encore l'acte de naissance."
                : "Fil d'Or : la mairie n'a pas validé la déclaration de l'enfant " + c.codeEnfant()
                        + ". Motif : " + motif + ". L'agent de santé vous aidera à corriger.";
        messages.ajouterPourFamille(c.familleId(), "NAISSANCE", texte);
        return validee
                ? "Déclaration validée. Un SMS part vers la famille."
                : "Déclaration rejetée. Un SMS part vers la famille.";
    }
}
