-- Carte de famille : le code de la carte (6 chiffres) accompagne le numéro de famille. Il suit la famille d'une région à l'autre.
ALTER TABLE famille ADD COLUMN code_carte VARCHAR(6) NOT NULL DEFAULT lpad(floor(random() * 1000000)::int::text, 6, '0');

CREATE TABLE transfert_famille (
    id           BIGSERIAL PRIMARY KEY,
    famille_id   BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    de_zone_id   BIGINT      NOT NULL REFERENCES zone (id),
    vers_zone_id BIGINT      NOT NULL REFERENCES zone (id),
    par_user_id  BIGINT      REFERENCES app_user (id),
    le           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transfert_famille ON transfert_famille (famille_id);
