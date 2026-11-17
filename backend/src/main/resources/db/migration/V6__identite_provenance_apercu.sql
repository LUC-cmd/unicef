-- Provenance de la déclaration : qui l'a lancée (agent de santé, centre de santé, hôpital).
ALTER TABLE declaration_naissance ADD COLUMN source VARCHAR(14) NOT NULL DEFAULT 'AGENT'
    CHECK (source IN ('AGENT', 'CENTRE_SANTE', 'HOPITAL'));

-- Informations pour l'acte, données librement par la famille et visibles seulement de l'état civil.
-- Une ligne = la famille a été interrogée. Un nom n'est gardé que si la personne concernée a donné son accord.
-- Aucune de ces colonnes n'est lue par les écrans de l'agent, du responsable régional ou des statistiques.
CREATE TABLE identite_naissance (
    declaration_id BIGINT PRIMARY KEY REFERENCES declaration_naissance (id) ON DELETE CASCADE,
    mere_nom       VARCHAR(120),
    pere_nom       VARCHAR(120),
    enfant_prenom  VARCHAR(120),
    accord_mere    BOOLEAN     NOT NULL DEFAULT FALSE,
    accord_pere    BOOLEAN     NOT NULL DEFAULT FALSE,
    source         VARCHAR(14) NOT NULL DEFAULT 'AGENT',
    saisi_par      BIGINT REFERENCES app_user (id),
    saisi_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (mere_nom IS NULL OR accord_mere),
    CHECK (pere_nom IS NULL OR accord_pere)
);

-- ===== Données fictives de démonstration : de quoi faire vivre les tableaux de bord =====
-- Familles inscrites sur les 60 derniers jours
UPDATE famille SET cree_le = now() - (floor(random() * 60))::int * interval '1 day';

-- Visites des 30 derniers jours (quelques-unes par enfant, rarement un signe de danger)
INSERT INTO visite (client_uuid, enfant_id, agent_id, date_visite, muac_mm, poids_g, signes_danger)
SELECT gen_random_uuid(), e.id, NULL, current_date - (floor(random() * 30))::int,
       100 + (random() * 50)::int, 4000 + (random() * 6000)::int, random() < 0.05
FROM enfant e CROSS JOIN generate_series(1, 3) g
WHERE e.statut = 'ENFANT' AND random() < 0.75;

-- Traces d'accès des 14 derniers jours (comptes de démonstration seulement)
INSERT INTO journal_acces (username, action, ressource, cree_le)
SELECT (ARRAY['agent.vo', 'agent.golfe', 'agent.zio', 'mairie', 'decideur', 'structure.golfe', 'admin'])[1 + (random() * 6)::int],
       (ARRAY['CONSULTER_ENFANT', 'SYNCHRONISER', 'LISTER_DECLARATIONS', 'DECLARER_NAISSANCE', 'CONSULTER_ZONES', 'REPONDRE_DEMANDE'])[1 + (random() * 5)::int],
       NULL, now() - (random() * 14 * 24 * 3600) * interval '1 second'
FROM generate_series(1, 320);

-- Provenance variée et quelques identités fictives (la mère seule, ou les deux parents)
UPDATE declaration_naissance SET source = CASE
    WHEN lieu_naissance = 'CENTRE_SANTE' AND id % 3 = 0 THEN 'HOPITAL'
    WHEN lieu_naissance = 'CENTRE_SANTE' THEN 'CENTRE_SANTE'
    ELSE 'AGENT' END;
INSERT INTO identite_naissance (declaration_id, mere_nom, pere_nom, enfant_prenom, accord_mere, accord_pere, source)
SELECT id, 'Mère (nom fictif ' || id || ')', CASE WHEN id % 2 = 0 THEN 'Père (nom fictif ' || id || ')' END,
       CASE WHEN id % 4 = 0 THEN 'Prénom fictif' END, TRUE, (id % 2 = 0), source
FROM declaration_naissance WHERE id % 3 <> 0;
