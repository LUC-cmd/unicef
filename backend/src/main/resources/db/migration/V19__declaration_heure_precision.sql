-- Heure de naissance (facultative) et précision de la date : la mairie en a besoin pour dresser l'acte.
-- EXACTE : date certaine · APPROXIMATIVE : estimée à partir de l'âge · INCONNUE : meilleure estimation, jugement supplétif.
ALTER TABLE declaration_naissance ADD COLUMN heure_naissance TIME;
ALTER TABLE declaration_naissance ADD COLUMN precision_date VARCHAR(12) NOT NULL DEFAULT 'EXACTE'
    CHECK (precision_date IN ('EXACTE', 'APPROXIMATIVE', 'INCONNUE'));
