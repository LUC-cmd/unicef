-- La mairie prévient la famille par SMS simulé quand elle valide ou rejette une déclaration.
ALTER TABLE message_famille DROP CONSTRAINT IF EXISTS message_famille_type_check;
ALTER TABLE message_famille ADD CONSTRAINT message_famille_type_check
    CHECK (type IN ('JEU', 'RAPPEL_GENERAL', 'REPONSE_STRUCTURE', 'NAISSANCE'));
