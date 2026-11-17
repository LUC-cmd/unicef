package tg.fildor.config;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Utilisateur connecté, avec sa zone (null = toutes les zones, réservé à l'administrateur) et sa structure (rôle STRUCTURE). */
public record AppUser(long id, String username, String passwordHash, String nomComplet, String role, Long zoneId,
                      Long structureId, boolean actif, String region) implements UserDetails {

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return actif;
    }
}
