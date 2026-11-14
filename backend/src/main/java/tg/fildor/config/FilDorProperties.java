package tg.fildor.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fildor")
public record FilDorProperties(
        String telephonePepper,
        boolean comptesDemo,
        String motDePasseDemo,
        String originesAutorisees,
        int seuilAnonymat,
        boolean cycleRappelsActif) {

    public List<String> origines() {
        return Arrays.stream(originesAutorisees.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
