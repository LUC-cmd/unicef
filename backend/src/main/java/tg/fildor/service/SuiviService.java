package tg.fildor.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.Carnet;
import tg.fildor.domain.Dtos.CarnetEnfant;
import tg.fildor.domain.Dtos.EnfantFiche;
import tg.fildor.domain.Dtos.LigneVisite;
import tg.fildor.domain.Jeu;
import tg.fildor.domain.Priorite;
import tg.fildor.repo.AnnuaireRepository;
import tg.fildor.repo.DeclarationRepository;
import tg.fildor.repo.ProchesRepository;
import tg.fildor.repo.SuiviRepository;
import tg.fildor.repo.SuiviRepository.EnfantRef;
import tg.fildor.repo.SuiviRepository.LigneBrute;

/** Ce que voit l'agent de santé : sa liste de visites priorisée, la fiche d'un enfant, le carnet d'une famille. */
@Service
public class SuiviService {

    private final SuiviRepository suivi;
    private final DeclarationRepository declarations;
    private final PrioriteService priorites;
    private final AccesService acces;
    private final EveilService eveil;
    private final AnnuaireRepository annuaire;
    private final ProchesRepository proches;

    public SuiviService(SuiviRepository suivi, DeclarationRepository declarations, PrioriteService priorites,
                        AccesService acces, EveilService eveil, AnnuaireRepository annuaire,
                        ProchesRepository proches) {
        this.suivi = suivi;
        this.declarations = declarations;
        this.priorites = priorites;
        this.acces = acces;
        this.eveil = eveil;
        this.annuaire = annuaire;
        this.proches = proches;
    }

    public List<LigneVisite> listeDeVisites(AppUser u, LocalDate aujourdhui) {
        return suivi.lignesBrutes(u.zoneId(), null, aujourdhui).stream()
                .map(l -> new LigneVisite(l.codeEnfant(), l.codeFamille(), l.zone(), l.porte(), l.statut(),
                        l.dateNaissance(), l.prochainRdv(), priorites.calculer(l.indicateurs(), aujourdhui)))
                .sorted(Comparator.comparingInt((LigneVisite l) -> l.priorite().score()).reversed()
                        .thenComparing(LigneVisite::codeEnfant))
                .toList();
    }

    public EnfantFiche fiche(AppUser u, String codeEnfant, LocalDate aujourdhui) {
        EnfantRef e = enfantAutorise(u, codeEnfant);
        acces.tracer(u, "CONSULTER_ENFANT", codeEnfant);
        LigneBrute l = suivi.lignesBrutes(null, codeEnfant, aujourdhui).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enfant introuvable ou sans consentement"));
        Priorite p = priorites.calculer(l.indicateurs(), aujourdhui);
        var eveilEnfant = "ENFANT".equals(e.statut()) && e.dateNaissance() != null
                && ChoixJeu.ageEnMois(e.dateNaissance(), aujourdhui) < 60
                ? eveil.pourEnfant(e.codeEnfant(), e.id(), e.dateNaissance(), aujourdhui, eveil.catalogue())
                : null;
        return new EnfantFiche(e.codeEnfant(), e.codeFamille(), e.zone(), e.porte(), e.langue(), e.statut(),
                e.dateNaissance(), e.dateTermePrevue(), p, suivi.rendezVous(e.id()), suivi.dernieresVisites(e.id(), 10),
                declarations.parEnfant(e.id()).orElse(null), eveilEnfant, annuaire.demandesDeFamille(e.familleId()),
                proches.compter(e.familleId()), suivi.mereAdolescente(e.familleId()));
    }

    public Carnet carnet(AppUser u, String codeFamille, LocalDate aujourdhui) {
        long zone = suivi.zoneDeFamille(codeFamille)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Famille introuvable"));
        verifierZone(u, zone);
        long familleId = suivi.familleId(codeFamille).orElseThrow();
        acces.tracer(u, "CONSULTER_CARNET", codeFamille);
        String langue = suivi.languesFamille(codeFamille).orElse("fr");
        String nomZone = suivi.nomZoneDeFamille(codeFamille).orElse("");
        List<Jeu> catalogue = eveil.catalogue();
        List<CarnetEnfant> enfants = suivi.carnetEnfants(familleId).stream()
                .map(c -> new CarnetEnfant(c.codeEnfant(), c.statut(), c.dateNaissance(), c.dateTermePrevue(),
                        c.rendezVous(),
                        "ENFANT".equals(c.statut()) && c.dateNaissance() != null
                                ? ChoixJeu.semaine(catalogue, ChoixJeu.ageEnMois(c.dateNaissance(), aujourdhui), aujourdhui)
                                : List.of()))
                .toList();
        return new Carnet(codeFamille, nomZone, langue, enfants, suivi.codeCarte(codeFamille).orElse(null));
    }

    /** Retrouve la famille par son code et vérifie que l'agent a le droit de la voir (même zone). */
    public long familleAutorisee(AppUser u, String codeFamille) {
        long zone = suivi.zoneDeFamille(codeFamille)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Famille introuvable"));
        verifierZone(u, zone);
        return suivi.familleId(codeFamille).orElseThrow();
    }

    /** Retrouve l'enfant et vérifie que l'agent a le droit de le voir (même zone ; l'administrateur voit tout). */
    public EnfantRef enfantAutorise(AppUser u, String codeEnfant) {
        EnfantRef e = suivi.trouverEnfant(codeEnfant)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enfant introuvable"));
        verifierZone(u, e.zoneId());
        return e;
    }

    private static void verifierZone(AppUser u, long zoneId) {
        if (u.zoneId() != null && u.zoneId() != zoneId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cet enfant n'est pas dans votre zone");
        }
    }
}
