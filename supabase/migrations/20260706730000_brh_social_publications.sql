-- =============================================================================
-- Phase Employé V2.4 — Publications réseaux sociaux (LinkedIn/TikTok/Instagram)
-- =============================================================================
-- L'employé déclare ses publications sociales pour BRH (texte + plateforme + URL).
-- Pas d'intégration API directe LinkedIn/TikTok/Instagram en V2.4 — l'employé
-- publie lui-même puis enregistre la trace dans la plateforme. +10 pts par
-- publication validée. Modération admin possible (status = 'pending'/'validated'/
-- 'rejected').
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_social_publications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_social_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES brh_employees(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'tiktok', 'instagram', 'facebook', 'twitter', 'autre')),
  content_text TEXT NOT NULL,
  -- URL de la publication (optionnel, l'employé peut l'ajouter après publication)
  publication_url TEXT,
  -- Statut workflow : pending (employé déclare) → validated (admin approuve) → rejected (refusé)
  -- En V2.4 V1 : auto-validated à l'INSERT pour fluidité (admin peut rejeter a posteriori)
  status TEXT NOT NULL DEFAULT 'validated'
    CHECK (status IN ('pending', 'validated', 'rejected')),
  -- Métriques (employé peut les renseigner manuellement V1)
  reach_count INTEGER,
  engagement_count INTEGER,
  -- Référence à un template (V2.4.bis)
  template_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ DEFAULT now(),
  rejected_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS brh_social_publications_employee_recent
  ON brh_social_publications(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_social_publications_platform_recent
  ON brh_social_publications(platform, created_at DESC);

COMMENT ON TABLE brh_social_publications IS
  'Phase Employé V2.4 — Publications sociales déclarées par les employés BRH.
  +10 pts par publication validée (trigger brh_employees_action_after_insert).';

-- ----------------------------------------------------------------------------
-- 2. brh_social_post_templates — modèles de posts BRH (V2.4.bis future)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_social_post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'tiktok', 'instagram', 'facebook', 'twitter', 'all')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO brh_social_post_templates (slug, platform, title, content, hashtags) VALUES
('linkedin-loi-climat',
 'linkedin',
 'LinkedIn — Sensibilisation Loi Climat passoires F/G',
 E'À partir de 2028, les biens classés F seront interdits à la location en France.\n\n200 000 logements sont concernés rien qu''en Bretagne.\n\nChez BRH Habitat, on aide les propriétaires bretons à anticiper :\n→ Audit énergétique gratuit\n→ Plan de rénovation chiffré\n→ Mise en relation avec des artisans RGE certifiés\n→ Calcul des aides MaPrimeRénov + CEE\n\nAnticiper, c''est protéger la valeur de son patrimoine.',
 ARRAY['#renovationenergetique','#loiclimat','#bretagne','#dpe','#patrimoine']
),
('linkedin-recrutement-artisans',
 'linkedin',
 'LinkedIn — Recrutement partenaires artisans BTP',
 E'Recherche de partenaires artisans RGE en Bretagne.\n\nBRH Habitat connecte les propriétaires F/G à des artisans qualifiés. Si vous êtes plombier, électricien, isolateur ou couvreur certifié RGE en Bretagne — on a peut-être des chantiers pour vous.\n\nNotre proposition :\n✓ Chantiers qualifiés (audits 3CL réels)\n✓ Visibilité SEO sur notre annuaire public\n✓ Commissions cascade transparentes\n\nMP pour en discuter.',
 ARRAY['#btp','#renovation','#bretagne','#artisans','#partenariat']
),
('tiktok-conseil-rapide',
 'tiktok',
 'TikTok — Conseil rapide DPE 30s',
 E'Tu veux savoir si ta maison est une passoire thermique ? 3 indices :\n\n1️⃣ Maison construite avant 1975 ? Probable F ou G\n2️⃣ Tu chauffes plus de 1500€/an ? Idem\n3️⃣ Murs en granit non isolés ? F garantie\n\nFais ton audit gratuit sur BRH Habitat, lien en bio 👇',
 ARRAY['#renovation','#bretagne','#diagnostic','#economiesenergie','#maison']
),
('instagram-carrousel-aides',
 'instagram',
 'Instagram — Carrousel aides MaPrimeRénov 2026',
 E'💰 Les aides 2026 pour rénover en Bretagne\n\n🟢 MaPrimeRénov : jusqu''à 17 500 €\n🟢 CEE : jusqu''à 5 000 €\n🟢 Éco-PTZ : 50 000 € sans intérêts\n🟢 TVA 5,5%\n\nCumulables. Pour propriétaires F/G : audit BRH gratuit pour optimiser.',
 ARRAY['#maprimerenov','#aides','#bretagne','#renovation','#ecologie']
),
('linkedin-recrutement-agences',
 'linkedin',
 'LinkedIn — Recrutement agences immobilières',
 E'Agences immobilières bretonnes : la loi Climat va impacter votre portefeuille.\n\nÀ partir de 2028 : F interdits à la location. À partir de 2034 : E aussi.\nVos vendeurs vont vouloir négocier −15 à −25% sur les biens classés F/G.\n\nChez BRH Habitat, on accompagne les agences avec :\n→ Score Vente IA (impact DPE sur prix)\n→ Leads vendeurs F/G qualifiés mensuellement\n→ Simulateur travaux pour rassurer vos acquéreurs\n→ Cartographie cadastrale Bretagne\n\nDémo 20 min ? Prenez RDV.',
 ARRAY['#immobilier','#bretagne','#dpe','#loiclimat','#agence']
),
('all-temoignage-client',
 'all',
 'Multi — Template témoignage client',
 E'Témoignage client de la semaine 🏠\n\n[Nom client], propriétaire à [Ville], a transformé sa maison classée G en C grâce à BRH Habitat :\n→ Audit énergétique gratuit\n→ [Nature des travaux]\n→ [Aides obtenues] €\n→ Reste à charge : [Montant] €\n\nRésultat : facture chauffage divisée par 2,5 et bien revalorisé sur le marché immo.\n\nVotre tour ? Audit gratuit en lien bio.',
 ARRAY['#temoignage','#renovationenergetique','#bretagne','#avant-apres']
)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_social_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_social_post_templates ENABLE ROW LEVEL SECURITY;

-- Templates : lecture authentifiée
CREATE POLICY "Authenticated read social templates" ON brh_social_post_templates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admin manage social templates" ON brh_social_post_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Publications : employé lit/insert ses propres
CREATE POLICY "Employé voit ses publications" ON brh_social_publications
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()));

CREATE POLICY "Employé insert ses publications" ON brh_social_publications
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()));

CREATE POLICY "Employé update ses publications" ON brh_social_publications
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()));

CREATE POLICY "Admin manage publications" ON brh_social_publications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 4. Trigger : +10 pts auto à chaque INSERT publication validée
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_social_publication_award_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert action seulement si la publication est validée (status='validated')
  IF NEW.status = 'validated' THEN
    INSERT INTO public.brh_employee_actions (
      employee_id, action_type, points,
      related_entity_type, related_entity_id, notes
    ) VALUES (
      NEW.employee_id, 'social_post', 10,
      'social_publication', NEW.id,
      format('Publication %s — %s', NEW.platform, COALESCE(LEFT(NEW.content_text, 60), 'sans titre'))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_social_publications_award ON brh_social_publications;
CREATE TRIGGER brh_social_publications_award
  AFTER INSERT ON brh_social_publications
  FOR EACH ROW
  EXECUTE FUNCTION brh_social_publication_award_points();

COMMIT;
