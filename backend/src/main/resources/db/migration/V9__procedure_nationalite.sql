-- Procédure de nationalité : s'ouvre quand l'état civil valide la naissance, y compris si les parents n'ont pas de papiers.
CREATE TABLE dossier_nationalite (
    declaration_id BIGINT PRIMARY KEY REFERENCES declaration_naissance (id) ON DELETE CASCADE,
    voie           VARCHAR(20) NOT NULL CHECK (voie IN ('FILIATION', 'SANS_PAPIERS', 'PARENTS_ETRANGERS', 'A_PRECISER')),
    etape          SMALLINT    NOT NULL DEFAULT 1 CHECK (etape BETWEEN 1 AND 4),
    pieces_ok      VARCHAR(300) NOT NULL DEFAULT '',
    note           VARCHAR(300),
    ouvert_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
    mis_a_jour_le  TIMESTAMPTZ NOT NULL DEFAULT now(),
    mis_a_jour_par BIGINT REFERENCES app_user (id)
);

-- Les naissances déjà validées entrent aussi dans la procédure.
INSERT INTO dossier_nationalite (declaration_id, voie)
SELECT d.id,
       CASE WHEN lower(coalesce(p.nationalite_mere, '') || ' ' || coalesce(p.nationalite_conjoint, '')) LIKE '%tog%' THEN 'FILIATION'
            WHEN p.nationalite_mere IS NOT NULL OR p.nationalite_conjoint IS NOT NULL THEN 'PARENTS_ETRANGERS'
            WHEN p.piece_type = 'AUCUNE' THEN 'SANS_PAPIERS'
            ELSE 'A_PRECISER' END
FROM declaration_naissance d
LEFT JOIN identite_parents p ON p.enfant_id = d.enfant_id
WHERE d.statut = 'VALIDEE';
