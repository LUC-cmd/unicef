package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.repo.SuiviRepository;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * Orchestration de la synchronisation hors ligne : idempotence côté service, isolement des erreurs,
 * ordre des écritures. La garantie SQL (ON CONFLICT DO NOTHING) est vérifiée contre un vrai PostgreSQL
 * dans SyncServiceIntegrationTest.
 */
class SyncServiceTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 18);

    private final SuiviRepository suivi = mock(SuiviRepository.class);
    private final SuiviService suiviService = mock(SuiviService.class);
    private final NaissanceService naissances = mock(NaissanceService.class);
    private final AccesService acces = mock(AccesService.class);
    private final InscriptionService inscriptions = mock(InscriptionService.class);
    private final SyncService service = new SyncService(suivi, suiviService, naissances, acces, inscriptions);

    private final AppUser agent = new AppUser(7L, "agent.vo", "", "Agent Démo", "AGENT", 4L, null, true, null);

    private static EnfantRef enfant() {
        return new EnfantRef(42L, 10L, 4L, "T033A", "F-0033", "Vo (Vogan)", "AGENT", "fr", "ENFANT",
                AUJOURDHUI.minusDays(200), null, false);
    }

    private static SyncService.SyncVisite visite(UUID uuid) {
        return new SyncService.SyncVisite(uuid, "T033A", AUJOURDHUI.minusDays(1), 135, 8200, false,
                List.of(11L, 12L));
    }

    private static SyncService.SyncRequest requete(SyncService.SyncVisite... v) {
        return new SyncService.SyncRequest(List.of(v), null, null, null, null);
    }

    private void autoriserEnfantEtVisiteCreee() {
        when(suiviService.enfantAutorise(agent, "T033A")).thenReturn(enfant());
        when(suivi.insererVisite(any(), eq(42L), eq(7L), any(), any(), any(), anyBoolean())).thenReturn(true);
    }

    @Test
    void visiteEnregistreeEtRendezVousMarquesRealises() {
        autoriserEnfantEtVisiteCreee();

        SyncService.SyncResultat r = service.synchroniser(agent, requete(visite(UUID.randomUUID())), AUJOURDHUI);

        assertEquals(1, r.visitesCreees());
        assertEquals(0, r.visitesDejaConnues());
        assertTrue(r.erreurs().isEmpty());
        // Les rendez-vous réalisés ne sont marqués que quand la visite est réellement créée.
        verify(suivi).marquerRealises(42L, List.of(11L, 12L), AUJOURDHUI.minusDays(1));
    }

    @Test
    void rejeuIdentiqueNeCreeAucunDoublon() {
        autoriserEnfantEtVisiteCreee();
        UUID uuid = UUID.randomUUID();

        // Réseau coupé en plein envoi : le téléphone renvoie exactement le même lot.
        SyncService.SyncResultat premier = service.synchroniser(agent, requete(visite(uuid)), AUJOURDHUI);

        when(suivi.insererVisite(any(), eq(42L), eq(7L), any(), any(), any(), anyBoolean())).thenReturn(false);
        SyncService.SyncResultat rejeu = service.synchroniser(agent, requete(visite(uuid)), AUJOURDHUI);

        assertEquals(1, premier.visitesCreees());
        assertEquals(0, rejeu.visitesCreees());
        assertEquals(1, rejeu.visitesDejaConnues());
        // Au rejeu, on ne marque pas les rendez-vous une seconde fois.
        verify(suivi).marquerRealises(anyLong(), any(), any());
    }

    @Test
    void dateDansLeFuturRefuseeSansBloquerLesAutresVisites() {
        SyncService.SyncVisite future = new SyncService.SyncVisite(UUID.randomUUID(), "T033A",
                AUJOURDHUI.plusDays(1), 135, 8200, false, List.of());
        autoriserEnfantEtVisiteCreee();

        SyncService.SyncResultat r = service.synchroniser(agent,
                requete(future, visite(UUID.randomUUID())), AUJOURDHUI);

        assertEquals(1, r.visitesCreees());
        assertEquals(1, r.erreurs().size());
        assertTrue(r.erreurs().get(0).contains("date de visite dans le futur"));
    }

    @Test
    void enfantHorsZoneEstSignaleEtJamaisInsere() {
        when(suiviService.enfantAutorise(agent, "T033A"))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Cet enfant n'est pas dans votre zone"));

        SyncService.SyncResultat r = service.synchroniser(agent, requete(visite(UUID.randomUUID())), AUJOURDHUI);

        assertEquals(0, r.visitesCreees());
        assertEquals(1, r.erreurs().size());
        assertTrue(r.erreurs().get(0).contains("Cet enfant n'est pas dans votre zone"));
        verify(suivi, never()).insererVisite(any(), anyLong(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void inscriptionsTraiteesAvantLesVisites() {
        UUID uuidInscription = UUID.randomUUID();
        var demande = new InscriptionService.InscriptionRequest(uuidInscription, "VO", "fr", "AGENT", null, true,
                List.of(), List.of(), null);
        when(inscriptions.inscrire(agent, demande, AUJOURDHUI))
                .thenReturn(new InscriptionService.InscriptionResultat(uuidInscription, true, "F-0100",
                        List.of("T100A")));
        autoriserEnfantEtVisiteCreee();

        SyncService.SyncResultat r = service.synchroniser(agent,
                new SyncService.SyncRequest(List.of(visite(UUID.randomUUID())), null, List.of(demande), null, null),
                AUJOURDHUI);

        assertEquals(1, r.inscriptionsCreees());
        assertEquals(List.of("T100A"), r.inscriptions().get(0).codesEnfants());
        // Les inscriptions créent les enfants : elles doivent passer avant les visites qui les concernent.
        InOrder ordre = inOrder(inscriptions, suivi);
        ordre.verify(inscriptions).inscrire(agent, demande, AUJOURDHUI);
        ordre.verify(suivi).insererVisite(any(), anyLong(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void inscriptionRefuseeNEmmpechePasLesVisites() {
        UUID uuidInscription = UUID.randomUUID();
        var demande = new InscriptionService.InscriptionRequest(uuidInscription, "VO", "fr", "AGENT", null, true,
                List.of(), List.of(), null);
        when(inscriptions.inscrire(agent, demande, AUJOURDHUI))
                .thenThrow(new IllegalArgumentException("zone inconnue"));
        autoriserEnfantEtVisiteCreee();

        SyncService.SyncResultat r = service.synchroniser(agent,
                new SyncService.SyncRequest(List.of(visite(UUID.randomUUID())), null, List.of(demande), null, null),
                AUJOURDHUI);

        assertEquals(1, r.visitesCreees());
        assertEquals(0, r.inscriptionsCreees());
        assertEquals(1, r.erreurs().size());
        assertTrue(r.erreurs().get(0).contains(uuidInscription.toString()));
        assertTrue(r.erreurs().get(0).contains("zone inconnue"));
    }

    @Test
    void declarationCreeePuisReconnueAuRejeu() {
        var declaration = new SyncService.SyncDeclaration("T033A", "CENTRE_SANTE", true, "AGENT", null, null, null,
                false, false);
        when(naissances.declarer(eq(agent), eq("T033A"), eq("CENTRE_SANTE"), eq(true), any(), eq("AGENT"),
                eq(AUJOURDHUI)))
                .thenReturn(new NaissanceService.Resultat(true, null))
                .thenReturn(new NaissanceService.Resultat(false, null));
        var req = new SyncService.SyncRequest(null, List.of(declaration), null, null, null);

        SyncService.SyncResultat premier = service.synchroniser(agent, req, AUJOURDHUI);
        SyncService.SyncResultat rejeu = service.synchroniser(agent, req, AUJOURDHUI);

        assertEquals(1, premier.declarationsCreees());
        assertEquals(0, rejeu.declarationsCreees());
        assertEquals(1, rejeu.declarationsDejaConnues());
    }

    @Test
    void accouchementsEtPrenomsComptesSansDoublon() {
        var accouchement = new SyncService.SyncAccouchement("T033A", AUJOURDHUI.minusDays(3), List.of(1, 2));
        when(inscriptions.accoucher(eq(agent), eq("T033A"), any(), eq(AUJOURDHUI))).thenReturn(true, false);
        when(naissances.donnerPrenomUneFois(agent, "T033A", "Kossi", AUJOURDHUI)).thenReturn(true);
        when(naissances.donnerPrenomUneFois(agent, "T033B", "Afi", AUJOURDHUI))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Le prénom a déjà été enregistré"));
        var req = new SyncService.SyncRequest(null, null, null, List.of(accouchement),
                List.of(new SyncService.SyncPrenom("T033A", "Kossi"), new SyncService.SyncPrenom("T033B", "Afi")));

        SyncService.SyncResultat premier = service.synchroniser(agent, req, AUJOURDHUI);
        SyncService.SyncResultat rejeu = service.synchroniser(agent, req, AUJOURDHUI);

        assertEquals(1, premier.accouchementsCrees());
        assertEquals(1, rejeu.accouchementsDejaConnus());
        // Le prénom refusé est signalé, sans bloquer l'autre prénom ni l'accouchement.
        assertEquals(1, premier.prenomsEnregistres());
        assertEquals(1, premier.erreurs().size());
        assertTrue(premier.erreurs().get(0).contains("T033B"));
    }

    @Test
    void requeteVideNeToucheAucuneDonneeMaisEstJournalisee() {
        SyncService.SyncResultat r = service.synchroniser(agent,
                new SyncService.SyncRequest(null, null, null, null, null), AUJOURDHUI);

        assertEquals(0, r.visitesCreees());
        assertEquals(0, r.declarationsCreees());
        assertEquals(0, r.inscriptionsCreees());
        assertEquals(0, r.accouchementsCrees());
        assertEquals(0, r.prenomsEnregistres());
        assertTrue(r.erreurs().isEmpty());
        verifyNoInteractions(suivi, suiviService, naissances, inscriptions);
        // Même vide, la synchronisation laisse une trace dans le journal des accès.
        verify(acces).tracer(eq(agent), eq("SYNCHRONISER"), argThat(s -> s.startsWith("0 visite(s)")));
    }
}
