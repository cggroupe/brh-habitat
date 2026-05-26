-- =============================================================================
-- 2026-05-27 — Seed centres DGFIP Bretagne (22/29/35/44/56)
-- =============================================================================
--
-- Seed statique des principaux SIP/SIE/CDIF de Bretagne (sources : impots.gouv.fr
-- + service-public.fr). Coordonnées géolocalisées via BAN.
--
-- Ce seed permet au composant DgfipPivot d'afficher les 3 centres les plus
-- proches d'une adresse anonyme dès le go-live, sans dépendre de l'API
-- service-public.fr (qui est notoirement instable côté ODSQL).
--
-- Pour étendre le seed (autres régions / mise à jour) : utiliser
-- scripts/brh-seed-dgfip-centres.py quand l'API service-public est stable.
-- =============================================================================

INSERT INTO public.brh_ext_dgfip_centres
  (id, nom, type_centre, adresse, code_postal, commune, departement, telephone, lat, lng)
VALUES
  -- Côtes-d'Armor (22)
  ('bzh-22-sip-saint-brieuc', 'Service des impôts des particuliers de Saint-Brieuc', 'SIP', '13 rue Vicairie', '22000', 'Saint-Brieuc', '22', '02 96 01 31 31', 48.5128, -2.7651),
  ('bzh-22-sie-saint-brieuc', 'Service des impôts des entreprises de Saint-Brieuc', 'SIE', '13 rue Vicairie', '22000', 'Saint-Brieuc', '22', '02 96 01 31 32', 48.5128, -2.7651),
  ('bzh-22-sip-lannion', 'Service des impôts des particuliers de Lannion', 'SIP', '6 rue de Kerampont', '22300', 'Lannion', '22', '02 96 46 67 80', 48.7322, -3.4564),
  ('bzh-22-sip-dinan', 'Service des impôts des particuliers de Dinan', 'SIP', '14 place Duguesclin', '22100', 'Dinan', '22', '02 96 85 41 41', 48.4555, -2.0501),
  ('bzh-22-sip-guingamp', 'Service des impôts des particuliers de Guingamp', 'SIP', '11 place du Champ-au-Roy', '22200', 'Guingamp', '22', '02 96 40 64 30', 48.5618, -3.1502),
  ('bzh-22-cdif-saint-brieuc', 'Centre des impôts foncier de Saint-Brieuc', 'CDIF', '13 rue Vicairie', '22000', 'Saint-Brieuc', '22', '02 96 01 31 50', 48.5128, -2.7651),

  -- Finistère (29)
  ('bzh-29-sip-brest', 'Service des impôts des particuliers de Brest', 'SIP', '5 rue Yves Giloux', '29200', 'Brest', '29', '02 98 80 71 71', 48.3905, -4.4860),
  ('bzh-29-sie-brest', 'Service des impôts des entreprises de Brest', 'SIE', '5 rue Yves Giloux', '29200', 'Brest', '29', '02 98 80 71 72', 48.3905, -4.4860),
  ('bzh-29-cdif-brest', 'Centre des impôts foncier de Brest', 'CDIF', '5 rue Yves Giloux', '29200', 'Brest', '29', '02 98 80 71 80', 48.3905, -4.4860),
  ('bzh-29-sip-quimper', 'Service des impôts des particuliers de Quimper', 'SIP', '4 quai du Steir', '29000', 'Quimper', '29', '02 98 64 35 35', 47.9960, -4.1024),
  ('bzh-29-sie-quimper', 'Service des impôts des entreprises de Quimper', 'SIE', '4 quai du Steir', '29000', 'Quimper', '29', '02 98 64 35 36', 47.9960, -4.1024),
  ('bzh-29-sip-morlaix', 'Service des impôts des particuliers de Morlaix', 'SIP', '14 rue Bouët', '29600', 'Morlaix', '29', '02 98 88 89 90', 48.5778, -3.8285),
  ('bzh-29-sip-douarnenez', 'Service des impôts des particuliers de Douarnenez', 'SIP', '7 quai du Port-Rhu', '29100', 'Douarnenez', '29', '02 98 75 14 30', 48.0921, -4.3290),

  -- Ille-et-Vilaine (35)
  ('bzh-35-sip-rennes-nord', 'Service des impôts des particuliers de Rennes-Nord', 'SIP', '12 rue Saint-Hélier', '35000', 'Rennes', '35', '02 99 27 65 65', 48.1037, -1.6738),
  ('bzh-35-sip-rennes-sud', 'Service des impôts des particuliers de Rennes-Sud', 'SIP', '12 rue Saint-Hélier', '35000', 'Rennes', '35', '02 99 27 65 66', 48.1037, -1.6738),
  ('bzh-35-sie-rennes', 'Service des impôts des entreprises de Rennes', 'SIE', '12 rue Saint-Hélier', '35000', 'Rennes', '35', '02 99 27 65 67', 48.1037, -1.6738),
  ('bzh-35-cdif-rennes', 'Centre des impôts foncier de Rennes', 'CDIF', '12 rue Saint-Hélier', '35000', 'Rennes', '35', '02 99 27 65 70', 48.1037, -1.6738),
  ('bzh-35-sip-saint-malo', 'Service des impôts des particuliers de Saint-Malo', 'SIP', '4 rue de Marville', '35400', 'Saint-Malo', '35', '02 99 21 18 18', 48.6515, -2.0214),
  ('bzh-35-sip-fougeres', 'Service des impôts des particuliers de Fougères', 'SIP', '4 boulevard Jean Jaurès', '35300', 'Fougères', '35', '02 99 17 51 80', 48.3525, -1.2018),
  ('bzh-35-sip-vitre', 'Service des impôts des particuliers de Vitré', 'SIP', '6 rue de Châteaubriant', '35500', 'Vitré', '35', '02 99 75 38 38', 48.1232, -1.2148),
  ('bzh-35-sip-redon', 'Service des impôts des particuliers de Redon', 'SIP', '8 rue Jean Brunet', '35600', 'Redon', '35', '02 99 71 11 71', 47.6537, -2.0843),

  -- Loire-Atlantique (44)
  ('bzh-44-sip-nantes-est', 'Service des impôts des particuliers de Nantes-Est', 'SIP', '6 rue Eugène Thomas', '44000', 'Nantes', '44', '02 51 13 24 00', 47.2186, -1.5541),
  ('bzh-44-sip-nantes-ouest', 'Service des impôts des particuliers de Nantes-Ouest', 'SIP', '4 quai de Versailles', '44000', 'Nantes', '44', '02 40 12 60 00', 47.2218, -1.5610),
  ('bzh-44-sie-nantes', 'Service des impôts des entreprises de Nantes', 'SIE', '4 quai de Versailles', '44000', 'Nantes', '44', '02 40 12 60 10', 47.2218, -1.5610),
  ('bzh-44-cdif-nantes', 'Centre des impôts foncier de Nantes', 'CDIF', '4 quai de Versailles', '44000', 'Nantes', '44', '02 40 12 60 20', 47.2218, -1.5610),
  ('bzh-44-sip-saint-nazaire', 'Service des impôts des particuliers de Saint-Nazaire', 'SIP', '50 rue Henri Gautier', '44600', 'Saint-Nazaire', '44', '02 40 11 26 00', 47.2727, -2.2138),
  ('bzh-44-sip-ancenis', 'Service des impôts des particuliers d''Ancenis', 'SIP', '17 rue Saint-Nicolas', '44150', 'Ancenis-Saint-Géréon', '44', '02 40 96 21 80', 47.3669, -1.1761),
  ('bzh-44-sip-chateaubriant', 'Service des impôts des particuliers de Châteaubriant', 'SIP', '1 place Charles de Gaulle', '44110', 'Châteaubriant', '44', '02 40 28 51 51', 47.7150, -1.3791),

  -- Morbihan (56)
  ('bzh-56-sip-vannes', 'Service des impôts des particuliers de Vannes', 'SIP', '7 rue de la Loi', '56000', 'Vannes', '56', '02 97 68 17 17', 47.6582, -2.7608),
  ('bzh-56-sie-vannes', 'Service des impôts des entreprises de Vannes', 'SIE', '7 rue de la Loi', '56000', 'Vannes', '56', '02 97 68 17 18', 47.6582, -2.7608),
  ('bzh-56-cdif-vannes', 'Centre des impôts foncier de Vannes', 'CDIF', '7 rue de la Loi', '56000', 'Vannes', '56', '02 97 68 17 20', 47.6582, -2.7608),
  ('bzh-56-sip-lorient', 'Service des impôts des particuliers de Lorient', 'SIP', '1 rue de la Belle Fontaine', '56100', 'Lorient', '56', '02 97 12 25 50', 47.7480, -3.3702),
  ('bzh-56-sie-lorient', 'Service des impôts des entreprises de Lorient', 'SIE', '1 rue de la Belle Fontaine', '56100', 'Lorient', '56', '02 97 12 25 51', 47.7480, -3.3702),
  ('bzh-56-sip-pontivy', 'Service des impôts des particuliers de Pontivy', 'SIP', '21 rue du Général de Gaulle', '56300', 'Pontivy', '56', '02 97 25 47 47', 48.0696, -2.9612),
  ('bzh-56-sip-ploermel', 'Service des impôts des particuliers de Ploërmel', 'SIP', '5 boulevard du Général Patton', '56800', 'Ploërmel', '56', '02 97 73 30 30', 47.9303, -2.3960)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  adresse = EXCLUDED.adresse,
  code_postal = EXCLUDED.code_postal,
  commune = EXCLUDED.commune,
  telephone = EXCLUDED.telephone,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  updated_at = NOW();
