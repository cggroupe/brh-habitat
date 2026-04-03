-- Migration: Partner Platform - Tables principales
-- Date: 2026-04-03
-- Ajoute les tables pour la plateforme partenaires (pro + particulier)

-- Extension profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Entreprises partenaires
CREATE TABLE brh_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  siret TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  logo_url TEXT,
  website TEXT,
  profession TEXT CHECK (profession IN ('architecte', 'agent_immobilier', 'maitre_oeuvre', 'courtier', 'autre')),
  commission_rate_percent INTEGER NOT NULL DEFAULT 0,
  level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
  total_ca_apporte INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres d'entreprise
CREATE TABLE brh_company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES brh_companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  member_role TEXT DEFAULT 'member' CHECK (member_role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, profile_id)
);

-- Particuliers affilies
CREATE TABLE brh_affiliates (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  level TEXT DEFAULT 'standard' CHECK (level IN ('standard', 'ambassadeur', 'expert', 'vip')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prospects
CREATE TABLE brh_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('pro', 'particulier')),
  company_id UUID REFERENCES brh_companies(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  affiliate_id UUID REFERENCES brh_affiliates(id) ON DELETE SET NULL,
  client_first_name TEXT NOT NULL,
  client_last_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  client_city TEXT,
  client_postal_code TEXT,
  work_type TEXT[],
  estimated_budget TEXT,
  urgency TEXT CHECK (urgency IN ('immediate', '3mois', '6mois', 'plus')),
  status TEXT DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'etude', 'devis_envoye', 'signe', 'termine', 'perdu')),
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  admin_notes TEXT,
  lead_score INTEGER DEFAULT 0,
  crm_id TEXT,
  crm_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fichiers prospects
CREATE TABLE brh_prospect_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES brh_prospects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('devis_concurrent', 'dpe', 'diagnostic', 'photo', 'autre')),
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devis signes
CREATE TABLE brh_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  signed_at DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('virement', 'cheque')),
  commission_rate_percent INTEGER,
  commission_amount INTEGER,
  commission_status TEXT DEFAULT 'en_attente' CHECK (commission_status IN ('en_attente', 'validee', 'versee')),
  commission_paid_at DATE,
  points_awarded INTEGER DEFAULT 0,
  points_awarded_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions points
CREATE TABLE brh_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES brh_affiliates(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('parrainage', 'bonus_mensuel', 'bonus_annuel', 'echange_cadeau', 'ajustement_admin')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catalogue cadeaux
CREATE TABLE brh_rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('produit_physique', 'bon_achat', 'reduction_travaux')),
  points_required INTEGER NOT NULL,
  value_cents INTEGER,
  stock INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demandes cadeaux
CREATE TABLE brh_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES brh_affiliates(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES brh_rewards_catalog(id) ON DELETE SET NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'validee', 'preparee', 'envoyee', 'refusee')),
  shipping_address TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threads messagerie
CREATE TABLE brh_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  participant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('pro', 'particulier')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE brh_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES brh_message_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE brh_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parametres plateforme (singleton)
CREATE TABLE brh_platform_settings (
  key TEXT PRIMARY KEY DEFAULT 'global' CHECK (key = 'global'),
  points_per_signed_quote INTEGER DEFAULT 100,
  pro_silver_threshold INTEGER DEFAULT 1000000,
  pro_gold_threshold INTEGER DEFAULT 5000000,
  pro_platinum_threshold INTEGER DEFAULT 15000000,
  particulier_ambassadeur_threshold INTEGER DEFAULT 300,
  particulier_expert_threshold INTEGER DEFAULT 700,
  particulier_vip_threshold INTEGER DEFAULT 1500,
  monthly_bonus_threshold INTEGER DEFAULT 3,
  monthly_bonus_points INTEGER DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO brh_platform_settings (key) VALUES ('global');
