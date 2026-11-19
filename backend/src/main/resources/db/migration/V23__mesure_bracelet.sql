-- Mesures d'un bracelet de suivi du nouveau-né fragile. Elles arrivent par la même porte que la saisie de l'agent :
-- 'SAISIE' (lue sur l'écran du bracelet et notée à la main) ou 'BRACELET' (envoyée par l'appareil, plus tard).
CREATE TABLE IF NOT EXISTS mesure_bracelet (
    id             BIGSERIAL PRIMARY KEY,
    enfant_id      BIGINT       NOT NULL REFERENCES enfant (id) ON DELETE CASCADE,
    mesuree_le     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    temperature_c  NUMERIC(3, 1) NOT NULL CHECK (temperature_c BETWEEN 30 AND 43),
    pouls          INT          NOT NULL CHECK (pouls BETWEEN 40 AND 250),
    source         VARCHAR(10)  NOT NULL DEFAULT 'SAISIE' CHECK (source IN ('SAISIE', 'BRACELET'))
);
CREATE INDEX IF NOT EXISTS idx_mesure_bracelet_enfant ON mesure_bracelet (enfant_id, mesuree_le DESC);
