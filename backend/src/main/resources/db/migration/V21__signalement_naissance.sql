-- Naissance signalée par la famille : à vérifier par l'agent de la zone avant toute déclaration à la mairie.
CREATE TABLE signalement_naissance (
    id              BIGSERIAL PRIMARY KEY,
    famille_id      BIGINT       NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    code_enfant     VARCHAR(30)  NOT NULL,
    date_naissance  DATE         NOT NULL,
    heure_naissance VARCHAR(5),
    precision_date  VARCHAR(12)  NOT NULL DEFAULT 'EXACTE' CHECK (precision_date IN ('EXACTE', 'APPROXIMATIVE', 'INCONNUE')),
    lieu            VARCHAR(14)  NOT NULL CHECK (lieu IN ('CENTRE_SANTE', 'DOMICILE')),
    preuve          VARCHAR(120),
    mere_nom        VARCHAR(120),
    pere_nom        VARCHAR(120),
    enfant_prenom   VARCHAR(60),
    accord_noms     BOOLEAN      NOT NULL DEFAULT FALSE,
    statut          VARCHAR(10)  NOT NULL DEFAULT 'A_VERIFIER' CHECK (statut IN ('A_VERIFIER', 'CONFIRME', 'REFUSE')),
    motif           VARCHAR(200),
    cree_le         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    traite_le       TIMESTAMPTZ
);
CREATE INDEX idx_signalement_famille ON signalement_naissance (famille_id);
CREATE UNIQUE INDEX uq_signalement_en_attente ON signalement_naissance (famille_id, code_enfant) WHERE statut = 'A_VERIFIER';
