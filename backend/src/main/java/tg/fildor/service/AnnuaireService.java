package tg.fildor.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.domain.Dtos.DemandeDto;
import tg.fildor.domain.Dtos.StructureDto;
import tg.fildor.repo.AnnuaireRepository;
import tg.fildor.repo.AnnuaireRepository.DemandeRef;
import tg.fildor.repo.AnnuaireRepository.StructureRef;
import tg.fildor.repo.MessageRepository;

/**
 * Annuaire des structures (santé, crèches, centres sociaux, état civil) et demandes des familles.
 * La structure ne voit jamais le numéro de la famille : elle voit un code famille, une zone et une langue.
 * Elle répond par un choix simple ; Fil d'Or prévient la famille par SMS (avec le numéro public de la structure).
 */
@Service
public class AnnuaireService {

    public record MiseAJour(@Size(max = 30) String telephone, @Size(max = 120) String horaires,
                            @Size(max = 300) String services, boolean besoinsSpecifiques, boolean actif) {
    }

    public record Reponse(@NotBlank @Pattern(regexp = "RDV_PROPOSE|PAS_DE_PLACE|AUTRE_STRUCTURE") String reponse) {
    }

    private final AnnuaireRepository annuaire;
    private final MessageRepository messages;
    private final SuiviService suivi;
    private final AccesService acces;

    public AnnuaireService(AnnuaireRepository annuaire, MessageRepository messages, SuiviService suivi,
                           AccesService acces) {
        this.annuaire = annuaire;
        this.messages = messages;
        this.suivi = suivi;
        this.acces = acces;
    }

    // ------------------------------------------------------------------ côté public et agent

    public List<StructureDto> lister(String codeZone, String type, boolean seulementBesoinsSpecifiques) {
        return annuaire.lister(codeZone, type, seulementBesoinsSpecifiques);
    }

    /** Structures de la zone de l'agent (l'administrateur voit toutes les zones). */
    public List<StructureDto> pourAgent(AppUser u, String type) {
        if (u.zoneId() != null) {
            return annuaire.listerParZoneId(u.zoneId(), type);
        }
        return annuaire.lister(null, type, false);
    }

    public List<StructureDto> procheDeLaFamille(long familleId, String type) {
        long zone = annuaire.zoneDeLaFamille(familleId).orElseThrow();
        return annuaire.listerParZoneId(zone, type);
    }

    /** Demande faite par la famille elle-même (au téléphone). */
    public void demanderParFamille(long familleId, String codeStructure, String motif) {
        creerDemande(familleId, codeStructure, motif, "FAMILLE");
    }

    /** Demande faite par l'agent pour une famille de sa zone (par exemple une famille sans téléphone). */
    public void demanderParAgent(AppUser u, String codeFamille, String codeStructure, String motif) {
        long familleId = suivi.familleAutorisee(u, codeFamille);
        creerDemande(familleId, codeStructure, motif, "AGENT");
        acces.tracer(u, "ORIENTER_FAMILLE", codeFamille + " -> " + codeStructure);
    }

    public List<DemandeDto> demandesDeFamille(long familleId) {
        return annuaire.demandesDeFamille(familleId);
    }

    private void creerDemande(long familleId, String codeStructure, String motif, String origine) {
        if (!"RAPPEL".equals(motif) && !"ORIENTATION".equals(motif)) {
            throw new IllegalArgumentException("Motif inconnu");
        }
        StructureRef s = annuaire.parCode(codeStructure)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Structure introuvable"));
        long zoneFamille = annuaire.zoneDeLaFamille(familleId).orElseThrow();
        if (zoneFamille != s.zoneId()) {
            throw new IllegalArgumentException("Cette structure n'est pas dans la zone de la famille");
        }
        if (!annuaire.creerDemande(s.id(), familleId, motif, origine)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Une demande est déjà ouverte auprès de cette structure");
        }
    }

    // ------------------------------------------------------------------ console de la structure

    private static long structureDe(AppUser u) {
        if (u.structureId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce compte n'est rattaché à aucune structure");
        }
        return u.structureId();
    }

    public StructureDto maStructure(AppUser u) {
        return annuaire.maStructure(structureDe(u))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Structure introuvable"));
    }

    public StructureDto mettreAJour(AppUser u, MiseAJour m) {
        long id = structureDe(u);
        annuaire.mettreAJour(id, m.telephone(), m.horaires(), m.services(), m.besoinsSpecifiques(), m.actif());
        acces.tracer(u, "METTRE_A_JOUR_STRUCTURE", String.valueOf(id));
        return maStructure(u);
    }

    public List<DemandeDto> demandes(AppUser u, String statut) {
        acces.tracer(u, "LISTER_DEMANDES", statut == null ? "toutes" : statut);
        return annuaire.demandesDeStructure(structureDe(u), statut);
    }

    public void repondre(AppUser u, long demandeId, String reponse) {
        long structureId = structureDe(u);
        DemandeRef d = annuaire.demandeParId(demandeId)
                .filter(x -> x.structureId() == structureId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable"));
        if (!annuaire.repondre(d.id(), structureId, reponse, u.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Demande déjà traitée");
        }
        StructureRef s = annuaire.parId(structureId).orElseThrow();
        if (annuaire.familleJoignableParSms(d.familleId())) {
            messages.ajouterPourFamille(d.familleId(), "REPONSE_STRUCTURE", texteReponse(reponse, s));
        }
        acces.tracer(u, "REPONDRE_DEMANDE", String.valueOf(demandeId));
    }

    static String texteReponse(String reponse, StructureRef s) {
        return switch (reponse) {
            case "RDV_PROPOSE" -> "Fil d'Or : " + s.nom() + " vous attend. Appelez le " + nonNul(s.telephone())
                    + " (" + nonNul(s.horaires()) + ") pour fixer l'heure.";
            case "PAS_DE_PLACE" -> "Fil d'Or : " + s.nom() + " n'a pas de place pour le moment. "
                    + "Votre agent de santé vous aidera à trouver une autre structure.";
            default -> "Fil d'Or : " + s.nom() + " vous conseille une autre structure. "
                    + "Votre agent de santé vous le dira à sa prochaine visite.";
        };
    }

    private static String nonNul(String s) {
        return s == null || s.isBlank() ? "numéro non renseigné" : s;
    }
}
