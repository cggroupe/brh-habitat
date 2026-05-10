-- =============================================================================
-- Phase Employé V2.2 — Templates emails recrutement + tracking envois
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_email_templates — templates de mails de prospection/recrutement
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  -- Cible : à qui s'adresse ce template
  target_audience TEXT NOT NULL
    CHECK (target_audience IN ('artisan', 'agence_immo', 'architecte', 'maitre_oeuvre', 'autre')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  -- Variables disponibles : {{nom_destinataire}}, {{ville}}, {{employe_nom}}, {{employe_signature}}
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE brh_email_templates IS
  'Phase Employé V2.2 — Templates emails de recrutement partenaires. 4 cibles :
  artisans, agences immo, architectes, maîtres d''œuvre.';

-- ----------------------------------------------------------------------------
-- 2. brh_email_sends — log des envois pour tracking + scoring
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES brh_employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES brh_email_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_company TEXT,
  recipient_audience TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  -- Tracking
  resend_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'clicked', 'replied', 'bounced', 'failed'))
);

CREATE INDEX IF NOT EXISTS brh_email_sends_employee_recent
  ON brh_email_sends(employee_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS brh_email_sends_recipient
  ON brh_email_sends(recipient_email, sent_at DESC);

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_email_sends ENABLE ROW LEVEL SECURITY;

-- Templates : tous les employés authentifiés peuvent lire les templates actifs
CREATE POLICY "Authenticated read templates" ON brh_email_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin manage templates" ON brh_email_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Sends : employé voit ses propres envois
CREATE POLICY "Employé voit ses envois" ON brh_email_sends
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM brh_employees WHERE profile_id = auth.uid()));

-- Sends : INSERT seulement par EF (service role bypass), pas d'INSERT direct par client

-- Sends : admin manage all
CREATE POLICY "Admin manage sends" ON brh_email_sends
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 4. Seed — 4 templates initiaux
-- ----------------------------------------------------------------------------
INSERT INTO brh_email_templates (slug, target_audience, subject, body_html, variables) VALUES
('recrutement-artisan', 'artisan',
 'Devenez artisan partenaire BRH Habitat — Bretagne',
 '<p>Bonjour {{nom_destinataire}},</p>
<p>Je suis {{employe_nom}} de <strong>BRH Habitat</strong>, le réseau breton de la rénovation énergétique. Nous recherchons des <strong>artisans certifiés RGE</strong> à {{ville}} pour notre marketplace de chantiers.</p>
<p>En tant que partenaire, vous bénéficiez :</p>
<ul>
<li>De chantiers qualifiés (audits 3CL, prospects DPE F/G)</li>
<li>D''une visibilité SEO sur notre annuaire public</li>
<li>D''un système de commission cascade (jusqu''à 145 € par charte signée)</li>
</ul>
<p>Si l''idée vous intéresse, je peux vous présenter la plateforme en 15 minutes par téléphone. Quel créneau vous arrange cette semaine ?</p>
<p>{{employe_signature}}</p>',
 '["nom_destinataire","ville","employe_nom","employe_signature"]'::jsonb
),
('recrutement-agence-immo', 'agence_immo',
 'Loi Climat F/G : transformez vos passoires en opportunités',
 '<p>Bonjour {{nom_destinataire}},</p>
<p>Je suis {{employe_nom}} de <strong>BRH Habitat</strong>. À partir de 2028, les biens classés F seront interdits à la location. Vos clients vendeurs ont besoin d''anticiper.</p>
<p>BRH propose aux agences immobilières bretonnes un outil dédié :</p>
<ul>
<li><strong>Score Vente IA</strong> qui calcule l''impact DPE sur le prix réalisable</li>
<li>Leads vendeurs F/G qualifiés livrés mensuellement</li>
<li>Simulateur travaux à présenter à vos acquéreurs (rassure la négo)</li>
<li>Cartographie foncière complète (cadastre, PLU, propriétaires)</li>
</ul>
<p>Disponibilité pour une démo Zoom de 20 minutes ? Je m''adapte à votre agenda.</p>
<p>{{employe_signature}}</p>',
 '["nom_destinataire","ville","employe_nom","employe_signature"]'::jsonb
),
('recrutement-architecte', 'architecte',
 'Architectes bretons : un canal direct vers les propriétaires F/G',
 '<p>Bonjour {{nom_destinataire}},</p>
<p>Je suis {{employe_nom}}, je gère les partenariats <strong>BRH Habitat</strong> en Bretagne. Nous mettons les architectes en relation avec des propriétaires de maisons classées F ou G qui doivent rénover (loi Climat).</p>
<p>Notre proposition de partenariat :</p>
<ul>
<li>Mise en relation qualifiée (pas de prospects froids)</li>
<li>Apport via la plateforme avec contrat clair</li>
<li>Système de commissions transparent</li>
<li>Visibilité sur notre annuaire SEO public</li>
</ul>
<p>Cela vous parle ? Disponible pour un échange de 15 minutes la semaine prochaine.</p>
<p>{{employe_signature}}</p>',
 '["nom_destinataire","ville","employe_nom","employe_signature"]'::jsonb
),
('recrutement-maitre-oeuvre', 'maitre_oeuvre',
 'Maîtres d''œuvre : amplifiez votre activité avec BRH Habitat',
 '<p>Bonjour {{nom_destinataire}},</p>
<p>Je suis {{employe_nom}} de <strong>BRH Habitat</strong>. Nous travaillons avec des MOE bretons sur des chantiers de rénovation énergétique globale (audit + bouquet de travaux + suivi).</p>
<p>Vos avantages en partenariat :</p>
<ul>
<li>Flux régulier de chantiers qualifiés (notre base : 59 306 prospects DPE F/G en Bretagne)</li>
<li>Outils de chiffrage IA intégrés à la plateforme</li>
<li>Coordination simplifiée avec les artisans certifiés du réseau</li>
<li>Commissions cascade sur les chantiers signés</li>
</ul>
<p>Auriez-vous 15 minutes cette semaine pour que je vous présente le fonctionnement ?</p>
<p>{{employe_signature}}</p>',
 '["nom_destinataire","ville","employe_nom","employe_signature"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
