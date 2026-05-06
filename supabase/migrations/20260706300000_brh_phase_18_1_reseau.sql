-- =============================================================================
-- Phase 18.1 — Réseau social pro `/reseau` : fondations DB
-- =============================================================================
--
-- Objectif : poser le socle relationnel de la couche réseau social transverse aux
-- 4 personae (agences immo, artisans RGE, architectes, apporteurs d'affaires).
-- Killer feature = marketplace de chantiers avec commission 5% HT tracée.
--
-- 11 nouvelles tables :
--   1. brh_pro_connections          — graphe symétrique (LinkedIn-style)
--   2. brh_pro_follows              — follow asymétrique (Twitter-style)
--   3. brh_feed_posts               — posts internes (8 post_type)
--   4. brh_feed_reactions           — like / recommande / expert
--   5. brh_feed_comments            — threadés via parent_comment_id
--   6. brh_feed_impressions         — observabilité algo (emprunté AUTAF ENGINE V2)
--   7. brh_pro_endorsements         — capital social mesurable (recommandations)
--   8. brh_chantier_offers          — KILLER feature marketplace
--   9. brh_chantier_applications    — candidatures sur offres
--  10. brh_autaf_link               — bridge API AUTAF (OAuth)
--  11. brh_feed_reports             — modération minimale (signalements)
--
-- 3 helpers SECURITY DEFINER (avec SET search_path = '') :
--   - brh_user_pro_id()              — partner_contract_id actif du user courant
--   - brh_pro_can_view_post(post_id) — visibilité graph-aware
--   - brh_pro_in_network(viewer, target) — connexion accepted entre 2 pros
--
-- ALTER brh_partner_contracts : extension CHECK partner_type avec 6 nouveaux types
-- (architecte, maitre_oeuvre, apporteur_affaires, courtier, syndic, autre).
--
-- 4 triggers SQL :
--   - trg_brh_feed_posts_counters       — compteurs like_count / comment_count
--   - trg_brh_feed_reactions_counter    — incrémente brh_feed_posts.like_count
--   - trg_brh_feed_comments_counter     — incrémente brh_feed_posts.comment_count
--   - trg_brh_chantier_commission       — calcule commission 5% à signature devis
--
-- Conformité 14 règles anti-bug :
--   #2  → BIGINT cents pour tous les montants (budget_cents, commission_amount_cents)
--   #5  → COMMIT à la fin (transactionnel)
--   #8  → pas de USING (true) sur tables sensibles
--   #11 → TIMESTAMPTZ partout
--   #12 → SET search_path = '' sur toutes les fonctions SECURITY DEFINER
--
-- Multi-tenant Option B (décision Philippe 06/05) :
--   tenant_id TEXT NOT NULL DEFAULT 'brh' CHECK (tenant_id IN ('brh','idf','paca','autaf'))
--   → 1 tenant 'brh' actif V1, AUTAF V2 = ajout d'une ligne sans migration.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ============================================================================
-- 0. ALTER brh_partner_contracts : étendre CHECK partner_type (6 nouveaux types)
-- ============================================================================
-- Existant : 'agence_immo','artisan_rge','pro_company'
-- Phase 18 : ajout de architecte, maitre_oeuvre, apporteur_affaires, courtier,
-- syndic, autre. La table garde son schéma, juste le CHECK est élargi.

ALTER TABLE brh_partner_contracts
  DROP CONSTRAINT IF EXISTS brh_partner_contracts_partner_type_check;

ALTER TABLE brh_partner_contracts
  ADD CONSTRAINT brh_partner_contracts_partner_type_check
  CHECK (partner_type IN (
    'agence_immo',
    'artisan_rge',
    'pro_company',
    'architecte',
    'maitre_oeuvre',
    'apporteur_affaires',
    'courtier',
    'syndic',
    'autre'
  ));

COMMENT ON CONSTRAINT brh_partner_contracts_partner_type_check
  ON brh_partner_contracts IS
  'Phase 18.1 — étendu de 3 à 9 types pour accueillir les nouveaux personae réseau social.';

-- ============================================================================
-- 1. Helper SECURITY DEFINER : brh_user_pro_id()
-- ----------------------------------------------------------------------------
-- Retourne le partner_contract_id ACTIF du user courant.
-- Cherche d'abord en tant que signer, sinon via brh_agence_members,
-- sinon via brh_company_members. NULL si user n'est pas pro.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.brh_user_pro_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- 1) Signer direct d'une charte active
  SELECT pc.id
  FROM public.brh_partner_contracts pc
  WHERE pc.signer_profile_id = auth.uid()
    AND pc.status = 'active'
  ORDER BY pc.signed_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_pro_id()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_user_pro_id() IS
  'Phase 18.1 — partner_contract_id actif du user courant. NULL si pas pro. Utilisé par toutes les RLS du portail /reseau.';

-- ============================================================================
-- 2. Helper SECURITY DEFINER : brh_pro_in_network(viewer, target)
-- ----------------------------------------------------------------------------
-- TRUE si une connexion 'accepted' existe entre les 2 pros (symétrique).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.brh_pro_in_network(p_viewer UUID, p_target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brh_pro_connections c
    WHERE c.status = 'accepted'
      AND (
        (c.requester_pro_id = p_viewer AND c.recipient_pro_id = p_target)
        OR
        (c.requester_pro_id = p_target AND c.recipient_pro_id = p_viewer)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.brh_pro_in_network(UUID, UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_pro_in_network(UUID, UUID) IS
  'Phase 18.1 — TRUE si 2 pros ont une connexion accepted (symétrique).';

-- ============================================================================
-- 3. Tables — créées AVANT les RLS qui les référencent
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 brh_pro_connections (graphe symétrique LinkedIn-style)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_pro_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  requester_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,
  recipient_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','blocked')),

  message TEXT,             -- message d'invitation libre

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Empêche les doubles demandes (peu importe le sens)
  CHECK (requester_pro_id <> recipient_pro_id),
  UNIQUE (requester_pro_id, recipient_pro_id)
);

CREATE INDEX IF NOT EXISTS brh_pro_conn_requester
  ON brh_pro_connections(requester_pro_id, status);
CREATE INDEX IF NOT EXISTS brh_pro_conn_recipient
  ON brh_pro_connections(recipient_pro_id, status);
CREATE INDEX IF NOT EXISTS brh_pro_conn_tenant
  ON brh_pro_connections(tenant_id, created_at DESC);

COMMENT ON TABLE brh_pro_connections IS
  'Phase 18.1 — graphe symétrique de connexions entre pros (LinkedIn-style). UNIQUE (requester, recipient) empêche les doubles.';

-- ----------------------------------------------------------------------------
-- 3.2 brh_pro_follows (follow asymétrique Twitter-style)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_pro_follows (
  follower_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,
  followed_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (follower_pro_id, followed_pro_id),
  CHECK (follower_pro_id <> followed_pro_id)
);

CREATE INDEX IF NOT EXISTS brh_pro_follows_followed
  ON brh_pro_follows(followed_pro_id, created_at DESC);

COMMENT ON TABLE brh_pro_follows IS
  'Phase 18.1 — follow asymétrique. Un pro suit un autre sans demande de connexion.';

-- ----------------------------------------------------------------------------
-- 3.3 brh_feed_posts (posts internes du réseau)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  author_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,
  author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  post_type TEXT NOT NULL
    CHECK (post_type IN (
      'photo_chantier',
      'realisation',
      'recommandation',
      'question_metier',
      'recherche_partenaire',
      'annonce_chantier',
      'actu',
      'autre'
    )),

  body TEXT,                            -- corps du post (markdown léger)
  media_urls TEXT[] DEFAULT '{}',       -- chemins Storage (signed URLs côté front)
  media_blur_zones JSONB DEFAULT '[]',  -- [{media_idx, x, y, w, h, blur_radius}, ...] pour audit

  metiers_tags TEXT[] DEFAULT '{}',     -- ['couverture','isolation', ...]
  region_codes TEXT[] DEFAULT '{}',     -- ['29','56'] pour ciblage géo

  -- Lien optionnel vers une offre de chantier (post_type='annonce_chantier')
  related_chantier_offer_id UUID,       -- FK ajoutée après création de la table chantiers

  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','reseau','prive')),

  -- Modération minimale embarquée (Étape 6 du plan)
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,  -- soft-delete admin
  hidden_at TIMESTAMPTZ,
  hidden_reason TEXT,

  -- Compteurs (maj via triggers)
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  impression_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes critiques pour le feed
CREATE INDEX IF NOT EXISTS brh_feed_posts_tenant_recent
  ON brh_feed_posts(tenant_id, created_at DESC) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS brh_feed_posts_author
  ON brh_feed_posts(author_pro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_feed_posts_type
  ON brh_feed_posts(post_type, created_at DESC) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS brh_feed_posts_metiers
  ON brh_feed_posts USING GIN(metiers_tags);
CREATE INDEX IF NOT EXISTS brh_feed_posts_regions
  ON brh_feed_posts USING GIN(region_codes);

COMMENT ON TABLE brh_feed_posts IS
  'Phase 18.1 — posts internes du fil /reseau. visibility public par défaut (décision #5). Modération via is_hidden + soft-delete.';

-- ----------------------------------------------------------------------------
-- 3.4 brh_feed_reactions (like / recommande / expert)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_feed_reactions (
  post_id UUID NOT NULL REFERENCES brh_feed_posts(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  reaction_type TEXT NOT NULL DEFAULT 'like'
    CHECK (reaction_type IN ('like','recommande','expert')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (post_id, pro_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS brh_feed_reactions_post
  ON brh_feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS brh_feed_reactions_pro
  ON brh_feed_reactions(pro_id, created_at DESC);

COMMENT ON TABLE brh_feed_reactions IS
  'Phase 18.1 — réactions sur posts. 3 types : like (générique), recommande (endorsement positif), expert (validation technique BTP).';

-- ----------------------------------------------------------------------------
-- 3.5 brh_feed_comments (threadés)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES brh_feed_posts(id) ON DELETE CASCADE,
  author_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  parent_comment_id UUID REFERENCES brh_feed_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at TIMESTAMPTZ,
  hidden_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_feed_comments_post
  ON brh_feed_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS brh_feed_comments_parent
  ON brh_feed_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

COMMENT ON TABLE brh_feed_comments IS
  'Phase 18.1 — commentaires threadés via parent_comment_id (1 niveau de profondeur côté UI V1).';

-- ----------------------------------------------------------------------------
-- 3.6 brh_feed_impressions (observabilité algo, inspiré AUTAF ENGINE V2)
-- ----------------------------------------------------------------------------
-- Subset 5 events au lieu de 52 AUTAF (cap MVP) :
-- 'view'    — post affiché dans le feed (impression brute)
-- 'dwell'   — post resté visible >2s (engagement passif)
-- 'click'   — clic sur le post (engagement actif)
-- 'expand'  — clic "voir plus"
-- 'hide'    — user a masqué (signal négatif)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_feed_impressions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  post_id UUID NOT NULL REFERENCES brh_feed_posts(id) ON DELETE CASCADE,
  viewer_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL
    CHECK (event_type IN ('view','dwell','click','expand','hide')),

  dwell_ms INTEGER,         -- temps de visibilité en ms (pour 'dwell' uniquement)
  device_type TEXT,         -- 'mobile' / 'desktop' / 'tablet'
  session_id UUID,          -- regroupe plusieurs events en une session

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes critiques (le feed les lit beaucoup)
CREATE INDEX IF NOT EXISTS brh_feed_impr_viewer_post
  ON brh_feed_impressions(viewer_pro_id, post_id);
CREATE INDEX IF NOT EXISTS brh_feed_impr_post_type
  ON brh_feed_impressions(post_id, event_type);
CREATE INDEX IF NOT EXISTS brh_feed_impr_session
  ON brh_feed_impressions(session_id) WHERE session_id IS NOT NULL;

COMMENT ON TABLE brh_feed_impressions IS
  'Phase 18.1 — observabilité algo feed. Inspiré AUTAF ENGINE V2 (subset 5 events au lieu de 52). Permet l''algo "ne pas re-montrer ce que l''user a déjà vu".';

-- ----------------------------------------------------------------------------
-- 3.7 brh_pro_endorsements (recommandations positives — décision #3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_pro_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  endorser_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,
  endorsed_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  metier_tag TEXT NOT NULL,  -- ex: 'zinguerie', 'isolation_combles'
  body TEXT,                 -- texte libre court (≤500 chars côté front)

  -- Preuve optionnelle : lien vers un chantier signé via la marketplace
  chantier_offer_id UUID,    -- FK ajoutée après création de la table chantiers

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (endorser_pro_id <> endorsed_pro_id),
  UNIQUE (endorser_pro_id, endorsed_pro_id, metier_tag)
);

CREATE INDEX IF NOT EXISTS brh_pro_endorse_endorsed
  ON brh_pro_endorsements(endorsed_pro_id, created_at DESC) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS brh_pro_endorse_metier
  ON brh_pro_endorsements(metier_tag, endorsed_pro_id) WHERE is_hidden = FALSE;

COMMENT ON TABLE brh_pro_endorsements IS
  'Phase 18.1 — recommandations positives only V1 (décision #3). UNIQUE (endorser, endorsed, metier_tag) pour éviter les doublons par métier.';

-- ----------------------------------------------------------------------------
-- 3.8 brh_chantier_offers (KILLER feature marketplace)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_chantier_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  publisher_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- Métiers cherchés (un chantier peut chercher plusieurs métiers complémentaires)
  metiers_recherches TEXT[] NOT NULL DEFAULT '{}',

  -- Localisation
  adresse TEXT,
  code_postal CHAR(5),
  commune TEXT,
  departement CHAR(2),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Budget (BIGINT cents — règle anti-bug #2)
  budget_cents BIGINT,
  budget_visible BOOLEAN NOT NULL DEFAULT TRUE,  -- masquer le budget côté front si false

  start_date DATE,
  duration_weeks INTEGER,

  contract_mode TEXT NOT NULL DEFAULT 'sous_traitance'
    CHECK (contract_mode IN ('sous_traitance','co_traitance','apport')),

  -- Commission tracée (décision #6 : 5% HT par défaut)
  commission_offer_pct INTEGER NOT NULL DEFAULT 5
    CHECK (commission_offer_pct >= 0 AND commission_offer_pct <= 30),

  -- Lien optionnel vers un prospect existant (pré-remplit le funnel BRH)
  related_prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','negotiating','assigned','signed','closed','cancelled')),

  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','reseau','prive')),

  expires_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_chantier_offers_open
  ON brh_chantier_offers(tenant_id, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS brh_chantier_offers_publisher
  ON brh_chantier_offers(publisher_pro_id, status);
CREATE INDEX IF NOT EXISTS brh_chantier_offers_metiers
  ON brh_chantier_offers USING GIN(metiers_recherches);
CREATE INDEX IF NOT EXISTS brh_chantier_offers_dept
  ON brh_chantier_offers(departement, status);
CREATE INDEX IF NOT EXISTS brh_chantier_offers_geo
  ON brh_chantier_offers(lat, lng) WHERE status = 'open' AND lat IS NOT NULL;

COMMENT ON TABLE brh_chantier_offers IS
  'Phase 18.1 — KILLER feature marketplace. Pros publient des chantiers cherchant des co-traitants/sous-traitants. Commission 5% HT à signature (décision #6).';

-- ----------------------------------------------------------------------------
-- 3.9 brh_chantier_applications (candidatures sur offres)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_chantier_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES brh_chantier_offers(id) ON DELETE CASCADE,
  applicant_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  message TEXT,
  devis_url TEXT,            -- chemin Storage signed URL
  devis_amount_cents BIGINT, -- montant proposé HT en cents

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','shortlisted','selected','rejected','withdrawn')),

  -- Snapshot commission au moment de la sélection
  commission_pct_snapshot INTEGER,
  commission_amount_cents BIGINT,
  commission_status TEXT
    CHECK (commission_status IN ('pending','validated','paid')),
  commission_paid_at TIMESTAMPTZ,

  -- Lien vers thread message auto-créé à la sélection
  message_thread_id UUID REFERENCES brh_message_threads(id) ON DELETE SET NULL,

  -- Lien vers brh_quotes signée (pour calcul commission)
  quote_id UUID REFERENCES brh_quotes(id) ON DELETE SET NULL,

  selected_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (offer_id, applicant_pro_id)
);

CREATE INDEX IF NOT EXISTS brh_chantier_app_offer
  ON brh_chantier_applications(offer_id, status);
CREATE INDEX IF NOT EXISTS brh_chantier_app_applicant
  ON brh_chantier_applications(applicant_pro_id, created_at DESC);

COMMENT ON TABLE brh_chantier_applications IS
  'Phase 18.1 — candidatures sur offres de chantier. UNIQUE (offer, applicant) empêche les doubles. Commission snapshot à la sélection.';

-- ----------------------------------------------------------------------------
-- 3.10 brh_autaf_link (bridge API AUTAF, décision 06/05)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_autaf_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES brh_partner_contracts(id) ON DELETE SET NULL,

  autaf_user_id TEXT NOT NULL,            -- ID côté AUTAF WordPress
  autaf_username TEXT,                    -- handle AUTAF pour affichage

  oauth_access_token_encrypted TEXT NOT NULL,    -- AES-GCM via pgcrypto V2 (V1 = TODO chiffrement EF)
  oauth_refresh_token_encrypted TEXT,
  oauth_expires_at TIMESTAMPTZ,

  -- Scopes accordés par AUTAF
  scopes TEXT[] NOT NULL DEFAULT '{}',
    -- ex: ['read_recommendations','write_posts','write_chantiers']

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id),                     -- 1 lien AUTAF par user BRH
  UNIQUE (autaf_user_id)                   -- 1 lien BRH par user AUTAF
);

CREATE INDEX IF NOT EXISTS brh_autaf_link_pro
  ON brh_autaf_link(pro_id) WHERE pro_id IS NOT NULL;

COMMENT ON TABLE brh_autaf_link IS
  'Phase 18.1 — bridge OAuth vers AUTAF WordPress (autaf/v1). 1:1 user BRH ↔ user AUTAF. Tokens chiffrés (TODO: pgcrypto AES-GCM Étape 8).';

-- ----------------------------------------------------------------------------
-- 3.11 brh_feed_reports (modération minimale embarquée Étape 6)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_feed_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  reporter_pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  -- Cible polymorphe : post OU comment (un seul des deux non NULL)
  reported_post_id UUID REFERENCES brh_feed_posts(id) ON DELETE CASCADE,
  reported_comment_id UUID REFERENCES brh_feed_comments(id) ON DELETE CASCADE,

  reason TEXT NOT NULL
    CHECK (reason IN ('spam','illegal','offensive','rgpd_personne','rgpd_plaque','other')),
  comment TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','action_taken','dismissed')),

  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,    -- ex: 'post_hidden', 'user_warned', 'user_banned'

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactement une cible (post XOR comment)
  CHECK (
    (reported_post_id IS NOT NULL AND reported_comment_id IS NULL)
    OR
    (reported_post_id IS NULL AND reported_comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS brh_feed_reports_pending
  ON brh_feed_reports(created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS brh_feed_reports_post
  ON brh_feed_reports(reported_post_id) WHERE reported_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_feed_reports_comment
  ON brh_feed_reports(reported_comment_id) WHERE reported_comment_id IS NOT NULL;

COMMENT ON TABLE brh_feed_reports IS
  'Phase 18.1 — signalements de posts/comments. Modération minimale embarquée (Étape 6 du plan), workflow avancé en Étape 9.';

-- ============================================================================
-- 4. FK différées (les tables se référencent mutuellement)
-- ============================================================================

-- brh_feed_posts.related_chantier_offer_id → brh_chantier_offers
ALTER TABLE brh_feed_posts
  ADD CONSTRAINT brh_feed_posts_chantier_fk
  FOREIGN KEY (related_chantier_offer_id)
  REFERENCES brh_chantier_offers(id) ON DELETE SET NULL;

-- brh_pro_endorsements.chantier_offer_id → brh_chantier_offers
ALTER TABLE brh_pro_endorsements
  ADD CONSTRAINT brh_pro_endorse_chantier_fk
  FOREIGN KEY (chantier_offer_id)
  REFERENCES brh_chantier_offers(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Helper SECURITY DEFINER : brh_pro_can_view_post(post_id)
-- ----------------------------------------------------------------------------
-- Encapsule la logique de visibilité graph-aware utilisée par RLS SELECT.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.brh_pro_can_view_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer UUID;
  v_post RECORD;
BEGIN
  v_viewer := public.brh_user_pro_id();

  SELECT id, author_pro_id, visibility, is_hidden
  INTO v_post
  FROM public.brh_feed_posts
  WHERE id = p_post_id;

  IF v_post.id IS NULL THEN RETURN FALSE; END IF;
  IF v_post.is_hidden THEN
    -- Author + admin voient toujours leurs posts hidden
    RETURN v_post.author_pro_id = v_viewer;
  END IF;

  -- Visibilité publique : tout pro authentifié voit
  IF v_post.visibility = 'public' THEN RETURN v_viewer IS NOT NULL; END IF;

  -- Pas pro = pas de feed
  IF v_viewer IS NULL THEN RETURN FALSE; END IF;

  -- Auteur voit son post
  IF v_post.author_pro_id = v_viewer THEN RETURN TRUE; END IF;

  -- Visibilité réseau : connexion accepted requise
  IF v_post.visibility = 'reseau' THEN
    RETURN public.brh_pro_in_network(v_viewer, v_post.author_pro_id);
  END IF;

  -- Visibilité privé : auteur uniquement
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_pro_can_view_post(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_pro_can_view_post(UUID) IS
  'Phase 18.1 — visibilité graph-aware d''un post selon visibility + connexions du viewer.';

-- ============================================================================
-- 6. Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Compteurs réactions sur brh_feed_posts.like_count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_feed_reactions_counter_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.brh_feed_posts
      SET like_count = like_count + 1,
          updated_at = now()
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.brh_feed_posts
      SET like_count = greatest(like_count - 1, 0),
          updated_at = now()
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_feed_reactions_counter ON brh_feed_reactions;
CREATE TRIGGER trg_brh_feed_reactions_counter
  AFTER INSERT OR DELETE ON brh_feed_reactions
  FOR EACH ROW EXECUTE FUNCTION public.brh_feed_reactions_counter_trigger();

-- ----------------------------------------------------------------------------
-- 6.2 Compteurs commentaires sur brh_feed_posts.comment_count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_feed_comments_counter_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.brh_feed_posts
      SET comment_count = comment_count + 1,
          updated_at = now()
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.brh_feed_posts
      SET comment_count = greatest(comment_count - 1, 0),
          updated_at = now()
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_feed_comments_counter ON brh_feed_comments;
CREATE TRIGGER trg_brh_feed_comments_counter
  AFTER INSERT OR DELETE ON brh_feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.brh_feed_comments_counter_trigger();

-- ----------------------------------------------------------------------------
-- 6.3 Commission marketplace 5% HT à la sélection + signature devis
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_chantier_commission_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_offer RECORD;
  v_quote RECORD;
BEGIN
  -- Cas 1 : application passe à 'selected' → snapshot commission
  IF TG_OP = 'UPDATE' AND NEW.status = 'selected' AND OLD.status <> 'selected' THEN
    SELECT id, commission_offer_pct
    INTO v_offer
    FROM public.brh_chantier_offers
    WHERE id = NEW.offer_id;

    NEW.commission_pct_snapshot := v_offer.commission_offer_pct;
    NEW.selected_at := now();
    -- commission_amount_cents calculé plus tard quand quote_id sera signé
  END IF;

  -- Cas 2 : application reçoit un quote_id signé → calcul commission
  IF TG_OP = 'UPDATE' AND NEW.quote_id IS NOT NULL
     AND (OLD.quote_id IS NULL OR OLD.quote_id <> NEW.quote_id) THEN
    SELECT id, amount_cents
    INTO v_quote
    FROM public.brh_quotes
    WHERE id = NEW.quote_id;

    IF v_quote.id IS NOT NULL AND NEW.commission_pct_snapshot IS NOT NULL THEN
      NEW.commission_amount_cents := (v_quote.amount_cents * NEW.commission_pct_snapshot) / 100;
      NEW.commission_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_chantier_commission ON brh_chantier_applications;
CREATE TRIGGER trg_brh_chantier_commission
  BEFORE UPDATE ON brh_chantier_applications
  FOR EACH ROW EXECUTE FUNCTION public.brh_chantier_commission_trigger();

-- ----------------------------------------------------------------------------
-- 6.4 updated_at auto sur les tables concernées (réutilise helper existant)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_pro_conn_updated ON brh_pro_connections;
CREATE TRIGGER trg_brh_pro_conn_updated
  BEFORE UPDATE ON brh_pro_connections
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_feed_posts_updated ON brh_feed_posts;
CREATE TRIGGER trg_brh_feed_posts_updated
  BEFORE UPDATE ON brh_feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_feed_comments_updated ON brh_feed_comments;
CREATE TRIGGER trg_brh_feed_comments_updated
  BEFORE UPDATE ON brh_feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_chantier_offers_updated ON brh_chantier_offers;
CREATE TRIGGER trg_brh_chantier_offers_updated
  BEFORE UPDATE ON brh_chantier_offers
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_chantier_app_updated ON brh_chantier_applications;
CREATE TRIGGER trg_brh_chantier_app_updated
  BEFORE UPDATE ON brh_chantier_applications
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_autaf_link_updated ON brh_autaf_link;
CREATE TRIGGER trg_brh_autaf_link_updated
  BEFORE UPDATE ON brh_autaf_link
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ============================================================================
-- 7. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE brh_pro_connections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_pro_follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_feed_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_feed_reactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_feed_comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_feed_impressions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_pro_endorsements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_chantier_offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_chantier_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_autaf_link             ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_feed_reports           ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 7.1 brh_pro_connections (les 2 parties voient, requester crée, recipient répond)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS pro_conn_self_select ON brh_pro_connections;
CREATE POLICY pro_conn_self_select ON brh_pro_connections
  FOR SELECT TO authenticated
  USING (
    requester_pro_id = public.brh_user_pro_id()
    OR recipient_pro_id = public.brh_user_pro_id()
  );

DROP POLICY IF EXISTS pro_conn_requester_insert ON brh_pro_connections;
CREATE POLICY pro_conn_requester_insert ON brh_pro_connections
  FOR INSERT TO authenticated
  WITH CHECK (requester_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS pro_conn_recipient_update ON brh_pro_connections;
CREATE POLICY pro_conn_recipient_update ON brh_pro_connections
  FOR UPDATE TO authenticated
  USING (recipient_pro_id = public.brh_user_pro_id())
  WITH CHECK (recipient_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS pro_conn_admin_all ON brh_pro_connections;
CREATE POLICY pro_conn_admin_all ON brh_pro_connections
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.2 brh_pro_follows (follower CRUD, public read)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS pro_follows_authenticated_select ON brh_pro_follows;
CREATE POLICY pro_follows_authenticated_select ON brh_pro_follows
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : graphe public visible aux pros connectés

DROP POLICY IF EXISTS pro_follows_owner_insert ON brh_pro_follows;
CREATE POLICY pro_follows_owner_insert ON brh_pro_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS pro_follows_owner_delete ON brh_pro_follows;
CREATE POLICY pro_follows_owner_delete ON brh_pro_follows
  FOR DELETE TO authenticated
  USING (follower_pro_id = public.brh_user_pro_id());

-- ----------------------------------------------------------------------------
-- 7.3 brh_feed_posts (visibilité via helper, auteur CRUD, admin all)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS feed_posts_visible_select ON brh_feed_posts;
CREATE POLICY feed_posts_visible_select ON brh_feed_posts
  FOR SELECT TO authenticated
  USING (public.brh_pro_can_view_post(id));

DROP POLICY IF EXISTS feed_posts_author_insert ON brh_feed_posts;
CREATE POLICY feed_posts_author_insert ON brh_feed_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_posts_author_update ON brh_feed_posts;
CREATE POLICY feed_posts_author_update ON brh_feed_posts
  FOR UPDATE TO authenticated
  USING (author_pro_id = public.brh_user_pro_id())
  WITH CHECK (author_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_posts_author_delete ON brh_feed_posts;
CREATE POLICY feed_posts_author_delete ON brh_feed_posts
  FOR DELETE TO authenticated
  USING (author_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_posts_admin_all ON brh_feed_posts;
CREATE POLICY feed_posts_admin_all ON brh_feed_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.4 brh_feed_reactions (auteur des réactions = pro_id, lecture si peut voir le post)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS feed_reactions_visible_select ON brh_feed_reactions;
CREATE POLICY feed_reactions_visible_select ON brh_feed_reactions
  FOR SELECT TO authenticated
  USING (public.brh_pro_can_view_post(post_id));

DROP POLICY IF EXISTS feed_reactions_owner_insert ON brh_feed_reactions;
CREATE POLICY feed_reactions_owner_insert ON brh_feed_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    pro_id = public.brh_user_pro_id()
    AND public.brh_pro_can_view_post(post_id)
  );

DROP POLICY IF EXISTS feed_reactions_owner_delete ON brh_feed_reactions;
CREATE POLICY feed_reactions_owner_delete ON brh_feed_reactions
  FOR DELETE TO authenticated
  USING (pro_id = public.brh_user_pro_id());

-- ----------------------------------------------------------------------------
-- 7.5 brh_feed_comments (visibilité = visibilité du post)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS feed_comments_visible_select ON brh_feed_comments;
CREATE POLICY feed_comments_visible_select ON brh_feed_comments
  FOR SELECT TO authenticated
  USING (public.brh_pro_can_view_post(post_id));

DROP POLICY IF EXISTS feed_comments_author_insert ON brh_feed_comments;
CREATE POLICY feed_comments_author_insert ON brh_feed_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_pro_id = public.brh_user_pro_id()
    AND public.brh_pro_can_view_post(post_id)
  );

DROP POLICY IF EXISTS feed_comments_author_update ON brh_feed_comments;
CREATE POLICY feed_comments_author_update ON brh_feed_comments
  FOR UPDATE TO authenticated
  USING (author_pro_id = public.brh_user_pro_id())
  WITH CHECK (author_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_comments_admin_all ON brh_feed_comments;
CREATE POLICY feed_comments_admin_all ON brh_feed_comments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.6 brh_feed_impressions (viewer écrit, admin lit, viewer lit son historique)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS feed_impr_owner_select ON brh_feed_impressions;
CREATE POLICY feed_impr_owner_select ON brh_feed_impressions
  FOR SELECT TO authenticated
  USING (viewer_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_impr_owner_insert ON brh_feed_impressions;
CREATE POLICY feed_impr_owner_insert ON brh_feed_impressions
  FOR INSERT TO authenticated
  WITH CHECK (viewer_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_impr_admin_all ON brh_feed_impressions;
CREATE POLICY feed_impr_admin_all ON brh_feed_impressions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.7 brh_pro_endorsements (visibles par tout pro, endorser CRUD, admin all)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS pro_endorse_authenticated_select ON brh_pro_endorsements;
CREATE POLICY pro_endorse_authenticated_select ON brh_pro_endorsements
  FOR SELECT TO authenticated
  USING (is_hidden = FALSE OR endorser_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS pro_endorse_owner_insert ON brh_pro_endorsements;
CREATE POLICY pro_endorse_owner_insert ON brh_pro_endorsements
  FOR INSERT TO authenticated
  WITH CHECK (endorser_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS pro_endorse_owner_delete ON brh_pro_endorsements;
CREATE POLICY pro_endorse_owner_delete ON brh_pro_endorsements
  FOR DELETE TO authenticated
  USING (endorser_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS pro_endorse_admin_all ON brh_pro_endorsements;
CREATE POLICY pro_endorse_admin_all ON brh_pro_endorsements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.8 brh_chantier_offers (publisher CRUD, public read si status=open & visibility=public)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS chantier_offers_visible_select ON brh_chantier_offers;
CREATE POLICY chantier_offers_visible_select ON brh_chantier_offers
  FOR SELECT TO authenticated
  USING (
    publisher_pro_id = public.brh_user_pro_id()
    OR (
      status IN ('open','negotiating','assigned','signed')
      AND (
        visibility = 'public'
        OR (visibility = 'reseau' AND public.brh_pro_in_network(public.brh_user_pro_id(), publisher_pro_id))
      )
    )
  );

DROP POLICY IF EXISTS chantier_offers_publisher_insert ON brh_chantier_offers;
CREATE POLICY chantier_offers_publisher_insert ON brh_chantier_offers
  FOR INSERT TO authenticated
  WITH CHECK (publisher_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS chantier_offers_publisher_update ON brh_chantier_offers;
CREATE POLICY chantier_offers_publisher_update ON brh_chantier_offers
  FOR UPDATE TO authenticated
  USING (publisher_pro_id = public.brh_user_pro_id())
  WITH CHECK (publisher_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS chantier_offers_publisher_delete ON brh_chantier_offers;
CREATE POLICY chantier_offers_publisher_delete ON brh_chantier_offers
  FOR DELETE TO authenticated
  USING (publisher_pro_id = public.brh_user_pro_id() AND status = 'draft');

DROP POLICY IF EXISTS chantier_offers_admin_all ON brh_chantier_offers;
CREATE POLICY chantier_offers_admin_all ON brh_chantier_offers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.9 brh_chantier_applications (applicant + publisher voient, applicant CRUD)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS chantier_app_visible_select ON brh_chantier_applications;
CREATE POLICY chantier_app_visible_select ON brh_chantier_applications
  FOR SELECT TO authenticated
  USING (
    applicant_pro_id = public.brh_user_pro_id()
    OR EXISTS (
      SELECT 1 FROM public.brh_chantier_offers o
      WHERE o.id = offer_id AND o.publisher_pro_id = public.brh_user_pro_id()
    )
  );

DROP POLICY IF EXISTS chantier_app_applicant_insert ON brh_chantier_applications;
CREATE POLICY chantier_app_applicant_insert ON brh_chantier_applications
  FOR INSERT TO authenticated
  WITH CHECK (applicant_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS chantier_app_applicant_update ON brh_chantier_applications;
CREATE POLICY chantier_app_applicant_update ON brh_chantier_applications
  FOR UPDATE TO authenticated
  USING (applicant_pro_id = public.brh_user_pro_id())
  WITH CHECK (applicant_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS chantier_app_publisher_update ON brh_chantier_applications;
CREATE POLICY chantier_app_publisher_update ON brh_chantier_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brh_chantier_offers o
      WHERE o.id = offer_id AND o.publisher_pro_id = public.brh_user_pro_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brh_chantier_offers o
      WHERE o.id = offer_id AND o.publisher_pro_id = public.brh_user_pro_id()
    )
  );

DROP POLICY IF EXISTS chantier_app_admin_all ON brh_chantier_applications;
CREATE POLICY chantier_app_admin_all ON brh_chantier_applications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.10 brh_autaf_link (owner only, admin tout)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS autaf_link_owner_select ON brh_autaf_link;
CREATE POLICY autaf_link_owner_select ON brh_autaf_link
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS autaf_link_owner_insert ON brh_autaf_link;
CREATE POLICY autaf_link_owner_insert ON brh_autaf_link
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS autaf_link_owner_update ON brh_autaf_link;
CREATE POLICY autaf_link_owner_update ON brh_autaf_link
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS autaf_link_owner_delete ON brh_autaf_link;
CREATE POLICY autaf_link_owner_delete ON brh_autaf_link
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS autaf_link_admin_all ON brh_autaf_link;
CREATE POLICY autaf_link_admin_all ON brh_autaf_link
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 7.11 brh_feed_reports (reporter SELECT/INSERT, admin gère)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS feed_reports_owner_select ON brh_feed_reports;
CREATE POLICY feed_reports_owner_select ON brh_feed_reports
  FOR SELECT TO authenticated
  USING (reporter_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_reports_owner_insert ON brh_feed_reports;
CREATE POLICY feed_reports_owner_insert ON brh_feed_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_pro_id = public.brh_user_pro_id());

DROP POLICY IF EXISTS feed_reports_admin_all ON brh_feed_reports;
CREATE POLICY feed_reports_admin_all ON brh_feed_reports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

-- =============================================================================
-- Vérification post-migration (lecture seule, pas de COMMIT)
-- =============================================================================
SELECT 'pro_connections'      AS table_name, count(*) AS rows FROM brh_pro_connections
UNION ALL SELECT 'pro_follows',           count(*) FROM brh_pro_follows
UNION ALL SELECT 'feed_posts',            count(*) FROM brh_feed_posts
UNION ALL SELECT 'feed_reactions',        count(*) FROM brh_feed_reactions
UNION ALL SELECT 'feed_comments',         count(*) FROM brh_feed_comments
UNION ALL SELECT 'feed_impressions',      count(*) FROM brh_feed_impressions
UNION ALL SELECT 'pro_endorsements',      count(*) FROM brh_pro_endorsements
UNION ALL SELECT 'chantier_offers',       count(*) FROM brh_chantier_offers
UNION ALL SELECT 'chantier_applications', count(*) FROM brh_chantier_applications
UNION ALL SELECT 'autaf_link',            count(*) FROM brh_autaf_link
UNION ALL SELECT 'feed_reports',          count(*) FROM brh_feed_reports;
