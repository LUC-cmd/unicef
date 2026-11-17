-- Compte famille : la famille peut indiquer combien d'enfants elle a (l'agent inscrit ceux qui ne sont pas encore suivis).
ALTER TABLE famille ADD COLUMN enfants_declares SMALLINT CHECK (enfants_declares BETWEEN 0 AND 20);
