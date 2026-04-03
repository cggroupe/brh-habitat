# Plateforme Partenaires BRH — Architecture d'Implementation

**Date** : 2026-04-03
**Base** : Document ARCHITECTURE.md original, challenge et corrige
**Projet** : Integration dans le SPA Vite existant (PAS une app Next.js separee)

---

## Decisions Architecturales Cles

| Decision | Choix | Justification |
|----------|-------|---------------|
| Framework | **Vite SPA existant** (pas Next.js) | Design system, auth, admin, types deja en place. Edge Functions pour le server-side |
| Nommage tables | **Prefixe `brh_`** | Coherence avec brh_diagnostics, brh_homes, etc. |
| Argent | **INTEGER en centimes** | Regle anti-bug #8 du projet. Pas de DECIMAL ni parseFloat |
| RLS helpers | **SECURITY DEFINER** : `is_pro()`, `get_my_company_id()` | Evite recursion circulaire (bug deja corrige 2x) |
| Login | **Page unique** avec redirection par role | Pas 3 pages de login. Single `/connexion` |
| Admin | **Extension sidebar existant** | AdminShell + nouvelles routes dans le meme guard |
| Notifications | **brh_notifications + Supabase Realtime** | Push temps reel sans infra supplementaire |
| Kanban | **@dnd-kit/core + @dnd-kit/sortable** | Coherence avec BRHCRM |
| CRM sync | **Supabase Edge Function** | Webhook REST, retry, pas besoin de Node.js server |
| PDF | **@react-pdf/renderer** client-side ou Edge Function | Rapport mensuel partenaire |
| Email | **Edge Function + Resend** | Notifications transactionnelles |
| Commissions | **PostgreSQL triggers** | Calcul automatique, pas duplique dans le code app |

---

## Schema Base de Donnees (corrige)

### Migration 1 : Extension profiles + tables principales

```sql
-- Extension profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Entreprises partenaires
CREATE TABLE brh_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  siret TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  logo_url TEXT,
  website TEXT,
  profession TEXT CHECK (profession IN ('architecte', 'agent_immobilier', 'maitre_oeuvre', 'courtier', 'autre')),
  commission_rate_percent INTEGER NOT NULL DEFAULT 0, -- en % (ex: 10 = 10%)
  level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum')),
  total_ca_apporte INTEGER DEFAULT 0, -- en centimes
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

-- Devis signes (saisis par admin)
CREATE TABLE brh_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- en centimes HT
  signed_at DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('virement', 'cheque')),
  commission_rate_percent INTEGER, -- snapshot au moment signature
  commission_amount INTEGER, -- en centimes, calcule par trigger
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
  value_cents INTEGER, -- valeur en centimes
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
  pro_silver_threshold INTEGER DEFAULT 1000000, -- en centimes (10 000 EUR)
  pro_gold_threshold INTEGER DEFAULT 5000000,
  pro_platinum_threshold INTEGER DEFAULT 15000000,
  particulier_ambassadeur_threshold INTEGER DEFAULT 300,
  particulier_expert_threshold INTEGER DEFAULT 700,
  particulier_vip_threshold INTEGER DEFAULT 1500,
  monthly_bonus_threshold INTEGER DEFAULT 3,
  monthly_bonus_points INTEGER DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserer les parametres par defaut
INSERT INTO brh_platform_settings (key) VALUES ('global');
```

### Migration 2 : Fonctions SECURITY DEFINER + Triggers

```sql
-- Helper : verifier role pro
CREATE OR REPLACE FUNCTION public.is_pro()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pro');
$$;

-- Helper : recuperer company_id du user courant
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT company_id FROM public.brh_company_members WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- Trigger : calcul commission automatique
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commission_rate_percent IS NOT NULL THEN
    NEW.commission_amount := (NEW.amount * NEW.commission_rate_percent / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_commission
BEFORE INSERT OR UPDATE ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION calculate_commission();

-- Trigger : mise a jour CA total entreprise + niveau
CREATE OR REPLACE FUNCTION update_company_ca()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_new_ca INTEGER;
  v_settings RECORD;
BEGIN
  SELECT company_id INTO v_company_id FROM brh_prospects WHERE id = NEW.prospect_id;
  IF v_company_id IS NOT NULL THEN
    UPDATE brh_companies
    SET total_ca_apporte = total_ca_apporte + NEW.amount,
        updated_at = NOW()
    WHERE id = v_company_id
    RETURNING total_ca_apporte INTO v_new_ca;

    SELECT * INTO v_settings FROM brh_platform_settings WHERE key = 'global';

    UPDATE brh_companies SET level = CASE
      WHEN v_new_ca >= v_settings.pro_platinum_threshold THEN 'platinum'
      WHEN v_new_ca >= v_settings.pro_gold_threshold THEN 'gold'
      WHEN v_new_ca >= v_settings.pro_silver_threshold THEN 'silver'
      ELSE 'bronze'
    END WHERE id = v_company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_ca
AFTER INSERT ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION update_company_ca();

-- Trigger : attribution points affilie
CREATE OR REPLACE FUNCTION award_affiliate_points()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id UUID;
  v_points INTEGER;
BEGIN
  SELECT affiliate_id INTO v_affiliate_id FROM brh_prospects WHERE id = NEW.prospect_id;
  IF v_affiliate_id IS NOT NULL THEN
    SELECT points_per_signed_quote INTO v_points FROM brh_platform_settings WHERE key = 'global';
    NEW.points_awarded := v_points;
    NEW.points_awarded_at := NOW();
    UPDATE brh_affiliates
    SET points_balance = points_balance + v_points,
        total_points_earned = total_points_earned + v_points
    WHERE id = v_affiliate_id;
    INSERT INTO brh_points_transactions(affiliate_id, points, type, reference_id, description)
    VALUES (v_affiliate_id, v_points, 'parrainage', NEW.id, 'Parrainage signe');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_affiliate_points
BEFORE INSERT ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION award_affiliate_points();

-- Trigger : calcul lead score
CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_score := 0;
  IF NEW.client_email IS NOT NULL AND NEW.client_email != '' THEN NEW.lead_score := NEW.lead_score + 10; END IF;
  IF NEW.estimated_budget IS NOT NULL AND NEW.estimated_budget != '' THEN NEW.lead_score := NEW.lead_score + 15; END IF;
  IF NEW.urgency = 'immediate' THEN NEW.lead_score := NEW.lead_score + 30;
  ELSIF NEW.urgency = '3mois' THEN NEW.lead_score := NEW.lead_score + 20;
  ELSIF NEW.urgency = '6mois' THEN NEW.lead_score := NEW.lead_score + 10;
  END IF;
  IF NEW.client_address IS NOT NULL AND NEW.client_address != '' THEN NEW.lead_score := NEW.lead_score + 10; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_lead_score
BEFORE INSERT OR UPDATE ON brh_prospects
FOR EACH ROW EXECUTE FUNCTION calculate_lead_score();

-- updated_at triggers pour les nouvelles tables
CREATE TRIGGER set_updated_at_companies BEFORE UPDATE ON brh_companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_prospects BEFORE UPDATE ON brh_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_quotes BEFORE UPDATE ON brh_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_rewards_catalog BEFORE UPDATE ON brh_rewards_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_reward_claims BEFORE UPDATE ON brh_reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### Migration 3 : RLS + Indexes

```sql
-- RLS sur toutes les nouvelles tables
ALTER TABLE brh_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_prospect_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_platform_settings ENABLE ROW LEVEL SECURITY;

-- COMPANIES
CREATE POLICY "Pro voit sa company" ON brh_companies FOR SELECT
  USING (id = public.get_my_company_id() OR public.is_admin());
CREATE POLICY "Owner modifie sa company" ON brh_companies FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Admin manage companies" ON brh_companies FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- COMPANY_MEMBERS
CREATE POLICY "Membre voit ses collegues" ON brh_company_members FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.is_admin());
CREATE POLICY "Owner gere membres" ON brh_company_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM brh_company_members cm WHERE cm.company_id = brh_company_members.company_id AND cm.profile_id = auth.uid() AND cm.member_role = 'owner')
    OR public.is_admin()
  );

-- AFFILIATES
CREATE POLICY "Affilie voit son profil" ON brh_affiliates FOR SELECT
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin manage affilies" ON brh_affiliates FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROSPECTS
CREATE POLICY "Pro voit prospects de sa company" ON brh_prospects FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.is_admin());
CREATE POLICY "Particulier voit ses prospects" ON brh_prospects FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Pro cree prospect pour sa company" ON brh_prospects FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id() AND source_type = 'pro');
CREATE POLICY "Particulier cree prospect" ON brh_prospects FOR INSERT
  WITH CHECK (affiliate_id = auth.uid() AND source_type = 'particulier');
CREATE POLICY "Admin manage prospects" ON brh_prospects FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROSPECT_FILES
CREATE POLICY "Pro voit fichiers de ses prospects" ON brh_prospect_files FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brh_prospects p WHERE p.id = prospect_id AND p.company_id = public.get_my_company_id())
    OR public.is_admin()
  );
CREATE POLICY "Pro upload fichiers" ON brh_prospect_files FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Admin manage fichiers" ON brh_prospect_files FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- QUOTES
CREATE POLICY "Pro voit ses quotes" ON brh_quotes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brh_prospects p WHERE p.id = prospect_id AND p.company_id = public.get_my_company_id())
    OR public.is_admin()
  );
CREATE POLICY "Particulier voit ses quotes" ON brh_quotes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brh_prospects p WHERE p.id = prospect_id AND p.affiliate_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "Admin manage quotes" ON brh_quotes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POINTS_TRANSACTIONS
CREATE POLICY "Affilie voit ses transactions" ON brh_points_transactions FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin manage transactions" ON brh_points_transactions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- REWARDS_CATALOG (lecture pour tous les connectes)
CREATE POLICY "Catalogue visible" ON brh_rewards_catalog FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage catalogue" ON brh_rewards_catalog FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- REWARD_CLAIMS
CREATE POLICY "Affilie voit ses demandes" ON brh_reward_claims FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Affilie cree demande" ON brh_reward_claims FOR INSERT
  WITH CHECK (affiliate_id = auth.uid());
CREATE POLICY "Admin manage demandes" ON brh_reward_claims FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- MESSAGE_THREADS
CREATE POLICY "Participant voit son thread" ON brh_message_threads FOR SELECT
  USING (participant_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin manage threads" ON brh_message_threads FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- MESSAGES
CREATE POLICY "User voit messages de ses threads" ON brh_messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM brh_message_threads t WHERE t.id = thread_id AND t.participant_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "User envoie message" ON brh_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admin manage messages" ON brh_messages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- NOTIFICATIONS
CREATE POLICY "User voit ses notifs" ON brh_notifications FOR SELECT
  USING (recipient_id = auth.uid());
CREATE POLICY "User marque notif lue" ON brh_notifications FOR UPDATE
  USING (recipient_id = auth.uid());
CREATE POLICY "Admin manage notifs" ON brh_notifications FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PLATFORM_SETTINGS
CREATE POLICY "Admin manage settings" ON brh_platform_settings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Settings lisibles" ON brh_platform_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INDEXES
CREATE INDEX idx_brh_companies_owner ON brh_companies(owner_id);
CREATE INDEX idx_brh_company_members_company ON brh_company_members(company_id);
CREATE INDEX idx_brh_company_members_profile ON brh_company_members(profile_id);
CREATE INDEX idx_brh_prospects_company ON brh_prospects(company_id);
CREATE INDEX idx_brh_prospects_affiliate ON brh_prospects(affiliate_id);
CREATE INDEX idx_brh_prospects_submitted_by ON brh_prospects(submitted_by);
CREATE INDEX idx_brh_prospects_status ON brh_prospects(status);
CREATE INDEX idx_brh_prospect_files_prospect ON brh_prospect_files(prospect_id);
CREATE INDEX idx_brh_quotes_prospect ON brh_quotes(prospect_id);
CREATE INDEX idx_brh_quotes_commission_status ON brh_quotes(commission_status);
CREATE INDEX idx_brh_points_transactions_affiliate ON brh_points_transactions(affiliate_id);
CREATE INDEX idx_brh_reward_claims_affiliate ON brh_reward_claims(affiliate_id);
CREATE INDEX idx_brh_messages_thread ON brh_messages(thread_id);
CREATE INDEX idx_brh_notifications_recipient ON brh_notifications(recipient_id);
CREATE INDEX idx_brh_notifications_read ON brh_notifications(recipient_id, is_read);

-- Realtime pour notifications
ALTER PUBLICATION supabase_realtime ADD TABLE brh_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE brh_messages;
```

### Migration 4 : Storage buckets

```sql
-- Buckets geres via Supabase Dashboard ou Edge Function
-- prospect-files : prive, 10 Mo max, PDF/DOCX/JPG/PNG/HEIC
-- rewards-catalog : public (images produits)
-- company-logos : public
```

---

## Arborescence Fichiers (integration dans le SPA existant)

```
src/
  components/
    auth/
      ProGuard.tsx                    # Guard role='pro' (copie AdminGuard)
      ParticulierGuard.tsx            # Guard role='particulier'
    layout/
      ProShell.tsx                    # Layout sidebar pro
      ParticulierShell.tsx            # Layout sidebar particulier
      AdminShell.tsx                  # MODIFIER : ajouter nav items partenaires
    shared/
      NotificationBell.tsx            # Composant cloche notifications
      StatusBadge.tsx                 # Badge statut prospect
      LevelBadge.tsx                  # Badge niveau Pro/Particulier
      FileUploader.tsx                # Upload multi-fichiers
      MessageThread.tsx               # Fil de messagerie
    pro/
      ProspectKanban.tsx              # Pipeline drag-drop (@dnd-kit)
      ProspectForm.tsx                # Formulaire ajout prospect
      CommissionCard.tsx              # Carte commission
      TeamMemberRow.tsx               # Ligne membre equipe
      ProDashboardStats.tsx           # Stats pro
    particulier/
      PointsGauge.tsx                 # Jauge points animee
      ReferralCard.tsx                # Carte filleul
      RewardCatalogGrid.tsx           # Grille cadeaux
      ShareButton.tsx                 # Lien parrainage WhatsApp/SMS
      ParrainageForm.tsx              # Formulaire parrainage
    admin/
      QuoteForm.tsx                   # Saisie devis signe
      PartnerTable.tsx                # Liste partenaires
      CommissionManager.tsx           # Gestion commissions
      CatalogEditor.tsx               # CRUD catalogue cadeaux
  pages/
    pro/
      ProDashboard.tsx                # Dashboard CA, commissions
      ProProspects.tsx                # Liste + Kanban
      ProProspectNew.tsx              # Formulaire nouveau prospect
      ProProspectDetail.tsx           # Detail prospect + fichiers
      ProEquipe.tsx                   # Gestion membres
      ProCommissions.tsx              # Historique commissions
      ProMessages.tsx                 # Messagerie admin
      ProProfil.tsx                   # Profil entreprise
    particulier/
      PartDashboard.tsx               # Jauge points, stats
      PartParrainages.tsx             # Liste parrainages
      PartParrainageNew.tsx           # Formulaire parrainage
      PartCatalogue.tsx               # Catalogue cadeaux
      PartPoints.tsx                  # Historique transactions
      PartMessages.tsx                # Messagerie admin
    admin/
      AdminPartenaires.tsx            # Liste entreprises (NOUVELLE PAGE)
      AdminPartenaireDetail.tsx       # Detail partenaire
      AdminParticuliers.tsx           # Liste affilies
      AdminParticulierDetail.tsx      # Detail affilie
      AdminProspects.tsx              # Vue globale prospects
      AdminDevis.tsx                  # Liste devis
      AdminDevisNew.tsx               # Saisie devis signe
      AdminCommissions.tsx            # Gestion paiements
      AdminCatalogue.tsx              # CRUD catalogue
      AdminParametres.tsx             # Parametres plateforme
    public/
      RegisterProPage.tsx             # Inscription entreprise
      RegisterParticulierPage.tsx     # Inscription particulier
      LoginPage.tsx                   # MODIFIER : redirect par role
  api/
    prospects.ts                      # CRUD prospects
    companies.ts                      # CRUD companies
    company-members.ts                # Gestion membres
    affiliates.ts                     # CRUD affiliates
    quotes.ts                         # CRUD quotes (admin)
    commissions.ts                    # Gestion commissions
    points.ts                         # Transactions points
    rewards.ts                        # Catalogue + demandes
    partner-messages.ts               # Threads + messages
    partner-notifications.ts          # CRUD notifications
    platform-settings.ts              # Parametres
  hooks/
    useNotifications.ts               # Supabase Realtime notifications
    queries.ts                        # MODIFIER : ajouter tous les hooks partenaires
  types/
    database.ts                       # MODIFIER : ajouter types nouvelles tables
    partner.ts                        # Types specifiques partenaires
  App.tsx                             # MODIFIER : ajouter routes pro/particulier
```

---

## Phases d'Implementation

### Phase 1 : DB + Auth (3-4 jours)
- 4 migrations Supabase (tables, triggers, RLS, storage)
- Types TypeScript pour toutes les nouvelles tables
- ProGuard + ParticulierGuard
- Modification LoginPage (redirect par role)
- RegisterProPage + RegisterParticulierPage
- Extension AdminShell sidebar

### Phase 2 : Portail Pro (5-7 jours)
- ProShell layout
- API layer (prospects, companies, company-members)
- Hooks React Query
- Dashboard pro + stats
- Formulaire prospect + upload fichiers
- Liste prospects + pipeline Kanban (@dnd-kit)
- Gestion equipe

### Phase 3 : Admin Partenaires (4-5 jours)
- Pages admin : partenaires, prospects, devis
- QuoteForm (saisie devis -> triggers auto commission + points)
- CommissionManager (validation, versement)
- Messagerie admin (threads + messages)

### Phase 4 : Portail Particulier (3-4 jours)
- ParticulierShell layout
- Dashboard + jauge points
- Formulaire parrainage
- Catalogue cadeaux + demande
- Historique points
- Lien parrainage unique (WhatsApp/SMS)

### Phase 5 : Integrations + Polish (3-4 jours)
- Notifications temps reel (Supabase Realtime)
- Edge Function CRM sync
- Edge Function email (Resend)
- PDF rapport mensuel
- Responsive mobile
- Tests critiques
