-- Crèches : conditions d'accueil, ce qu'il faut apporter, et réservations des familles (jours, demi-journées, heures).
-- Aucun nom : une réservation relie un code d'enfant à une crèche ; la crèche ne voit jamais d'identité.
ALTER TABLE message_famille DROP CONSTRAINT IF EXISTS message_famille_type_check;
ALTER TABLE message_famille ADD CONSTRAINT message_famille_type_check
    CHECK (type IN ('JEU', 'RAPPEL_GENERAL', 'REPONSE_STRUCTURE', 'NAISSANCE', 'CRECHE'));

CREATE TABLE creche_offre (
    structure_id  BIGINT PRIMARY KEY REFERENCES structure (id) ON DELETE CASCADE,
    age_min_mois  INTEGER      NOT NULL DEFAULT 12 CHECK (age_min_mois BETWEEN 0 AND 72),
    age_max_mois  INTEGER      NOT NULL DEFAULT 60 CHECK (age_max_mois BETWEEN 1 AND 72),
    capacite      INTEGER      NOT NULL DEFAULT 20 CHECK (capacite BETWEEN 1 AND 200),
    ouverture     TIME         NOT NULL DEFAULT '07:00',
    fermeture     TIME         NOT NULL DEFAULT '17:00',
    jours         VARCHAR(30)  NOT NULL DEFAULT 'LUN,MAR,MER,JEU,VEN',
    conditions    VARCHAR(600) NOT NULL DEFAULT '',
    a_apporter    VARCHAR(600) NOT NULL DEFAULT '',
    tarif         VARCHAR(200) NOT NULL DEFAULT ''
);

CREATE TABLE creche_reservation (
    id            BIGSERIAL PRIMARY KEY,
    structure_id  BIGINT      NOT NULL REFERENCES structure (id),
    famille_id    BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    enfant_id     BIGINT      NOT NULL REFERENCES enfant (id) ON DELETE CASCADE,
    date_jour     DATE        NOT NULL,
    formule       VARCHAR(12) NOT NULL CHECK (formule IN ('JOURNEE', 'MATIN', 'APRES_MIDI')),
    heure_arrivee TIME        NOT NULL,
    heure_depart  TIME        NOT NULL,
    note          VARCHAR(200) NOT NULL DEFAULT '',
    statut        VARCHAR(10) NOT NULL DEFAULT 'DEMANDEE' CHECK (statut IN ('DEMANDEE', 'CONFIRMEE', 'REFUSEE', 'ANNULEE')),
    traitee_par   BIGINT REFERENCES app_user (id),
    cree_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (heure_arrivee < heure_depart)
);
CREATE UNIQUE INDEX uniq_creche_reservation_active ON creche_reservation (structure_id, enfant_id, date_jour)
    WHERE statut IN ('DEMANDEE', 'CONFIRMEE');
CREATE INDEX idx_creche_reservation_jour ON creche_reservation (structure_id, date_jour);
CREATE INDEX idx_creche_reservation_famille ON creche_reservation (famille_id, date_jour);

-- Conditions fictives pour les deux crèches de démonstration
INSERT INTO creche_offre (structure_id, age_min_mois, age_max_mois, capacite, ouverture, fermeture, jours, conditions, a_apporter, tarif)
SELECT id, 12, 60, 25, '07:00', '17:00', 'LUN,MAR,MER,JEU,VEN',
       'Enfant de 1 à 5 ans. Carnet de vaccination à jour. Un adulte désigné pour déposer et reprendre l''enfant. Prévenir la veille en cas d''absence.',
       'Une tenue de rechange, une gourde, un en-cas pour la matinée, une couverture légère pour la sieste, le carnet de santé.',
       '300 FCFA par jour (fictif). Demi-journée : 150 FCFA.'
FROM structure WHERE code = 'CR-GOLFE';
INSERT INTO creche_offre (structure_id, age_min_mois, age_max_mois, capacite, ouverture, fermeture, jours, conditions, a_apporter, tarif)
SELECT id, 24, 60, 15, '07:00', '16:00', 'LUN,MAR,MER,JEU,VEN',
       'Enfant de 2 à 5 ans, y compris enfant à besoins spécifiques : en parler avant la première journée. Carnet de vaccination à jour.',
       'Une tenue de rechange, une gourde, un en-cas, le carnet de santé, les médicaments prescrits avec l''ordonnance.',
       '250 FCFA par jour (fictif).'
FROM structure WHERE code = 'CR-AGOE';
