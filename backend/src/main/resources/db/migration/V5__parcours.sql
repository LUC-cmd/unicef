-- Parcours de l'enfant : suivi de l'acte de naissance jusqu'au retrait, poids de naissance, préscolaires dans l'annuaire.

-- 1. Acte de naissance : prêt à retirer, puis retiré par la famille
ALTER TABLE declaration_naissance ADD COLUMN acte_pret_le TIMESTAMPTZ;
ALTER TABLE declaration_naissance ADD COLUMN acte_retire_le TIMESTAMPTZ;

-- Données de démonstration (fictives) : une partie des actes validés est prête, une partie a été retirée
UPDATE declaration_naissance
SET acte_pret_le = LEAST(COALESCE(traitee_le, envoyee_le) + INTERVAL '10 days', now())
WHERE statut = 'VALIDEE' AND id % 3 <> 0;
UPDATE declaration_naissance
SET acte_retire_le = LEAST(acte_pret_le + INTERVAL '5 days', now())
WHERE statut = 'VALIDEE' AND acte_pret_le IS NOT NULL AND id % 2 = 0;

-- 2. Poids de naissance (en grammes) : un nouveau-né de moins de 2 500 g est suivi de plus près la première semaine
ALTER TABLE enfant ADD COLUMN poids_naissance_g INTEGER CHECK (poids_naissance_g BETWEEN 500 AND 6500);

-- 3. Les préscolaires (jardins d'enfants) entrent dans l'annuaire
ALTER TABLE structure DROP CONSTRAINT IF EXISTS structure_type_check;
ALTER TABLE structure ADD CONSTRAINT structure_type_check
    CHECK (type IN ('CENTRE_SANTE', 'CRECHE', 'PRESCOLAIRE', 'CENTRE_SOCIAL', 'ETAT_CIVIL'));

INSERT INTO structure (code, type, nom, zone_id, telephone, horaires, services, besoins_specifiques)
SELECT v.code, v.type, v.nom, z.id, v.tel, v.horaires, v.services, v.besoins
FROM (VALUES
 ('PS-VO',    'PRESCOLAIRE', 'Jardin d''enfants de Vo (fictif)',     'VO',    '+228 00 00 00 41', 'Lun-Ven 7h30-12h30', 'Préscolaire de 3 à 5 ans, éveil, repas léger', FALSE),
 ('PS-ZIO',   'PRESCOLAIRE', 'Jardin d''enfants de Zio (fictif)',    'ZIO',   '+228 00 00 00 42', 'Lun-Ven 7h30-12h30', 'Préscolaire de 3 à 5 ans, éveil', FALSE),
 ('PS-GOLFE', 'PRESCOLAIRE', 'École maternelle du Golfe (fictive)',  'GOLFE', '+228 00 00 00 43', 'Lun-Ven 7h30-13h',   'Préscolaire de 3 à 5 ans, accueil des enfants à besoins spécifiques', TRUE)
) AS v (code, type, nom, zone, tel, horaires, services, besoins)
JOIN zone z ON z.code = v.zone;
