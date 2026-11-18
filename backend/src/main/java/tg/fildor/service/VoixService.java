package tg.fildor.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.domain.Dtos.EveilEnfant;
import tg.fildor.domain.Dtos.MessageContenu;
import tg.fildor.domain.Dtos.MessagesRecus;
import tg.fildor.domain.Dtos.Profil;
import tg.fildor.domain.Dtos.StructureDto;
import tg.fildor.repo.AlerteRepository;
import tg.fildor.repo.ContenuRepository;
import tg.fildor.repo.RappelRepository;
import tg.fildor.repo.RappelRepository.Identite;

/**
 * Simulateur de la porte « voix et SMS » : ce que la famille (ou un proche) entend quand elle appelle,
 * et les SMS qu'elle reçoit. Aucun appel n'est enregistré. Tout contenu de santé informe et oriente : jamais de diagnostic.
 * Un proche (numéro relais, père, grand-parent) n'a accès qu'aux informations générales et aux rappels généraux.
 */
@Service
public class VoixService {

    public static final Set<String> SUJETS = Set.of("GROSSESSE", "NOUVEAU_NE", "ALLAITEMENT", "VACCINS", "NUTRITION",
            "HYGIENE", "NAISSANCE", "EVEIL", "DANGER");
    public static final Set<String> LANGUES = Set.of("fr", "ewe", "kabye", "tem");

    private final TelephoneHasher hasher;
    private final RappelRepository rappels;
    private final ContenuRepository contenus;
    private final EveilService eveil;
    private final AnnuaireService annuaire;
    private final AlerteRepository alertes;
    private final Clock clock;

    public VoixService(TelephoneHasher hasher, RappelRepository rappels, ContenuRepository contenus,
                       EveilService eveil, AnnuaireService annuaire, AlerteRepository alertes, Clock clock) {
        this.hasher = hasher;
        this.rappels = rappels;
        this.contenus = contenus;
        this.eveil = eveil;
        this.annuaire = annuaire;
        this.alertes = alertes;
        this.clock = clock;
    }

    public Profil profil(String telephone) {
        Identite i = identite(telephone);
        return new Profil(i.estProche() ? "PROCHE" : "FAMILLE", i.roleProche(), i.langue());
    }

    public MessageContenu ecouter(String telephone, String sujet, String langue) {
        Identite f = identite(telephone);
        String sujetNorm = sujet == null ? "" : sujet.toUpperCase();
        if (!SUJETS.contains(sujetNorm)) {
            throw new IllegalArgumentException("Sujet inconnu");
        }
        if (langue != null && !langue.isBlank() && !LANGUES.contains(langue)) {
            throw new IllegalArgumentException("Langue inconnue");
        }
        String demandee = langue == null || langue.isBlank() ? f.langue() : langue;
        var contenu = contenus.trouver(sujetNorm, demandee);
        String avertissement = null;
        if (contenu.isEmpty()) {
            contenu = contenus.trouver(sujetNorm, "fr");
            avertissement = "Voix en " + demandee + " pas encore enregistrée : message lu en français. "
                    + "Les voix en éwé, kabyè et tem sont à enregistrer avec des locuteurs natifs.";
        }
        var c = contenu.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contenu indisponible"));
        return new MessageContenu(sujetNorm, demandee, c.langue(), c.titre(), c.texte(), c.aValider(), avertissement);
    }

    public MessagesRecus messages(String telephone) {
        Identite i = identite(telephone);
        Profil profil = new Profil(i.estProche() ? "PROCHE" : "FAMILLE", i.roleProche(), i.langue());
        return new MessagesRecus(profil, i.estProche()
                ? rappels.messagesDuProche(i.contactIds())
                : rappels.messagesDeLaFamille(i.familleId()));
    }

    public void repondreOk(String telephone, long rappelId) {
        Identite f = famille(telephone);
        if (!rappels.acquitter(rappelId, f.familleId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "SMS introuvable ou déjà confirmé");
        }
    }

    /** Appel manqué : la famille ne paie rien, Fil d'Or la rappelle. */
    public void appelManque(String telephone) {
        identite(telephone);
        rappels.enregistrerAppelManque(hasher.hash(telephone));
    }

    /**
     * Mode urgence (*789*3# ou bouton « urgence ») : prévient l'agent de la zone, même si le numéro
     * n'est pas (encore) connu de Fil d'Or — l'alerte est alors visible par l'administrateur.
     * Aucun appel n'est passé, aucun diagnostic n'est posé : l'agent décide sur place.
     */
    public void urgence(String telephone, String motif) {
        String hash = hasher.hash(telephone);
        String m = motif == null || motif.isBlank() ? "URGENCE" : motif.trim();
        if (m.length() > 200) m = m.substring(0, 200);
        var identite = rappels.identiteParTelephone(hash);
        alertes.creer(identite.map(Identite::familleId).orElse(null), hash, m);
    }

    // ------------------------------------------------------------------ éveil (famille seulement)

    public List<EveilEnfant> jeuDuJour(String telephone) {
        return eveil.pourFamille(famille(telephone).familleId(), LocalDate.now(clock));
    }

    public void jeuFait(String telephone, String codeEnfant) {
        eveil.noterFait(famille(telephone).familleId(), codeEnfant, LocalDate.now(clock));
    }

    // ------------------------------------------------------------------ annuaire (famille seulement)

    public List<StructureDto> structuresProches(String telephone, String type) {
        return annuaire.procheDeLaFamille(famille(telephone).familleId(), type);
    }

    public void demanderStructure(String telephone, String codeStructure, String motif) {
        annuaire.demanderParFamille(famille(telephone).familleId(), codeStructure, motif);
    }

    // ------------------------------------------------------------------ identification

    private Identite identite(String telephone) {
        Identite f = rappels.identiteParTelephone(hasher.hash(telephone))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Ce numéro n'est pas enregistré dans Fil d'Or"));
        if (!f.consentement()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La famille n'a pas donné son accord");
        }
        return f;
    }

    /** Réservé au téléphone de la famille : un proche ne voit ni les jeux, ni l'annuaire personnalisé, ni les confirmations. */
    private Identite famille(String telephone) {
        Identite i = identite(telephone);
        if (i.estProche()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Cette fonction est réservée au téléphone de la famille");
        }
        return i;
    }
}
