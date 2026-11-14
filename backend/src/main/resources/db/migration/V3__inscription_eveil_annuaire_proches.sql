-- Fil d'Or : inscription des familles, éveil, annuaire des structures, proches informés.
-- Même principe que V1 : aucun nom, aucune photo, aucune adresse de famille ; téléphones sous forme de hash.

-- ---------------------------------------------------------------------------
-- Inscription : identifiant créé sur le téléphone de l'agent (synchronisation hors ligne sans doublon)
-- ---------------------------------------------------------------------------
ALTER TABLE famille ADD COLUMN client_uuid UUID UNIQUE;

-- ---------------------------------------------------------------------------
-- Annuaire des structures (informations publiques : pas des données de famille)
-- ---------------------------------------------------------------------------
CREATE TABLE structure (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(20)  NOT NULL UNIQUE,
    type                VARCHAR(14)  NOT NULL CHECK (type IN ('CENTRE_SANTE', 'CRECHE', 'CENTRE_SOCIAL', 'ETAT_CIVIL')),
    nom                 VARCHAR(120) NOT NULL,
    zone_id             BIGINT       NOT NULL REFERENCES zone (id),
    telephone           VARCHAR(30),
    horaires            VARCHAR(120),
    services            VARCHAR(300),
    besoins_specifiques BOOLEAN      NOT NULL DEFAULT FALSE,   -- accueille des enfants à besoins spécifiques
    actif               BOOLEAN      NOT NULL DEFAULT TRUE,
    mis_a_jour_le       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_structure_zone ON structure (zone_id, type);

ALTER TABLE app_user ADD COLUMN structure_id BIGINT REFERENCES structure (id);
ALTER TABLE app_user DROP CONSTRAINT app_user_role_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_role_check
    CHECK (role IN ('AGENT', 'MAIRIE', 'DECIDEUR', 'STRUCTURE', 'ADMIN'));

-- Une famille demande à être rappelée ou orientée. Pas de texte libre : pas de récit personnel dans la base.
CREATE TABLE demande_structure (
    id           BIGSERIAL PRIMARY KEY,
    structure_id BIGINT      NOT NULL REFERENCES structure (id),
    famille_id   BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    motif        VARCHAR(12) NOT NULL CHECK (motif IN ('RAPPEL', 'ORIENTATION')),
    origine      VARCHAR(8)  NOT NULL CHECK (origine IN ('FAMILLE', 'AGENT')),
    statut       VARCHAR(10) NOT NULL DEFAULT 'NOUVELLE' CHECK (statut IN ('NOUVELLE', 'TRAITEE')),
    reponse      VARCHAR(16) CHECK (reponse IN ('RDV_PROPOSE', 'PAS_DE_PLACE', 'AUTRE_STRUCTURE')),
    cree_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
    traitee_le   TIMESTAMPTZ,
    traitee_par  BIGINT REFERENCES app_user (id)
);
-- Une seule demande ouverte par famille et par structure : pas de répétition
CREATE UNIQUE INDEX uniq_demande_ouverte ON demande_structure (structure_id, famille_id) WHERE statut = 'NOUVELLE';
CREATE INDEX idx_demande_structure ON demande_structure (structure_id, statut);

-- ---------------------------------------------------------------------------
-- Proches informés (numéro relais, père, grands-parents), avec l'accord de la famille
-- ---------------------------------------------------------------------------
CREATE TABLE contact_famille (
    id             BIGSERIAL PRIMARY KEY,
    famille_id     BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    role           VARCHAR(14) NOT NULL CHECK (role IN ('RELAIS', 'PERE', 'GRAND_PARENT', 'AUTRE_PROCHE')),
    telephone_hash CHAR(64)    NOT NULL,
    consentement   BOOLEAN     NOT NULL,
    actif          BOOLEAN     NOT NULL DEFAULT TRUE,
    cree_le        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (consentement),
    UNIQUE (famille_id, telephone_hash)
);
CREATE INDEX idx_contact_hash ON contact_famille (telephone_hash);

-- Messages envoyés à une famille (jeux, réponses des structures) ou à un proche (rappels généraux).
CREATE TABLE message_famille (
    id         BIGSERIAL PRIMARY KEY,
    famille_id BIGINT      NOT NULL REFERENCES famille (id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contact_famille (id) ON DELETE CASCADE,   -- null = téléphone de la famille
    type       VARCHAR(18) NOT NULL CHECK (type IN ('JEU', 'RAPPEL_GENERAL', 'REPONSE_STRUCTURE')),
    message    TEXT        NOT NULL,
    envoye_le  TIMESTAMPTZ NOT NULL DEFAULT now(),
    semaine    DATE,       -- lundi de la semaine, pour ne pas envoyer deux fois le jeu de la semaine
    rendez_vous_id BIGINT REFERENCES rendez_vous (id) ON DELETE CASCADE   -- rappel général lié à un rendez-vous
);
-- Un proche ne reçoit qu'un rappel par rendez-vous
CREATE UNIQUE INDEX uniq_rappel_proche ON message_famille (contact_id, rendez_vous_id)
    WHERE rendez_vous_id IS NOT NULL;
CREATE UNIQUE INDEX uniq_jeu_semaine ON message_famille (famille_id, semaine)
    WHERE type = 'JEU' AND contact_id IS NULL;
CREATE INDEX idx_message_famille ON message_famille (famille_id, envoye_le DESC);

-- ---------------------------------------------------------------------------
-- Éveil : un jeu par jour avec des objets de la maison
-- ---------------------------------------------------------------------------
CREATE TABLE jeu_eveil (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(30)  NOT NULL UNIQUE,
    titre         VARCHAR(100) NOT NULL,
    consigne      TEXT         NOT NULL,
    materiel      VARCHAR(120) NOT NULL,
    age_min_mois  INTEGER      NOT NULL CHECK (age_min_mois >= 0),
    age_max_mois  INTEGER      NOT NULL,
    a_valider     BOOLEAN      NOT NULL DEFAULT TRUE,    -- à valider avec des spécialistes de la petite enfance
    CHECK (age_max_mois >= age_min_mois)
);

CREATE TABLE activite_eveil (
    id            BIGSERIAL PRIMARY KEY,
    enfant_id     BIGINT  NOT NULL REFERENCES enfant (id) ON DELETE CASCADE,
    jeu_id        BIGINT  NOT NULL REFERENCES jeu_eveil (id),
    date_activite DATE    NOT NULL,
    UNIQUE (enfant_id, date_activite)
);

-- ===========================================================================
-- Données fictives
-- ===========================================================================
INSERT INTO jeu_eveil (code, titre, consigne, materiel, age_min_mois, age_max_mois) VALUES
 ('VISAGE',      'Visage à visage',            'Tenez bébé face à vous, à 30 cm. Souriez, parlez doucement, attendez qu''il réponde par un son ou un sourire, puis répondez-lui.', 'Aucun', 0, 5),
 ('BERCEMENT',   'La chanson du bercement',    'Chantez toujours la même chanson en le berçant doucement. Il apprend à reconnaître votre voix et le rythme.', 'Aucun', 0, 5),
 ('SUIVRE',      'Suivre des yeux',            'Montrez un tissu de couleur vive et bougez-le lentement de gauche à droite. Bébé suit des yeux. Arrêtez dès qu''il se détourne.', 'Un tissu coloré', 0, 5),
 ('MASSAGE',     'Massage en chanson',         'Après le bain, massez doucement les bras et les jambes en chantant ou en nommant chaque partie du corps.', 'Un peu d''huile végétale propre', 0, 8),
 ('HOCHET',      'Le hochet de la maison',     'Secouez un hochet fait avec une petite bouteille fermée solidement (bouchon collé) contenant quelques graines. Ne le laissez jamais à bébé sans surveillance.', 'Petite bouteille fermée, graines', 3, 11),
 ('CACHE',       'Cache-cache avec un tissu',  'Cachez votre visage derrière un tissu, puis découvrez-le en disant « coucou ! ». Laissez bébé tirer le tissu.', 'Un tissu léger', 5, 14),
 ('TOUR',        'La tour de fruits',          'Empilez deux ou trois fruits (mangues vertes, oranges) ou des boîtes vides. Laissez l''enfant les faire tomber et recommencez.', 'Fruits ou boîtes vides', 6, 18),
 ('TAPE',        'Tape et écoute',             'Tapez doucement sur une casserole avec une cuillère en bois, faites écouter, puis laissez l''enfant essayer. Variez fort et doucement.', 'Casserole, cuillère en bois', 6, 20),
 ('BALLE',       'Roule la balle',             'Asseyez-vous face à face, jambes écartées, et roulez une balle de tissu. L''enfant la renvoie.', 'Balle en tissu roulé', 6, 18),
 ('MIROIR',      'Le miroir',                  'Montrez-lui son visage dans un petit miroir. Nommez le nez, les yeux, la bouche en les touchant.', 'Un petit miroir sans bord coupant', 6, 18),
 ('PANIER',      'Mettre dedans, sortir',      'Donnez un panier et trois ou quatre objets sûrs. Montrez comment les mettre dedans, puis les sortir. Dites « dedans », « dehors ».', 'Panier, objets sûrs trop gros pour la bouche', 10, 24),
 ('CORPS',       'Où est ton nez ?',           'Demandez « où est ton nez ? », « où sont tes pieds ? » et touchez ensemble. Inversez : c''est lui qui vous montre.', 'Aucun', 10, 30),
 ('GESTES',      'Chanson avec gestes',        'Chantez une chanson que tout le monde connaît et faites les gestes. Ralentissez pour qu''il imite.', 'Aucun', 8, 36),
 ('CACHETTE',    'L''objet caché',             'Cachez un jouet sous un tissu devant l''enfant et demandez « où est-il ? ». Puis cachez-le sous l''un de deux tissus.', 'Un jouet, deux tissus', 12, 30),
 ('GRAINES',     'Compter les graines',        'Comptez avec lui trois à cinq grosses graines, en les déplaçant une à une. Surveillez toujours : jamais dans la bouche.', 'Grosses graines (haricots)', 24, 60),
 ('TRIER',       'Trier les feuilles',         'Ramassez des feuilles, des cailloux lisses, des bouts de bois. Triez par taille ou par couleur : « grand », « petit », « pareil ».', 'Feuilles, cailloux', 24, 60),
 ('HISTOIRE',    'L''histoire du jour',        'Racontez une courte histoire de chez vous. Arrêtez-vous avant la fin et demandez : « et ensuite ? ».', 'Aucun', 18, 60),
 ('LIGNE',       'Marcher sur la ligne',       'Tracez une ligne par terre. Marchez dessus un pied devant l''autre, puis à reculons, puis en sautant au bout.', 'Un bâton pour tracer', 24, 60),
 ('SABLE',       'Pâtés de terre',             'Remplissez un petit récipient de terre humide, retournez-le pour faire un pâté. Comptez les pâtés, comparez-les.', 'Terre humide, récipient', 18, 60),
 ('DEVINETTE',   'La devinette des sons',      'Fermez les yeux ensemble. Faites un bruit (porte, eau, pas). L''enfant devine, puis c''est son tour.', 'Aucun', 30, 60);

-- Structures fictives (noms et numéros inventés)
INSERT INTO structure (code, type, nom, zone_id, telephone, horaires, services, besoins_specifiques)
SELECT v.code, v.type, v.nom, z.id, v.tel, v.horaires, v.services, v.besoins
FROM (VALUES
 ('CS-GOLFE',  'CENTRE_SANTE',  'Centre de santé du Golfe (fictif)',        'GOLFE', '+228 00 00 00 01', 'Lun-Sam 7h-17h', 'Vaccination, consultation prénatale, pesée, nutrition', FALSE),
 ('CS-AGOE',   'CENTRE_SANTE',  'Centre de santé d''Agoè (fictif)',         'AGOE',  '+228 00 00 00 02', 'Lun-Sam 7h-17h', 'Vaccination, consultation prénatale, pesée', FALSE),
 ('CS-ZIO',    'CENTRE_SANTE',  'Centre de santé de Zio (fictif)',          'ZIO',   '+228 00 00 00 03', 'Lun-Ven 8h-16h', 'Vaccination, consultation prénatale', FALSE),
 ('CS-VO',     'CENTRE_SANTE',  'Centre de santé de Vo (fictif)',           'VO',    '+228 00 00 00 04', 'Lun-Ven 8h-16h', 'Vaccination, pesée, nutrition', FALSE),
 ('CS-YOTO',   'CENTRE_SANTE',  'Centre de santé de Yoto (fictif)',         'YOTO',  '+228 00 00 00 05', 'Lun-Ven 8h-15h', 'Vaccination, pesée', FALSE),
 ('CS-LACS',   'CENTRE_SANTE',  'Centre de santé des Lacs (fictif)',        'LACS',  '+228 00 00 00 06', 'Lun-Ven 8h-16h', 'Vaccination, consultation prénatale', FALSE),
 ('CR-GOLFE',  'CRECHE',        'Crèche communautaire du Golfe (fictive)',  'GOLFE', '+228 00 00 00 11', 'Lun-Ven 7h-17h', 'Accueil de 1 à 5 ans, éveil, repas', FALSE),
 ('CR-AGOE',   'CRECHE',        'Crèche inclusive d''Agoè (fictive)',       'AGOE',  '+228 00 00 00 12', 'Lun-Ven 7h-16h', 'Accueil de 2 à 5 ans, éveil, accompagnement adapté', TRUE),
 ('CSO-GOLFE', 'CENTRE_SOCIAL', 'Centre social du Golfe (fictif)',          'GOLFE', '+228 00 00 00 21', 'Lun-Ven 8h-15h', 'Orientation, aides sociales, enfants à besoins spécifiques', TRUE),
 ('CSO-ZIO',   'CENTRE_SOCIAL', 'Centre social de Zio (fictif)',            'ZIO',   '+228 00 00 00 22', 'Mar et Jeu 8h-14h', 'Orientation, aides sociales', FALSE),
 ('CSO-VO',    'CENTRE_SOCIAL', 'Centre social de Vo (fictif)',             'VO',    '+228 00 00 00 23', 'Mer 8h-14h',       'Orientation, aides sociales', FALSE),
 ('EC-GOLFE',  'ETAT_CIVIL',    'État civil du Golfe (fictif)',             'GOLFE', '+228 00 00 00 31', 'Lun-Ven 8h-15h', 'Déclaration de naissance (gratuite sous 45 jours)', FALSE),
 ('EC-ZIO',    'ETAT_CIVIL',    'État civil de Zio (fictif)',               'ZIO',   '+228 00 00 00 32', 'Lun-Ven 8h-15h', 'Déclaration de naissance (gratuite sous 45 jours)', FALSE),
 ('EC-VO',     'ETAT_CIVIL',    'État civil de Vo (fictif)',                'VO',    '+228 00 00 00 33', 'Lun-Jeu 8h-14h', 'Déclaration de naissance (gratuite sous 45 jours)', FALSE)
) AS v (code, type, nom, zone, tel, horaires, services, besoins)
JOIN zone z ON z.code = v.zone;

-- Proches : numéros de démonstration 91000001, 91000002, 91000046 (hash SHA-256 de "fildor-demo-pepper" + numéro)
INSERT INTO contact_famille (famille_id, role, telephone_hash, consentement)
SELECT f.id, v.role, encode(sha256(convert_to('fildor-demo-pepper' || v.numero, 'UTF8')), 'hex'), TRUE
FROM (VALUES ('F-0001', 'PERE', '91000001'), ('F-0002', 'GRAND_PARENT', '91000002'), ('F-0046', 'RELAIS', '91000046')) AS v (code, role, numero)
JOIN famille f ON f.code_famille = v.code;

INSERT INTO message_famille (famille_id, contact_id, type, message, envoye_le)
SELECT c.famille_id, c.id, 'RAPPEL_GENERAL',
       'Fil d''Or : un rendez-vous de santé approche pour un enfant de la famille. Le détail est donné par l''agent de santé.',
       now() - interval '1 day'
FROM contact_famille c;

-- Quelques activités d'éveil des 7 derniers jours (zones urbaines) pour que la carte ait des chiffres
INSERT INTO activite_eveil (enfant_id, jeu_id, date_activite)
SELECT e.id, (SELECT j.id FROM jeu_eveil j WHERE j.age_min_mois <= 12 ORDER BY j.id LIMIT 1), current_date - (e.id % 6)::int
FROM enfant e JOIN famille f ON f.id = e.famille_id
WHERE e.statut = 'ENFANT' AND f.zone_id <= 3 AND e.id % 3 <> 0
  AND e.date_naissance <= current_date - 183 AND e.date_naissance >= current_date - 1790
ON CONFLICT DO NOTHING;
