-- Géographie complète du Togo : 5 régions, 39 préfectures (RGPH-5, 2022). Une zone de Fil d'Or = une préfecture.
-- Les coordonnées sont celles d'un centre approximatif (jamais un point précis). Le pilote commence par la région Maritime.
ALTER TABLE zone ADD COLUMN IF NOT EXISTS chef_lieu VARCHAR(60);
ALTER TABLE zone ADD COLUMN IF NOT EXISTS pilote BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS region VARCHAR(60);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS cree_le TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS doit_changer_mdp BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO zone (code, nom, region, chef_lieu, latitude, longitude, couverture_reseau) VALUES
 ('GOLFE', 'Golfe (Lomé)', 'Maritime', 'Lomé', 6.137, 1.222, 'INCONNUE'),
 ('AGOE', 'Agoè-Nyivé', 'Maritime', 'Agoè', 6.23, 1.21, 'INCONNUE'),
 ('ZIO', 'Zio (Tsévié)', 'Maritime', 'Tsévié', 6.426, 1.213, 'INCONNUE'),
 ('VO', 'Vo (Vogan)', 'Maritime', 'Vogan', 6.337, 1.532, 'INCONNUE'),
 ('YOTO', 'Yoto (Tabligbo)', 'Maritime', 'Tabligbo', 6.585, 1.504, 'INCONNUE'),
 ('LACS', 'Lacs (Aného)', 'Maritime', 'Aného', 6.23, 1.595, 'INCONNUE'),
 ('AVE', 'Avé (Kévé)', 'Maritime', 'Kévé', 6.39, 1.0, 'INCONNUE'),
 ('BASMONO', 'Bas-Mono (Afagnan)', 'Maritime', 'Afagnan', 6.47, 1.7, 'INCONNUE'),
 ('KLOTO', 'Kloto (Kpalimé)', 'Plateaux', 'Kpalimé', 6.9, 0.63, 'INCONNUE'),
 ('AGOU', 'Agou', 'Plateaux', 'Agou-Gadzépé', 6.85, 0.73, 'INCONNUE'),
 ('DANYI', 'Danyi', 'Plateaux', 'Danyi-Apéyémé', 7.2, 0.72, 'INCONNUE'),
 ('AMOU', 'Amou (Amlamé)', 'Plateaux', 'Amlamé', 7.35, 0.9, 'INCONNUE'),
 ('HAHO', 'Haho (Notsé)', 'Plateaux', 'Notsé', 6.95, 1.17, 'INCONNUE'),
 ('ESTMONO', 'Est-Mono (Elavagnon)', 'Plateaux', 'Elavagnon', 7.6, 1.35, 'INCONNUE'),
 ('MOYENMONO', 'Moyen-Mono (Tohoun)', 'Plateaux', 'Tohoun', 6.98, 1.52, 'INCONNUE'),
 ('OGOU', 'Ogou (Atakpamé)', 'Plateaux', 'Atakpamé', 7.53, 1.13, 'INCONNUE'),
 ('WAWA', 'Wawa (Badou)', 'Plateaux', 'Badou', 7.58, 0.6, 'INCONNUE'),
 ('AKEBOU', 'Akébou (Kougnohou)', 'Plateaux', 'Kougnohou', 7.4, 0.7, 'INCONNUE'),
 ('ANIE', 'Anié', 'Plateaux', 'Anié', 7.73, 1.19, 'INCONNUE'),
 ('KPELE', 'Kpélé (Kpélé-Adéta)', 'Plateaux', 'Kpélé-Adéta', 7.1, 0.6, 'INCONNUE'),
 ('TCHAOUDJO', 'Tchaoudjo (Sokodé)', 'Centrale', 'Sokodé', 8.98, 1.13, 'INCONNUE'),
 ('SOTOUBOUA', 'Sotouboua', 'Centrale', 'Sotouboua', 8.57, 0.98, 'INCONNUE'),
 ('BLITTA', 'Blitta', 'Centrale', 'Blitta', 8.32, 0.98, 'INCONNUE'),
 ('TCHAMBA', 'Tchamba', 'Centrale', 'Tchamba', 9.03, 1.42, 'INCONNUE'),
 ('MO', 'Mô (Djarkpanga)', 'Centrale', 'Djarkpanga', 8.85, 0.65, 'INCONNUE'),
 ('KOZAH', 'Kozah (Kara)', 'Kara', 'Kara', 9.551, 1.186, 'INCONNUE'),
 ('BINAH', 'Binah (Pagouda)', 'Kara', 'Pagouda', 9.68, 1.23, 'INCONNUE'),
 ('DOUFELGOU', 'Doufelgou (Niamtougou)', 'Kara', 'Niamtougou', 9.77, 1.1, 'INCONNUE'),
 ('KERAN', 'Kéran (Kandé)', 'Kara', 'Kandé', 9.95, 1.65, 'INCONNUE'),
 ('DANKPEN', 'Dankpen (Guérin-Kouka)', 'Kara', 'Guérin-Kouka', 9.75, 0.93, 'INCONNUE'),
 ('BASSAR', 'Bassar', 'Kara', 'Bassar', 9.25, 0.78, 'INCONNUE'),
 ('ASSOLI', 'Assoli (Bafilo)', 'Kara', 'Bafilo', 9.35, 1.27, 'INCONNUE'),
 ('TONE', 'Tône (Dapaong)', 'Savanes', 'Dapaong', 10.86, 0.21, 'INCONNUE'),
 ('KPENDJAL', 'Kpendjal (Mandouri)', 'Savanes', 'Mandouri', 10.88, 0.81, 'INCONNUE'),
 ('KPENDJALO', 'Kpendjal-Ouest (Naki-Est)', 'Savanes', 'Naki-Est', 10.7, 0.56, 'INCONNUE'),
 ('OTI', 'Oti (Mango)', 'Savanes', 'Mango', 10.357, 0.471, 'INCONNUE'),
 ('OTISUD', 'Oti-Sud (Gando)', 'Savanes', 'Gando', 10.325, 0.758, 'INCONNUE'),
 ('TANDJOUARE', 'Tandjouaré (Tandjouaré)', 'Savanes', 'Tandjouaré', 10.65, 0.32, 'INCONNUE'),
 ('CINKASSE', 'Cinkassé', 'Savanes', 'Cinkassé', 11.1, 0.02, 'INCONNUE')
ON CONFLICT (code) DO UPDATE SET chef_lieu = EXCLUDED.chef_lieu, region = EXCLUDED.region;

UPDATE zone SET pilote = (region = 'Maritime');
UPDATE app_user SET region = 'Maritime' WHERE role = 'DECIDEUR' AND region IS NULL;

UPDATE zone SET latitude = 6.270 WHERE code = 'AGOE';
