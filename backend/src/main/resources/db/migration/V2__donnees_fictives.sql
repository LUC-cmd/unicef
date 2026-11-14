-- Données FICTIVES pour la démonstration. Aucune personne réelle.
-- Les dates sont relatives à la date du jour : la démo reste vivante quel que soit le jour où on la lance.
-- Les téléphones de démo sont 90000001 à 90000045 (hash SHA-256 de "fildor-demo-pepper" + numéro).

SELECT setseed(0.42);

INSERT INTO zone (code, nom, region, latitude, longitude, couverture_reseau) VALUES
 ('GOLFE',   'Golfe (Lomé)',       'Maritime', 6.137, 1.222, 'INCONNUE'),
 ('AGOE',    'Agoè-Nyivé',         'Maritime', 6.230, 1.210, 'INCONNUE'),
 ('ZIO',     'Zio (Tsévié)',       'Maritime', 6.426, 1.213, 'INCONNUE'),
 ('VO',      'Vo (Vogan)',         'Maritime', 6.337, 1.532, 'INCONNUE'),
 ('YOTO',    'Yoto (Tabligbo)',    'Maritime', 6.585, 1.504, 'INCONNUE'),
 ('LACS',    'Lacs (Aného)',       'Maritime', 6.230, 1.595, 'INCONNUE');

-- 60 familles : 1-30 urbaines avec téléphone, 31-45 rurales avec téléphone, 46-60 rurales sans téléphone
INSERT INTO famille (code_famille, zone_id, langue, porte, a_telephone, telephone_hash, consentement, consentement_le)
SELECT 'F-' || lpad(i::text, 4, '0'),
       CASE WHEN i <= 30 THEN 1 + (i % 3) ELSE 4 + (i % 3) END,
       (ARRAY['fr', 'ewe', 'ewe', 'kabye', 'tem'])[1 + (i % 5)],
       CASE WHEN i <= 45 THEN (CASE WHEN i % 9 = 0 THEN 'POINT_ECOUTE' ELSE 'VOIX_SMS' END)
            WHEN i % 3 = 0 THEN 'CARNET' ELSE 'AGENT' END,
       i <= 45,
       CASE WHEN i <= 45
            THEN encode(sha256(convert_to('fildor-demo-pepper' || '9000' || lpad(i::text, 4, '0'), 'UTF8')), 'hex') END,
       TRUE,
       now() - make_interval(days => 5 + (i % 40))
FROM generate_series(1, 60) AS i;

-- Un enfant par famille, un second pour une famille sur quatre
INSERT INTO enfant (famille_id, code_enfant, statut, date_naissance, sexe)
SELECT f.id, 'T' || lpad(f.id::text, 3, '0') || 'A', 'ENFANT',
       current_date - (10 + floor(random() * 1400))::int,
       CASE WHEN random() < 0.5 THEN 'F' ELSE 'M' END
FROM famille f;

INSERT INTO enfant (famille_id, code_enfant, statut, date_naissance, sexe)
SELECT f.id, 'T' || lpad(f.id::text, 3, '0') || 'B', 'ENFANT',
       current_date - (10 + floor(random() * 700))::int,
       CASE WHEN random() < 0.5 THEN 'F' ELSE 'M' END
FROM famille f WHERE f.id % 4 = 0;

-- Une famille sur sept attend un enfant
INSERT INTO enfant (famille_id, code_enfant, statut, date_terme_prevue)
SELECT f.id, 'T' || lpad(f.id::text, 3, '0') || 'G', 'GROSSESSE',
       current_date + (20 + floor(random() * 180))::int
FROM famille f WHERE f.id % 7 = 0;

-- Calendrier vaccinal indicatif (à valider avec le PEV du ministère de la Santé)
INSERT INTO rendez_vous (enfant_id, type, libelle, date_prevue, statut, date_realisation)
SELECT x.id, 'VACCIN', x.libelle, x.dp,
       CASE WHEN x.dp > current_date THEN 'PLANIFIE'
            WHEN x.dp < current_date - 420 OR random() < x.p THEN 'REALISE'
            ELSE 'MANQUE' END,
       NULL
FROM (
    SELECT e.id, v.libelle, e.date_naissance + v.jours AS dp,
           CASE WHEN z.id <= 3 THEN 0.92 ELSE 0.55 END AS p
    FROM enfant e
    JOIN famille f ON f.id = e.famille_id
    JOIN zone z ON z.id = f.zone_id
    CROSS JOIN (VALUES
        ('BCG et polio 0 (naissance)', 0),
        ('Penta 1, pneumo 1, polio 1, rota 1', 42),
        ('Penta 2, pneumo 2, polio 2, rota 2', 70),
        ('Penta 3, pneumo 3, polio 3, VPI', 98),
        ('Rougeole-rubéole et fièvre jaune', 274)
    ) AS v (libelle, jours)
    WHERE e.statut = 'ENFANT'
) x;

UPDATE rendez_vous SET date_realisation = date_prevue + (id % 4)::int WHERE statut = 'REALISE';
UPDATE rendez_vous SET date_realisation = current_date WHERE statut = 'REALISE' AND date_realisation > current_date;

-- Consultations prénatales
INSERT INTO rendez_vous (enfant_id, type, libelle, date_prevue, statut, date_realisation)
SELECT e.id, 'CONSULTATION_PRENATALE', c.libelle, e.date_terme_prevue + c.jours,
       CASE WHEN e.date_terme_prevue + c.jours > current_date THEN 'PLANIFIE'
            WHEN random() < 0.7 THEN 'REALISE' ELSE 'MANQUE' END,
       NULL
FROM enfant e
CROSS JOIN (VALUES ('Consultation prénatale', -150), ('Consultation prénatale', -100),
                   ('Consultation prénatale', -60), ('Consultation prénatale', -30)) AS c (libelle, jours)
WHERE e.statut = 'GROSSESSE';
UPDATE rendez_vous SET date_realisation = date_prevue WHERE statut = 'REALISE' AND date_realisation IS NULL;

-- Un rendez-vous tout proche pour que la démo montre un rappel à envoyer
UPDATE rendez_vous SET date_prevue = current_date + 1
WHERE id IN (SELECT r.id FROM rendez_vous r JOIN enfant e ON e.id = r.enfant_id
             WHERE r.statut = 'PLANIFIE' AND r.type = 'VACCIN' ORDER BY r.id LIMIT 6);

-- Rappels : SMS pour les familles avec téléphone (rendez-vous manqués récents ou à venir)
INSERT INTO rappel (rendez_vous_id, canal, message, envoye_le, statut, acquitte_le)
SELECT r.id, 'SMS',
       'Fil d''Or : rendez-vous le ' || to_char(r.date_prevue, 'DD/MM') || ' au centre de santé (' || r.libelle || '). Apportez le carnet.',
       (r.date_prevue - 1)::timestamptz,
       CASE WHEN r.statut = 'PLANIFIE' THEN 'ENVOYE'
            WHEN random() < 0.6 THEN 'SANS_REPONSE' ELSE 'ACQUITTE' END,
       NULL
FROM rendez_vous r
JOIN enfant e ON e.id = r.enfant_id
JOIN famille f ON f.id = e.famille_id
WHERE f.a_telephone
  AND ((r.statut = 'MANQUE' AND r.date_prevue >= current_date - 120)
       OR (r.statut = 'PLANIFIE' AND r.date_prevue <= current_date + 2));
UPDATE rappel SET acquitte_le = envoye_le + interval '3 hours' WHERE statut = 'ACQUITTE';

-- Visites avec mesure du périmètre brachial (enfants de 6 à 59 mois)
INSERT INTO visite (client_uuid, enfant_id, agent_id, date_visite, muac_mm, signes_danger)
SELECT gen_random_uuid(), e.id, NULL, current_date - (3 + floor(random() * 50))::int,
       CASE WHEN q.r < 0.08 THEN 100 + floor(random() * 15)::int
            WHEN q.r < 0.20 THEN 115 + floor(random() * 10)::int
            ELSE 125 + floor(random() * 45)::int END,
       FALSE
FROM enfant e
CROSS JOIN LATERAL (SELECT random() AS r) q
WHERE e.statut = 'ENFANT'
  AND e.date_naissance <= current_date - 183 AND e.date_naissance >= current_date - 1790
  AND e.id % 2 = 0;

-- Déclarations de naissance : environ deux enfants sur trois de moins de deux ans
INSERT INTO declaration_naissance (enfant_id, statut, lieu_naissance, certificat_accouchement, numero_recu,
                                   envoyee_le, dans_delai_gratuit, traitee_le, motif_rejet)
SELECT s.id, s.statut, s.lieu, s.lieu = 'CENTRE_SANTE',
       'FDO-' || to_char(s.envoyee, 'YYYYMMDD') || '-' || lpad(s.id::text, 6, '0'),
       s.envoyee, (s.envoyee::date - s.date_naissance) <= 45,
       CASE WHEN s.statut IN ('VALIDEE', 'REJETEE') THEN LEAST(s.envoyee + interval '2 days', now()) END,
       CASE WHEN s.statut = 'REJETEE' THEN 'Pièce manquante : certificat d''accouchement' END
FROM (
    SELECT e.id, e.date_naissance,
           CASE WHEN q.a < 0.60 THEN 'VALIDEE' WHEN q.a < 0.90 THEN 'ENVOYEE' ELSE 'REJETEE' END AS statut,
           CASE WHEN q.b < 0.7 THEN 'CENTRE_SANTE' ELSE 'DOMICILE' END AS lieu,
           LEAST((e.date_naissance + (q.c * 70)::int)::timestamptz, now()) AS envoyee
    FROM enfant e
    CROSS JOIN LATERAL (SELECT random() AS a, random() AS b, random() AS c) q
    WHERE e.statut = 'ENFANT' AND e.date_naissance >= current_date - 700 AND random() < 0.65
) s;

-- Contenus de santé (français). Les voix en éwé, kabyè et tem restent à enregistrer avec des locuteurs natifs.
-- Tous les contenus sont à valider par un professionnel de santé avant diffusion (a_valider = TRUE).
INSERT INTO contenu (sujet, langue, titre, texte) VALUES
('GROSSESSE', 'fr', 'Pendant la grossesse',
 'Allez à la consultation prénatale dès que possible, puis à chaque rendez-vous. Mangez varié, buvez de l''eau propre et dormez sous une moustiquaire. En cas de saignement, de forte douleur, de fièvre ou si le bébé bouge moins, allez tout de suite au centre de santé.'),
('NOUVEAU_NE', 'fr', 'Le nouveau-né',
 'Gardez bébé au chaud, peau contre peau. Lavez-vous les mains avant de le toucher et gardez le cordon propre et sec. Présentez-le au centre de santé pour ses vaccins de naissance. S''il ne tète plus, a de la fièvre ou respire vite, allez tout de suite au centre de santé.'),
('ALLAITEMENT', 'fr', 'L''allaitement',
 'Jusqu''à 6 mois, le lait de la mère suffit : ni eau, ni autre aliment. Donnez le sein à la demande, de jour comme de nuit. Si vous avez mal ou si vous avez des questions, parlez-en à l''agent de santé.'),
('VACCINS', 'fr', 'Les vaccins',
 'Les vaccins protègent votre enfant de maladies graves. Apportez le carnet à chaque rendez-vous. Si un vaccin a été manqué, allez au centre de santé : il n''est pas trop tard, on reprend là où on s''est arrêté.'),
('NUTRITION', 'fr', 'Bien nourrir son enfant',
 'À partir de 6 mois, continuez l''allaitement et ajoutez des bouillies enrichies, des légumes, des fruits, des œufs, du poisson ou des légumineuses, en petites quantités, plusieurs fois par jour. Le ruban de l''agent permet de repérer tôt un enfant qui maigrit.'),
('HYGIENE', 'fr', 'L''hygiène',
 'Lavez-vous les mains à l''eau et au savon avant de préparer les repas, avant de donner à manger et après les toilettes. Utilisez de l''eau propre et gardez-la couverte.'),
('NAISSANCE', 'fr', 'Déclarer la naissance',
 'Déclarez la naissance dans les 45 jours : c''est gratuit. Après ce délai, il faut un jugement supplétif qui coûte 6 000 francs CFA. L''agent de santé peut lancer la déclaration avec vous.'),
('EVEIL', 'fr', 'Un jeu par jour',
 'Parlez à votre enfant, chantez, racontez des histoires. Jouez avec ce que vous avez à la maison : comptez des graines, empilez des fruits, cachez un objet sous un tissu. Dix minutes par jour suffisent.'),
('DANGER', 'fr', 'Signes de danger',
 'Ceci n''est pas un diagnostic. Allez tout de suite au centre de santé le plus proche si l''enfant ne boit ou ne tète plus, vomit tout, a des convulsions, est très faible ou difficile à réveiller, respire difficilement, ou s''il a de la fièvre et moins de 2 mois. Pour une femme enceinte : saignement, fièvre, forte douleur ou maux de tête avec vue trouble.');
