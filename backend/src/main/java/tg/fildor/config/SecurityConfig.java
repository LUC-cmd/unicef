package tg.fildor.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tg.fildor.repo.UserRepository;

/**
 * Accès par rôle (AGENT, MAIRIE, DECIDEUR, STRUCTURE, ADMIN) en HTTP Basic sans session.
 * Prototype : pour la production, remplacer par des jetons (OAuth2/JWT) et du HTTPS obligatoire.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return username -> users.parUsername(username)
                .map(u -> new AppUser(u.id(), u.username(), u.passwordHash(), u.nomComplet(), u.role(), u.zoneId(), u.structureId(), u.actif(), u.region()))
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur inconnu"));
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/public/**", "/api/portail/**", "/actuator/health").permitAll()
                        .requestMatchers("/api/agent/**").hasAnyRole("AGENT", "ADMIN")
                        .requestMatchers("/api/mairie/**").hasAnyRole("MAIRIE", "ADMIN")
                        .requestMatchers("/api/decideur/**").hasAnyRole("DECIDEUR", "ADMIN")
                        .requestMatchers("/api/structure/**").hasRole("STRUCTURE")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/auth/**").authenticated()
                        .requestMatchers("/api/verification/**").authenticated()
                        .anyRequest().denyAll())
                // Pas d'en-tête WWW-Authenticate : le navigateur n'ouvre pas sa fenêtre de connexion, le front gère l'erreur.
                .httpBasic(b -> b.authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(401);
                    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().write("{\"erreur\":\"Identifiants invalides ou connexion requise\"}");
                }));
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(FilDorProperties props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(props.origines());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Fildor-Secret"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", c);
        return source;
    }
}
