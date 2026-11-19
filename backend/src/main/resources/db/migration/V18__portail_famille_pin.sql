-- Portail famille autonome : accès sécurisé par code famille et code PIN à 4 chiffres.
-- Le PIN est stocké sous forme d'empreinte SHA-256 (64 caractères hexadécimaux), jamais en clair.

-- 1. Ajout de la colonne pin_hash (nullable)
ALTER TABLE famille ADD COLUMN pin_hash VARCHAR(64);

-- 2. Index sur code_famille et pin_hash pour accélérer la recherche lors de l'authentification
CREATE INDEX idx_famille_code_pin ON famille (code_famille, pin_hash);

-- 3. Familles de démonstration (codes F-0001 à F-0045) : initialisation du PIN '1234' hashé en SHA-256
UPDATE famille
SET pin_hash = encode(sha256(convert_to('1234', 'UTF8')), 'hex')
WHERE code_famille BETWEEN 'F-0001' AND 'F-0045';
