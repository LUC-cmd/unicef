package tg.fildor.domain;

import java.util.List;

public record Priorite(int score, Niveau niveau, List<String> raisons) {
}
