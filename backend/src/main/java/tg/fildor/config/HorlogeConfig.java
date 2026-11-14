package tg.fildor.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HorlogeConfig {

    /** Le Togo est à l'heure UTC toute l'année. */
    @Bean
    Clock clock() {
        return Clock.system(ZoneId.of("Africa/Lome"));
    }
}
