package tg.fildor.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tg.fildor.config.AppUser;
import tg.fildor.repo.UserRepository;

/**
 * Idempotence de la synchronisation contre un vrai PostgreSQL (contrainte UNIQUE sur visite.client_uuid
 * et ON CONFLICT DO NOTHING). S'exécute avec la pile complète : migrations Flyway, données fictives,
 * comptes de démo. Automatiquement ignoré si Docker n'est pas disponible (poste de développement).
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(properties = {
        "fildor.comptes-demo=true",
        "fildor.cycle-rappels-actif=false"
})
class SyncServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private SyncService sync;

    @Autowired
    private UserRepository users;

    @Autowired
    private JdbcClient jdbc;

    @Test
    void laSynchronisationEstIdempotenteEnBaseReelle() {
        AppUser agent = agent("agent.vo");
        String codeEnfant = unEnfantDeLaZone(agent.zoneId());
        UUID uuid = UUID.randomUUID();
        var req = new SyncService.SyncRequest(
                List.of(new SyncService.SyncVisite(uuid, codeEnfant, LocalDate.now(), 132, 9100, false,
                        List.of())),
                null, null, null, null);

        SyncService.SyncResultat premiere = sync.synchroniser(agent, req, LocalDate.now());
        assertTrue(premiere.erreurs().isEmpty(), () -> "erreurs inattendues : " + premiere.erreurs());
        assertEquals(1, premiere.visitesCreees());

        // Réseau coupé en plein envoi : le téléphone renvoie exactement le même lot.
        SyncService.SyncResultat rejeu = sync.synchroniser(agent, req, LocalDate.now());
        assertEquals(0, rejeu.visitesCreees());
        assertEquals(1, rejeu.visitesDejaConnues());
        assertTrue(rejeu.erreurs().isEmpty(), () -> "erreurs au rejeu : " + rejeu.erreurs());

        Integer enBase = jdbc.sql("SELECT count(*) FROM visite WHERE client_uuid = :u")
                .param("u", uuid)
                .query(Integer.class)
                .single();
        assertEquals(1, enBase, "une seule ligne en base malgré deux envois identiques");
    }

    @Test
    void uneEntreeInvalideNBloquePasLesAutresEnBaseReelle() {
        AppUser agent = agent("agent.vo");
        String codeEnfant = unEnfantDeLaZone(agent.zoneId());
        UUID uuidValide = UUID.randomUUID();
        var req = new SyncService.SyncRequest(
                List.of(new SyncService.SyncVisite(UUID.randomUUID(), "T999Z", LocalDate.now(), 132, 9100,
                                false, List.of()),
                        new SyncService.SyncVisite(uuidValide, codeEnfant, LocalDate.now(), 140, 9200,
                                false, List.of())),
                null, null, null, null);

        SyncService.SyncResultat r = sync.synchroniser(agent, req, LocalDate.now());

        assertEquals(1, r.visitesCreees());
        assertEquals(1, r.erreurs().size());
        assertTrue(r.erreurs().get(0).contains("T999Z"));
        Integer enBase = jdbc.sql("SELECT count(*) FROM visite WHERE client_uuid = :u")
                .param("u", uuidValide)
                .query(Integer.class)
                .single();
        assertEquals(1, enBase, "la visite valide du même lot est bien enregistrée");
    }

    private AppUser agent(String username) {
        UserRepository.Utilisateur u = users.parUsername(username).orElseThrow();
        return new AppUser(u.id(), u.username(), u.passwordHash(), u.nomComplet(), u.role(), u.zoneId(),
                u.structureId(), u.actif(), u.region());
    }

    /** Un enfant réel des données fictives, situé dans la zone de l'agent (droits d'accès respectés). */
    private String unEnfantDeLaZone(Long zoneId) {
        return jdbc.sql("""
                        SELECT e.code_enfant
                        FROM enfant e
                        JOIN famille f ON f.id = e.famille_id
                        WHERE f.zone_id = :zone AND e.statut = 'ENFANT'
                        ORDER BY e.id
                        LIMIT 1
                        """)
                .param("zone", zoneId)
                .query(String.class)
                .single();
    }
}
