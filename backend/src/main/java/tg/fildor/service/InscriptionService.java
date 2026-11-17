package tg.fildor.service;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.InscriptionRepository;
import tg.fildor.repo.InscriptionRepository.FamilleCodes;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * Inscription d'une famille par l'agent de santé, avec l'accord de la famille (obligatoire).
 * Elle marche hors ligne : l'identifiant créé sur le téléphone de l'agent évite tout doublon à la synchronisation,
 * et les codes famille et enfant sont attribués par le serveur au retour du réseau.
 * Toutes les vérifications ont lieu AVANT la moindre écriture, et les écritures dans une seule transaction.
 */
@Service
public class InscriptionService {

    public static final int MAX_ENFANTS = 10;
    public static final int MAX_PROCHES = 5;
    private static final int ACCOUCHEMENT_RETARD_MAX_JOURS = RegleInscription.ACCOUCHEMENT_RETARD_MAX_JOURS;

    public record EnfantInscrit(
            @NotBlank @Pattern(regexp = "GROSSESSE|ENFANT") String statut,
            LocalDate dateNaissance,
            LocalDate dateTermePrevue,
            @Pattern(regexp = "F|M") String sexe,
            List<Integer> etapesFaites,
            Integer consultationsFaites,
            @Valid Parents parents) {
    }

    /** Identité prise aux consultations prénatales. Chaque nom, chaque information n'est gardé qu'avec l'accord de la personne. */
    public record Parents(
            @Size(max = 120) String mereNom,
            @Size(max = 120) String conjointNom,
            @Pattern(regexp = "CARTE_ELECTEUR|CNI|PASSEPORT|CARTE_SANTE|AUCUNE") String pieceType,
            @Size(max = 40) String pieceNumero,
            @Size(max = 40) String nationaliteMere,
            @Size(max = 40) String nationaliteConjoint,
            boolean accordMere,
            boolean accordConjoint) {
    }

    public record ContactInscrit(
            @NotBlank @Pattern(regexp = "RELAIS|PERE|GRAND_PARENT|AUTRE_PROCHE") String role,
            @NotBlank String telephone,
            boolean consentement) {
    }

    public record InscriptionRequest(
            @NotNull UUID clientUuid,
            String codeZone,
            @NotBlank @Pattern(regexp = "fr|ewe|kabye|tem") String langue,
            @NotBlank @Pattern(regexp = "VOIX_SMS|AGENT|CARNET|POINT_ECOUTE") String porte,
            String telephone,
            boolean consentement,
            @NotEmpty @Size(max = MAX_ENFANTS) @Valid List<EnfantInscrit> enfants,
            @Size(max = MAX_PROCHES) @Valid List<ContactInscrit> contacts) {
    }

    public record InscriptionResultat(UUID clientUuid, boolean creee, String codeFamille, List<String> codesEnfants) {
    }

    public record AccouchementRequest(@NotNull LocalDate dateNaissance, List<Integer> etapesFaites) {
    }

    private final InscriptionRepository repo;
    private final SuiviService suivi;
    private final TelephoneHasher hasher;
    private final AccesService acces;
    private final TransactionTemplate tx;

    public InscriptionService(InscriptionRepository repo, SuiviService suivi, TelephoneHasher hasher,
                              AccesService acces, TransactionTemplate tx) {
        this.repo = repo;
        this.suivi = suivi;
        this.hasher = hasher;
        this.acces = acces;
        this.tx = tx;
    }

    // ------------------------------------------------------------------ inscription d'une famille

    public InscriptionResultat inscrire(AppUser u, InscriptionRequest r, LocalDate aujourdhui) {
        var existante = repo.parClientUuid(r.clientUuid());
        if (existante.isPresent()) {
            FamilleCodes c = existante.get();
            return new InscriptionResultat(r.clientUuid(), false, c.codeFamille(), c.codesEnfants());
        }

        long zoneId = zoneDe(u, r.codeZone());
        if (!r.consentement()) {
            throw new IllegalArgumentException("L'accord de la famille est obligatoire pour l'inscrire");
        }
        String hashFamille = null;
        if (r.telephone() != null && !r.telephone().isBlank()) {
            hashFamille = hasher.hash(r.telephone());
            if (repo.telephoneExiste(hashFamille)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce numéro est déjà enregistré pour une famille");
            }
        } else if ("VOIX_SMS".equals(r.porte())) {
            throw new IllegalArgumentException("La porte « voix et SMS » demande un numéro de téléphone");
        }
        if (r.enfants() == null || r.enfants().isEmpty()) {
            throw new IllegalArgumentException("Au moins un enfant ou une grossesse est nécessaire");
        }
        for (EnfantInscrit e : r.enfants()) {
            validerEnfant(e, aujourdhui);
        }
        List<String> hashProches = validerProches(r.contacts(), hashFamille);

        final String hashTel = hashFamille;
        InscriptionResultat resultat = tx.execute(status -> {
            long id = repo.prochainIdFamille();
            String codeFamille = "F-" + String.format("%04d", id);
            repo.creerFamille(id, codeFamille, zoneId, r.langue(), r.porte(), hashTel != null, hashTel, r.clientUuid());
            List<String> codes = new ArrayList<>();
            for (EnfantInscrit e : r.enfants()) {
                codes.add(ecrireEnfant(id, e, aujourdhui, u.id()));
            }
            for (int i = 0; i < hashProches.size(); i++) {
                repo.creerContact(id, r.contacts().get(i).role(), hashProches.get(i));
            }
            return new InscriptionResultat(r.clientUuid(), true, codeFamille, List.copyOf(codes));
        });
        acces.tracer(u, "INSCRIRE_FAMILLE", resultat.codeFamille());
        return resultat;
    }

    /** Ajoute un enfant ou une nouvelle grossesse à une famille déjà inscrite. */
    public List<String> ajouterEnfant(AppUser u, String codeFamille, EnfantInscrit e, LocalDate aujourdhui) {
        long familleId = suivi.familleAutorisee(u, codeFamille);
        validerEnfant(e, aujourdhui);
        List<String> existants = repo.codesEnfants(familleId);
        if (existants.size() >= MAX_ENFANTS) {
            throw new IllegalArgumentException("Nombre maximum d'enfants atteint pour cette famille");
        }
        String code = tx.execute(status -> ecrireEnfant(familleId, e, aujourdhui, u.id()));
        acces.tracer(u, "AJOUTER_ENFANT", code);
        return List.of(code);
    }

    // ------------------------------------------------------------------ naissance d'une grossesse

    /**
     * La grossesse suivie devient un enfant né. Renvoie true si c'est nouveau, false si ce même accouchement
     * avait déjà été enregistré (synchronisation rejouée).
     */
    public boolean accoucher(AppUser u, String codeEnfant, AccouchementRequest r, LocalDate aujourdhui) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        if ("ENFANT".equals(e.statut())) {
            if (r.dateNaissance().equals(e.dateNaissance())) {
                return false;
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet enfant est déjà enregistré comme né");
        }
        if (r.dateNaissance().isAfter(aujourdhui)) {
            throw new IllegalArgumentException("La date de naissance est dans le futur");
        }
        if (r.dateNaissance().isBefore(aujourdhui.minusDays(ACCOUCHEMENT_RETARD_MAX_JOURS))) {
            throw new IllegalArgumentException("Naissance de plus de 60 jours : à vérifier avec l'agent référent");
        }
        Set<Integer> etapes = etapesValides(r.etapesFaites());
        tx.executeWithoutResult(status -> {
            repo.convertirEnEnfant(e.id(), r.dateNaissance());
            repo.supprimerConsultationsPrenatalesAVenir(e.id());
            for (PlanRendezVous.Prevu p : PlanRendezVous.vaccins(r.dateNaissance(), etapes, aujourdhui)) {
                repo.creerRendezVous(e.id(), p);
            }
        });
        acces.tracer(u, "NAISSANCE_ENREGISTREE", codeEnfant);
        return true;
    }

    // ------------------------------------------------------------------ retrait du consentement

    public void retirerConsentement(AppUser u, String codeFamille) {
        long familleId = suivi.familleAutorisee(u, codeFamille);
        tx.executeWithoutResult(status -> repo.retirerConsentement(familleId));
        acces.tracer(u, "RETRAIT_CONSENTEMENT", codeFamille);
    }

    // ------------------------------------------------------------------ vérifications

    private long zoneDe(AppUser u, String codeZone) {
        if (u.zoneId() != null) {
            return u.zoneId();
        }
        if (codeZone == null || codeZone.isBlank()) {
            throw new IllegalArgumentException("Précisez la zone de la famille");
        }
        return repo.zoneIdParCode(codeZone)
                .orElseThrow(() -> new IllegalArgumentException("Zone inconnue : " + codeZone));
    }

    static void validerEnfant(EnfantInscrit e, LocalDate aujourdhui) {
        RegleInscription.validerEnfant(e.statut(), e.dateNaissance(), e.dateTermePrevue(), e.consultationsFaites(),
                e.etapesFaites(), aujourdhui);
    }

    static Set<Integer> etapesValides(List<Integer> etapes) {
        return RegleInscription.etapesValides(etapes);
    }

    /** Vérifie les proches et renvoie leurs hash, dans le même ordre. */
    private List<String> validerProches(List<ContactInscrit> contacts, String hashFamille) {
        List<String> hashs = new ArrayList<>();
        if (contacts == null) {
            return hashs;
        }
        Set<String> vus = new HashSet<>();
        for (ContactInscrit c : contacts) {
            if (!c.consentement()) {
                throw new IllegalArgumentException("Le proche doit avoir accepté de recevoir les rappels");
            }
            String h = hasher.hash(c.telephone());
            if (h.equals(hashFamille)) {
                throw new IllegalArgumentException("Le numéro d'un proche doit être différent de celui de la famille");
            }
            if (!vus.add(h)) {
                throw new IllegalArgumentException("Le même numéro est indiqué deux fois");
            }
            hashs.add(h);
        }
        return hashs;
    }

    // ------------------------------------------------------------------ écriture

    /** Crée l'enfant et son plan de rendez-vous. Le code est « T » + numéro de famille + première lettre libre. */
    private String ecrireEnfant(long familleId, EnfantInscrit e, LocalDate aujourdhui, long userId) {
        Set<String> pris = new HashSet<>(repo.codesEnfants(familleId));
        String prefixe = "T" + String.format("%03d", familleId);
        String code = null;
        for (char lettre = 'A'; lettre <= 'Z'; lettre++) {
            if (!pris.contains(prefixe + lettre)) {
                code = prefixe + lettre;
                break;
            }
        }
        if (code == null) {
            throw new IllegalStateException("Plus de code enfant disponible pour cette famille");
        }
        boolean ne = "ENFANT".equals(e.statut());
        long enfantId = repo.creerEnfant(familleId, code, e.statut(), ne ? e.dateNaissance() : null,
                ne ? null : e.dateTermePrevue(), e.sexe());
        List<PlanRendezVous.Prevu> plan = ne
                ? PlanRendezVous.vaccins(e.dateNaissance(), etapesValides(e.etapesFaites()), aujourdhui)
                : PlanRendezVous.prenatal(e.dateTermePrevue(),
                        e.consultationsFaites() == null ? 0 : e.consultationsFaites(), aujourdhui);
        plan.forEach(p -> repo.creerRendezVous(enfantId, p));
        if (e.parents() != null) {
            repo.enregistrerParents(enfantId, e.parents(), userId);
        }
        return code;
    }
}
