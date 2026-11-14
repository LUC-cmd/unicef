package tg.fildor.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Limite simple (30 appels par minute et par adresse) sur /api/public pour empêcher de deviner des numéros.
 * Prototype : en production, utiliser la limitation du proxy ou de l'opérateur, et l'adresse réelle du client.
 */
@Component
public class LimiteAppelsPublics extends OncePerRequestFilter {

    private static final int MAX_PAR_MINUTE = 30;

    private record Fenetre(long minute, int appels) {
    }

    private final Map<String, Fenetre> fenetres = new ConcurrentHashMap<>();
    private final Clock clock;

    public LimiteAppelsPublics(Clock clock) {
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long minute = clock.millis() / 60_000;
        Fenetre f = fenetres.merge(req.getRemoteAddr(), new Fenetre(minute, 1),
                (ancienne, nouvelle) -> ancienne.minute() == minute ? new Fenetre(minute, ancienne.appels() + 1) : nouvelle);
        if (fenetres.size() > 10_000) {
            fenetres.entrySet().removeIf(e -> e.getValue().minute() < minute);
        }
        if (f.appels() > MAX_PAR_MINUTE) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.setCharacterEncoding("UTF-8");
            res.getWriter().write("{\"erreur\":\"Trop d'appels, réessayez dans une minute\"}");
            return;
        }
        chain.doFilter(req, res);
    }
}
