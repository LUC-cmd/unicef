-- Fil d'Or : schéma initial.
-- Principe de minimisation : aucun nom, aucune photo, aucune adresse, aucune position GPS précise.
-- Les familles et les enfants sont identifiés par un code ; les téléphones sont stockés sous forme de hash.

CREATE TABLE zone (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(20)  NOT NULL UNIQUE,
    nom               VARCHAR(100) NOT NULL,
    region            VARCHAR(60)  NOT NULL,
    -- centre approximatif de la zone, jamais un point précis
    latitude          NUMERIC(6,3) NOT NULL,
    longitude         NUMERIC(6,3) NOT NULL,
    couverture_reseau VARCHAR(12)  NOT NULL DEFAULT 'INCONNUE'
        CHECK (couverture_reseau IN ('BONNE', 'INSTABLE', 'ABSENTE', 'INCONNUE'))
);

CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    nom_complet   VARCHAR(100) NOT NULL,
    role          VARCHAR(10)  NOT NULL CHECK (role IN ('AGENT', 'MAIRIE', 'DECIDEUR', 'ADMIN')),
    zone_id       BIGINT REFERENCES zone (id),
    actif         BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE famille (
    id              BIGSERIAL PRIMARY KEY,
    code_famille    VARCHAR(12) NOT NULL UNIQUE,
    zone_id         BIGINT      NOT NULL REFERENCES zone (id),
    langue          VARCHAR(8)  NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'ewe', 'kabye', 'tem')),
    porte           VARCHAR(14) NOT NULL CHECK (porte IN ('VOIX_SMS', 'AGENT', 'CARNET', 'POINT_ECOUTE')),
    a_telephone     BOOLEAN     NOT NULL DEFAULT FALSE,
    telephone_hash  CHAR(64) UNIQUE,
    consentement    BOOLEAN     NOT NULL DEFAULT FALSE,
    consentement_le TIMESTAMPTZ,
    cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (telephone_hash IS NULL OR a_telephone)
);
CREATE INDEX idx_famille_zone ON famille (zone_id);

CREATE TABLE enfant (
    id                 BIGSERIAL PRIMARY KEY,
    famille_id         BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    code_enfant        VARCHAR(16) NOT NULL UNIQUE,
    statut             VARCHAR(10) NOT NULL CHECK (statut IN ('GROSSESSE', 'ENFANT')),
    date_naissance     DATE,
    date_terme_prevue  DATE,
    sexe               CHAR(1) CHECK (sexe IN ('F', 'M')),
    CHECK ((statut = 'ENFANT' AND date_naissance IS NOT NULL)
        OR (statut = 'GROSSESSE' AND date_terme_prevue IS NOT NULL))
);
CREATE INDEX idx_enfant_famille ON enfant (famille_id);

CREATE TABLE rendez_vous (
    id               BIGSERIAL PRIMARY KEY,
    enfant_id        BIGINT       NOT NULL REFERENCES enfant (id) ON DELETE CASCADE,
    type             VARCHAR(30)  NOT NULL
        CHECK (type IN ('VACCIN', 'CONSULTATION_PRENATALE', 'PESEE', 'NUTRITION')),
    libelle          VARCHAR(120) NOT NULL,
    date_prevue      DATE         NOT NULL,
    statut           VARCHAR(10)  NOT NULL DEFAULT 'PLANIFIE' CHECK (statut IN ('PLANIFIE', 'REALISE', 'MANQUE')),
    date_realisation DATE
);
CREATE INDEX idx_rdv_enfant ON rendez_vous (enfant_id);
CREATE INDEX idx_rdv_statut_date ON rendez_vous (statut, date_prevue);

CREATE TABLE rappel (
    id             BIGSERIAL PRIMARY KEY,
    rendez_vous_id BIGINT      NOT NULL REFERENCES rendez_vous (id) ON DELETE CASCADE,
    canal          VARCHAR(6)  NOT NULL CHECK (canal IN ('SMS', 'VOIX')),
    message        TEXT        NOT NULL,
    envoye_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
    statut         VARCHAR(14) NOT NULL DEFAULT 'ENVOYE' CHECK (statut IN ('ENVOYE', 'ACQUITTE', 'SANS_REPONSE')),
    acquitte_le    TIMESTAMPTZ
);
CREATE INDEX idx_rappel_rdv ON rappel (rendez_vous_id);

CREATE TABLE visite (
    id              BIGSERIAL PRIMARY KEY,
    client_uuid     UUID        NOT NULL UNIQUE,   -- identifiant créé hors ligne : la synchronisation est idempotente
    enfant_id       BIGINT      NOT NULL REFERENCES enfant (id) ON DELETE CASCADE,
    agent_id        BIGINT REFERENCES app_user (id),
    date_visite     DATE        NOT NULL,
    muac_mm         INTEGER CHECK (muac_mm BETWEEN 60 AND 250),   -- périmètre brachial au ruban
    poids_g         INTEGER CHECK (poids_g BETWEEN 500 AND 30000),
    signes_danger   BOOLEAN     NOT NULL DEFAULT FALSE,
    synchronise_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visite_enfant ON visite (enfant_id, date_visite DESC);

CREATE TABLE declaration_naissance (
    id                       BIGSERIAL PRIMARY KEY,
    enfant_id                BIGINT      NOT NULL UNIQUE REFERENCES enfant (id) ON DELETE CASCADE,
    statut                   VARCHAR(10) NOT NULL DEFAULT 'ENVOYEE'
        CHECK (statut IN ('BROUILLON', 'ENVOYEE', 'VALIDEE', 'REJETEE')),
    lieu_naissance           VARCHAR(14) NOT NULL CHECK (lieu_naissance IN ('CENTRE_SANTE', 'DOMICILE')),
    certificat_accouchement  BOOLEAN     NOT NULL DEFAULT FALSE,
    numero_recu              VARCHAR(30) NOT NULL UNIQUE,
    envoyee_le               TIMESTAMPTZ NOT NULL DEFAULT now(),
    dans_delai_gratuit       BOOLEAN     NOT NULL,   -- déclarée dans les 45 jours (gratuit depuis le 01/01/2022)
    traitee_le               TIMESTAMPTZ,
    traitee_par              BIGINT REFERENCES app_user (id),
    motif_rejet              VARCHAR(200)
);

CREATE TABLE contenu (
    id         BIGSERIAL PRIMARY KEY,
    sujet      VARCHAR(20)  NOT NULL
        CHECK (sujet IN ('GROSSESSE', 'NOUVEAU_NE', 'ALLAITEMENT', 'VACCINS', 'NUTRITION', 'HYGIENE',
                         'NAISSANCE', 'EVEIL', 'DANGER')),
    langue     VARCHAR(8)   NOT NULL CHECK (langue IN ('fr', 'ewe', 'kabye', 'tem')),
    titre      VARCHAR(120) NOT NULL,
    texte      TEXT         NOT NULL,
    a_valider  BOOLEAN      NOT NULL DEFAULT TRUE,   -- tout contenu de santé doit être validé par un professionnel
    UNIQUE (sujet, langue)
);

CREATE TABLE appel_manque (
    id             BIGSERIAL PRIMARY KEY,
    telephone_hash CHAR(64)    NOT NULL,
    recu_le        TIMESTAMPTZ NOT NULL DEFAULT now(),
    rappele        BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE journal_acces (
    id        BIGSERIAL PRIMARY KEY,
    username  VARCHAR(50)  NOT NULL,
    action    VARCHAR(40)  NOT NULL,
    ressource VARCHAR(80),
    cree_le   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_cree ON journal_acces (cree_le DESC);
