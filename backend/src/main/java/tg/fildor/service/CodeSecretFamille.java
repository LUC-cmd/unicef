package tg.fildor.service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/**
 * Code secret d'une famille : le numéro et le code famille figurent sur la carte, ils ne suffisent donc pas. La famille
 * choisit un code de 4 à 6 chiffres à sa première connexion ; il n'est jamais conservé en clair. Après 5 essais ratés,
 * l'accès est bloqué 15 minutes. Un agent peut le réinitialiser en présence de la famille.
 * Le code arrive dans l'en-tête {@value #ENTETE}.
 */
@Component
public class CodeSecretFamille {

    public static final String ENTETE = "X-Fildor-Secret";
    private static final int MAX_ESSAIS = 5;
    private static final int BLOCAGE_MINUTES = 15;
    private static final Pattern FORMAT = Pattern.compile("\\d{4,6}");

    private record Ligne(String hash, int essais, Instant bloqueJusqu) {
    }

    private final JdbcClient jdbc;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final TransactionTemplate independante;

    public CodeSecretFamille(JdbcClient jdbc, PasswordEncoder encoder, Clock clock, PlatformTransactionManager tm) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.clock = clock;
        this.independante = new TransactionTemplate(tm);
        this.independante.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Vérifie le code secret de la requête en cours, si la famille en a choisi un. */
    public void controler(long familleId) {
        if (estDemonstration(familleId)) {
            return; // la famille fictive de démonstration reste ouverte à tous les visiteurs du prototype
        }
        Ligne l = ligne(familleId).orElse(null);
        if (l == null || l.hash() == null) {
            return;
        }
        Instant maintenant = clock.instant();
        if (l.bloqueJusqu() != null && l.bloqueJusqu().isAfter(maintenant)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Trop d'essais. Réessayez dans quelques minutes ou demandez à votre agent de santé.");
        }
        String secret = enteteSecret();
        if (secret == null || secret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Code secret requis");
        }
        if (encoder.matches(secret.trim(), l.hash())) {
            if (l.essais() > 0) {
                independante.executeWithoutResult(s -> jdbc.sql(
                        "UPDATE famille_acces SET essais_rates = 0, bloque_jusqu = NULL WHERE famille_id = :f")
                        .param("f", familleId).update());
            }
            return;
        }
        int essais = l.essais() + 1;
        boolean bloquer = essais >= MAX_ESSAIS;
        Timestamp jusqu = bloquer ? Timestamp.from(maintenant.plus(BLOCAGE_MINUTES, ChronoUnit.MINUTES)) : null;
        independante.executeWithoutResult(s -> jdbc.sql("""
                UPDATE famille_acces SET essais_rates = :n, bloque_jusqu = :b WHERE famille_id = :f""")
                .param("n", bloquer ? 0 : essais).param("b", jusqu).param("f", familleId).update());
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Code secret incorrect");
    }

    /** Choisit ou change le code secret (le changement exige déjà le code actuel, contrôlé en amont). */
    public void definir(long familleId, String nouveau) {
        if (nouveau == null || !FORMAT.matcher(nouveau.trim()).matches()) {
            throw new IllegalArgumentException("Le code secret doit avoir 4 à 6 chiffres");
        }
        jdbc.sql("""
                INSERT INTO famille_acces (famille_id, code_secret_hash, essais_rates, bloque_jusqu)
                VALUES (:f, :h, 0, NULL)
                ON CONFLICT (famille_id) DO UPDATE
                SET code_secret_hash = :h, essais_rates = 0, bloque_jusqu = NULL""")
                .param("f", familleId).param("h", encoder.encode(nouveau.trim())).update();
    }

    /** L'agent efface le code : la famille en choisira un nouveau à sa prochaine connexion. */
    public void reinitialiser(long familleId) {
        jdbc.sql("DELETE FROM famille_acces WHERE famille_id = :f").param("f", familleId).update();
    }

    private boolean estDemonstration(long familleId) {
        return jdbc.sql("SELECT COUNT(*) FROM famille WHERE id = :f AND code_famille = 'F-0001'")
                .param("f", familleId).query(Long.class).single() > 0;
    }

    private Optional<Ligne> ligne(long familleId) {
        return jdbc.sql("SELECT code_secret_hash, essais_rates, bloque_jusqu FROM famille_acces WHERE famille_id = :f")
                .param("f", familleId)
                .query((rs, n) -> {
                    Timestamp b = rs.getTimestamp("bloque_jusqu");
                    return new Ligne(rs.getString("code_secret_hash"), rs.getInt("essais_rates"),
                            b == null ? null : b.toInstant());
                })
                .optional();
    }

    private static String enteteSecret() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes a) {
            return a.getRequest().getHeader(ENTETE);
        }
        return null;
    }
}
