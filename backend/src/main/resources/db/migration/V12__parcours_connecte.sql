-- « Un enfant, un parcours » : passages entre les six étapes, besoins sociaux, préscolaire, progrès par trimestre.

-- Préscolaire : date à laquelle l'enfant de 3 à 5 ans est inscrit (ou orienté) dans un jardin d'enfants
ALTER TABLE enfant ADD COLUMN prescolaire_le DATE;

-- Services sociaux : accompagnement parental, protection sociale, eau et hygiène. Un besoin signalé, puis traité.
CREATE TABLE besoin_social (
    id          BIGSERIAL PRIMARY KEY,
    famille_id  BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('EAU', 'HYGIENE', 'PROTECTION_SOCIALE', 'PARENTALITE')),
    signale_le  DATE        NOT NULL DEFAULT CURRENT_DATE,
    traite_le   DATE,
    UNIQUE (famille_id, type)
);

-- Progrès par trimestre et par zone (hygiène, vaccination, nutrition), en pourcentage de familles concernées
CREATE TABLE progres_trimestre (
    zone_id     BIGINT      NOT NULL REFERENCES zone (id) ON DELETE CASCADE,
    trimestre   VARCHAR(7)  NOT NULL,
    hygiene     INTEGER     NOT NULL CHECK (hygiene BETWEEN 0 AND 100),
    vaccination INTEGER     NOT NULL CHECK (vaccination BETWEEN 0 AND 100),
    nutrition   INTEGER     NOT NULL CHECK (nutrition BETWEEN 0 AND 100),
    PRIMARY KEY (zone_id, trimestre)
);

-- Données de démonstration (fictives)
INSERT INTO progres_trimestre (zone_id, trimestre, hygiene, vaccination, nutrition)
SELECT z.id, t.tri, 58 + (z.id % 5) + t.h, 66 + (z.id % 4) + t.v, 49 + (z.id % 6) + t.n
FROM zone z
CROSS JOIN (VALUES ('2026-T1', 0, 0, 0), ('2026-T2', 1, 2, 4), ('2026-T3', 2, 4, 8)) AS t (tri, h, v, n)
WHERE z.pilote;

-- Quelques enfants de 3 à 5 ans déjà au préscolaire, quelques besoins sociaux signalés
UPDATE enfant SET prescolaire_le = CURRENT_DATE - 60
WHERE statut = 'ENFANT' AND date_naissance <= CURRENT_DATE - INTERVAL '36 months' AND id % 3 = 0;

INSERT INTO besoin_social (famille_id, type)
SELECT f.id, CASE f.id % 4 WHEN 0 THEN 'EAU' WHEN 1 THEN 'HYGIENE' WHEN 2 THEN 'PROTECTION_SOCIALE' ELSE 'PARENTALITE' END
FROM famille f WHERE f.consentement AND f.id % 5 = 0;

-- Nouveau-nés fragiles : deux bébés très récents sont notés « petit poids » pour montrer le suivi de la première semaine
UPDATE enfant SET poids_naissance_g = 2100
WHERE id IN (SELECT id FROM enfant WHERE statut = 'ENFANT' AND date_naissance >= CURRENT_DATE - 6 AND poids_naissance_g IS NULL ORDER BY id LIMIT 2);
