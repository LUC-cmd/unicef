-- Localisation des structures : latitude et longitude réelles.
-- La famille (ou l'agent) peut suivre un itinéraire vers la crèche ou le centre de santé depuis l'application.
-- Pour la démonstration, les coordonnées partent du chef-lieu de la zone (réel) avec un petit décalage par
-- structure, car les structures sont fictives. En déploiement, chaque structure entre SES coordonnées réelles
-- (elles sont modifiables dans sa fiche) ; la famille n'a jamais de coordonnée enregistrée, elle reste anonyme.
ALTER TABLE structure ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9,6);
ALTER TABLE structure ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

UPDATE structure s SET latitude  = z.latitude  + 0.0025 + (s.id % 7) * 0.0011,
                      longitude = z.longitude + 0.0020 - (s.id % 5) * 0.0009
FROM zone z
WHERE s.zone_id = z.id;
