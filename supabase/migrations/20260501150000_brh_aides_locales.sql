-- Migration : Aides locales (régionales / départementales / intercommunales / communales)
-- Phase 10 — ADR-014 (Bretagne V1)
-- Source : sites officiels Conseil régional Bretagne + 4 dépts + intercos 2026

CREATE TABLE brh_aides_locales (
  id SERIAL PRIMARY KEY,

  -- Identification
  programme TEXT NOT NULL,           -- ex: "Eco-PEB Bretagne", "Tinergie Brest"
  organisme TEXT NOT NULL,           -- ex: "Conseil régional de Bretagne"
  niveau TEXT NOT NULL CHECK (niveau IN ('national', 'regional', 'departement', 'intercommune', 'commune')),

  -- Périmètre géo
  code_geo TEXT NOT NULL,            -- code INSEE région/dept/EPCI/commune
  -- Ex: '53' = région Bretagne, '29' = Finistère, '242900314' = Brest Métropole, '29019' = Brest commune

  -- Geste éligible (peut être '*' pour toutes les rénovations globales)
  geste_id TEXT NOT NULL,            -- 'isolation_murs_iti', 'pac_air_eau', '*' (tous), 'renovation_globale'

  -- Forfait (l'un des deux)
  forfait_euros NUMERIC(10, 2),      -- forfait fixe €
  taux_pct NUMERIC(5, 2),            -- ou taux % (sur HT)
  -- Plafond
  plafond_euros NUMERIC(10, 2),

  -- Conditions
  couleurs_eligibles TEXT[],         -- {bleu,jaune,violet,rose} ou null = toutes
  saut_dpe_min INT,                  -- nombre de classes DPE minimum (0 = pas de critère)
  cumul_mpr BOOLEAN NOT NULL DEFAULT true,  -- cumul autorisé avec MPR ?
  cumul_cee BOOLEAN NOT NULL DEFAULT true,
  cumul_eco_ptz BOOLEAN NOT NULL DEFAULT true,

  -- Méta
  url_officielle TEXT,
  notes TEXT,
  date_validite_debut DATE,
  date_validite_fin DATE,

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brh_aides_locales_geo ON brh_aides_locales(niveau, code_geo);
CREATE INDEX idx_brh_aides_locales_geste ON brh_aides_locales(geste_id);
CREATE INDEX idx_brh_aides_locales_active ON brh_aides_locales(active) WHERE active = true;

ALTER TABLE brh_aides_locales ENABLE ROW LEVEL SECURITY;

-- Lecture publique (anon + auth)
CREATE POLICY "public_select_aides_locales" ON brh_aides_locales FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Écriture admin
CREATE POLICY "admin_write_aides_locales" ON brh_aides_locales FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- Seed Bretagne 2026 — Aides régionales + départementales + intercommunales
-- ============================================================================
-- Sources :
-- - Conseil régional Bretagne : https://www.bretagne.bzh/aides/
-- - ANIL bretagne : https://www.anil.org/bretagne
-- - Tinergie : https://www.tinergie-brest.fr (Brest Métropole)
-- - Eco-Travo : https://www.rennesmetropole.fr (Rennes Métropole)

-- === Région Bretagne ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, cumul_cee, url_officielle, notes) VALUES
('Eco-PEB Rénovation', 'Conseil régional de Bretagne', 'regional', '53', 'renovation_globale', 5000, 5000, ARRAY['bleu','jaune','violet'], true, true, 'https://www.bretagne.bzh/aides/eco-peb-renovation/', 'Rénovation énergétique globale en Bretagne. Bouquet ≥ 2 gestes. Pas pour Rose.'),
('Aide audit énergétique', 'Conseil régional de Bretagne', 'regional', '53', 'audit_energetique', 800, 800, ARRAY['bleu','jaune','violet','rose'], true, false, 'https://www.bretagne.bzh/aides/', 'Aide à la réalisation d''un audit énergétique réglementaire. Forfait 800 €.');

-- === Département Côtes d'Armor (22) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Aide rénovation énergétique 22', 'Conseil départemental Côtes-d''Armor', 'departement', '22', 'renovation_globale', 2000, 2000, ARRAY['bleu','jaune'], true, 'https://cotesdarmor.fr/', 'Aide complémentaire MPR. Modeste / très modeste uniquement.');

-- === Département Finistère (29) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Tinergie 29', 'Conseil départemental Finistère + ALECOB', 'departement', '29', 'renovation_globale', 1500, 3000, ARRAY['bleu','jaune','violet'], true, 'https://www.tinergie.fr/', 'Programme Tinergie : accompagnement + aide complémentaire selon revenus.'),
('Aide pompe à chaleur 29', 'Conseil départemental Finistère', 'departement', '29', 'pac_air_eau', 1000, 1000, ARRAY['bleu','jaune'], true, 'https://finistere.fr/', 'Aide spécifique PAC pour les ménages modestes.'),
('Aide pompe à chaleur 29 (eau-eau)', 'Conseil départemental Finistère', 'departement', '29', 'pac_eau_eau', 2000, 2000, ARRAY['bleu','jaune'], true, 'https://finistere.fr/', 'Aide PAC géothermie majorée.');

-- === Département Ille-et-Vilaine (35) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Eco-Travo 35', 'Conseil départemental Ille-et-Vilaine', 'departement', '35', 'renovation_globale', 1500, 3000, ARRAY['bleu','jaune','violet'], true, 'https://www.ille-et-vilaine.fr/eco-travo', 'Aide forfaitaire selon revenus. Cumul MPR ok.');

-- === Département Morbihan (56) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Aide habitat énergie 56', 'Conseil départemental Morbihan', 'departement', '56', 'renovation_globale', 1200, 2500, ARRAY['bleu','jaune'], true, 'https://www.morbihan.fr/', 'Aide rénovation énergétique pour ménages modestes.');

-- === Brest Métropole (242900314) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Tinergie Brest', 'Brest Métropole', 'intercommune', '242900314', 'renovation_globale', 2500, 5000, ARRAY['bleu','jaune','violet'], true, 'https://www.tinergie-brest.fr/', 'Programme Tinergie + accompagnement gratuit. Forfait selon décile.'),
('Tinergie Brest - Audit', 'Brest Métropole', 'intercommune', '242900314', 'audit_energetique', 500, 500, ARRAY['bleu','jaune','violet','rose'], true, 'https://www.tinergie-brest.fr/', 'Subvention audit énergétique sur le territoire de Brest Métropole.');

-- === Rennes Métropole (243500139) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Eco-Travo Rennes Métropole', 'Rennes Métropole', 'intercommune', '243500139', 'renovation_globale', 3000, 6000, ARRAY['bleu','jaune','violet'], true, 'https://www.rennesmetropole.fr/eco-travo', 'Aide importante Rennes Métropole. Bouquet 2+ gestes. Cumul MPR.'),
('Eco-Travo - Sortie passoire', 'Rennes Métropole', 'intercommune', '243500139', 'sortie_passoire', 2000, 2000, ARRAY['bleu','jaune','violet','rose'], true, 'https://www.rennesmetropole.fr/eco-travo', 'Bonus si avant F/G → après ≤ D.');

-- === Quimper Bretagne Occidentale (242900645) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Aide rénovation QBO', 'Quimper Bretagne Occidentale', 'intercommune', '242900645', 'renovation_globale', 1500, 3000, ARRAY['bleu','jaune'], true, 'https://www.quimper-bretagne-occidentale.bzh/', 'Aide rénovation énergétique modestes.');

-- === Lorient Agglomération (200042174) ===
INSERT INTO brh_aides_locales (programme, organisme, niveau, code_geo, geste_id, forfait_euros, plafond_euros, couleurs_eligibles, cumul_mpr, url_officielle, notes) VALUES
('Aide rénovation Lorient Agglo', 'Lorient Agglomération', 'intercommune', '200042174', 'renovation_globale', 1500, 3000, ARRAY['bleu','jaune','violet'], true, 'https://www.lorient-agglo.bzh/', 'Aide rénovation cumulable MPR.');

COMMENT ON TABLE brh_aides_locales IS
  'Aides locales (régionales/départementales/intercommunales/communales) cumulables avec aides nationales (MPR, CEE, ÉcoPTZ). Phase 10 - Bretagne V1 (ADR-014).';
