-- Identité des parents prise dès les consultations prénatales (avec l'accord de chacun),
-- nom de l'enfant donné à partir du 8e jour, messages par langue.

CREATE TABLE identite_parents (
    enfant_id            BIGINT PRIMARY KEY REFERENCES enfant (id) ON DELETE CASCADE,
    mere_nom             VARCHAR(120),
    conjoint_nom         VARCHAR(120),
    piece_type           VARCHAR(16) CHECK (piece_type IN ('CARTE_ELECTEUR', 'CNI', 'PASSEPORT', 'CARTE_SANTE', 'AUCUNE')),
    piece_numero         VARCHAR(40),
    nationalite_mere     VARCHAR(40),
    nationalite_conjoint VARCHAR(40),
    accord_mere          BOOLEAN     NOT NULL DEFAULT FALSE,
    accord_conjoint      BOOLEAN     NOT NULL DEFAULT FALSE,
    saisi_par            BIGINT REFERENCES app_user (id),
    saisi_le             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE declaration_naissance ADD COLUMN IF NOT EXISTS prenom_enfant VARCHAR(60);
ALTER TABLE declaration_naissance ADD COLUMN IF NOT EXISTS prenom_donne_le TIMESTAMPTZ;

-- Un modèle de message par code et par langue. Sans traduction, le message part en français.
CREATE TABLE modele_message (
    code           VARCHAR(30) NOT NULL,
    langue         VARCHAR(8)  NOT NULL CHECK (langue IN ('fr', 'ewe', 'kabye', 'tem')),
    texte          TEXT        NOT NULL,
    a_valider      BOOLEAN     NOT NULL DEFAULT TRUE,
    mis_a_jour_le  TIMESTAMPTZ NOT NULL DEFAULT now(),
    mis_a_jour_par BIGINT REFERENCES app_user (id),
    PRIMARY KEY (code, langue)
);

INSERT INTO modele_message (code, langue, texte, a_valider) VALUES
 ('RAPPEL_RDV',    'fr', 'Fil d''Or : rendez-vous le {date} au centre de santé ({libelle}). Apportez le carnet.', FALSE),
 ('RAPPEL_MANQUE', 'fr', 'Fil d''Or : le rendez-vous du {date} n''a pas eu lieu. Il n''est pas trop tard : passez au centre de santé avec le carnet.', FALSE),
 ('JEU_SEMAINE',   'fr', 'Fil d''Or : le jeu de la semaine pour votre enfant : {titre}. {consigne}', FALSE),
 ('ACTE_PRET',     'fr', 'Fil d''Or : l''acte de naissance de votre enfant est prêt. Retirez-le à l''état civil avec une pièce d''identité.', FALSE),
 ('NOM_ENFANT',    'fr', 'Fil d''Or : l''enfant a 8 jours. Donnez son nom à l''agent de santé ou au centre de santé pour compléter sa déclaration de naissance.', FALSE);
