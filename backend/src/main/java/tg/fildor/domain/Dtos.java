package tg.fildor.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** Objets échangés avec le front. Jamais de nom, d'adresse ni de téléphone en clair. */
public final class Dtos {

    private Dtos() {
    }

    public record RendezVousDto(long id, String type, String libelle, LocalDate datePrevue, String statut,
                                LocalDate dateRealisation) {
    }

    public record VisiteDto(LocalDate dateVisite, Integer muacMm, Integer poidsG, boolean signesDanger) {
    }

    public record DeclarationDto(long id, String codeEnfant, String statut, String lieuNaissance,
                                 boolean certificatAccouchement, String numeroRecu, OffsetDateTime envoyeeLe,
                                 boolean dansDelaiGratuit, String motifRejet, LocalDate dateNaissance, String zone) {
    }

    public record LigneVisite(String codeEnfant, String codeFamille, String zone, String porte, String statut,
                              LocalDate dateNaissance, LocalDate prochainRdv, Priorite priorite) {
    }

    public record EnfantFiche(String codeEnfant, String codeFamille, String zone, String porte, String langue,
                              String statut, LocalDate dateNaissance, LocalDate dateTermePrevue,
                              Priorite priorite, List<RendezVousDto> rendezVous, List<VisiteDto> visites,
                              DeclarationDto declaration, EveilEnfant eveil, List<DemandeDto> demandes,
                              int nombreProches) {
    }

    public record Carnet(String codeFamille, String zone, String langue, List<CarnetEnfant> enfants, String codeCarte) {
    }

    public record CarnetEnfant(String codeEnfant, String statut, LocalDate dateNaissance, LocalDate dateTermePrevue,
                               List<RendezVousDto> rendezVous, List<Jeu> jeuxDeLaSemaine) {
    }

    public record StatsZone(String code, String nom, String region, double latitude, double longitude,
                            String couvertureReseau, int familles, boolean masquee, Integer tauxSuiviPct,
                            Integer tauxNaissancesDeclareesPct, Integer famillesSansReponse,
                            Integer famillesSansTelephone, Integer indiceOubli, Integer tauxEveilPct) {
    }

    public record MessageContenu(String sujet, String langueDemandee, String langueEffective, String titre,
                                 String texte, boolean aValider, String avertissement) {
    }

    /** type : RAPPEL, JEU, REPONSE_STRUCTURE ou RAPPEL_GENERAL (proche). statut : ENVOYE, ACQUITTE, SANS_REPONSE ou INFO. */
    public record SmsRecu(long id, String type, String message, OffsetDateTime envoyeLe, String statut) {
    }

    /** Ce que l'on sait d'un numéro de téléphone : famille ou proche (sans jamais renvoyer de détail sur la famille). */
    public record Profil(String profil, String roleProche, String langue) {
    }

    public record MessagesRecus(Profil profil, List<SmsRecu> messages) {
    }

    public record StructureDto(String code, String type, String nom, String zone, String telephone, String horaires,
                               String services, boolean besoinsSpecifiques, boolean actif,
                               OffsetDateTime miseAJourLe) {
    }

    public record DemandeDto(long id, String codeStructure, String nomStructure, String codeFamille, String zone,
                             String langue, String motif, String origine, String statut, String reponse,
                             OffsetDateTime creeLe) {
    }

    /** Éveil d'un enfant : le jeu du jour et la semaine, plus ce qui a déjà été fait. */
    public record EveilEnfant(String codeEnfant, int ageMois, Jeu jeuDuJour, boolean faitAujourdhui,
                              List<Jeu> jeuxDeLaSemaine, List<LocalDate> joursFaits) {
    }
}
