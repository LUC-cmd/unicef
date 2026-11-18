-- Mode urgence : un code court (*789*3# ou bouton « urgence ») prévient l'agent de la zone.
-- Minimisation : la famille est reliée par son code, le téléphone par son hash, jamais de nom ni position.
CREATE TABLE alerte_urgence (
    id            BIGSERIAL PRIMARY KEY,
    famille_id    BIGINT      REFERENCES famille (id),
    telephone_hash VARCHAR(64),
    motif         VARCHAR(200) NOT NULL,
    statut        VARCHAR(12)  NOT NULL DEFAULT 'NOUVELLE'
                  CHECK (statut IN ('NOUVELLE', 'EN_COURS', 'CLOTUREE')),
    cree_le       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    traite_le     TIMESTAMPTZ
);
CREATE INDEX idx_alerte_urgence_statut ON alerte_urgence (statut, cree_le DESC);
