-- Enfant déjà né dont l'acte de naissance existe avant Fil d'Or : ETABLI = établi mais pas encore retiré, RETIRE = en main.
-- NULL = pas d'acte connu (le parcours de déclaration de Fil d'Or s'applique).
ALTER TABLE enfant ADD COLUMN IF NOT EXISTS acte_externe VARCHAR(10);
ALTER TABLE enfant DROP CONSTRAINT IF EXISTS enfant_acte_externe_check;
ALTER TABLE enfant ADD CONSTRAINT enfant_acte_externe_check CHECK (acte_externe IS NULL OR acte_externe IN ('ETABLI', 'RETIRE'));
