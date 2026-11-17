-- Jeunes mères (moins de 20 ans) : suivi renforcé et orientation. Une simple indication de l'agent, aucun âge exact.
ALTER TABLE famille ADD COLUMN mere_adolescente BOOLEAN NOT NULL DEFAULT FALSE;

-- Démonstration (données fictives) : quelques familles en grossesse sont marquées jeunes mères.
UPDATE famille SET mere_adolescente = TRUE
WHERE id IN (SELECT famille_id FROM enfant WHERE statut = 'GROSSESSE' ORDER BY id LIMIT 4);
