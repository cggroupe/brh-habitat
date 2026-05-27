-- =============================================================================
-- 2026-05-27 (soir) — Réseau Pro : annuaire 15k entreprises bretonnes
-- =============================================================================
--
-- Contexte : Philippe veut lancer le réseau BRH en démarchant les 15 021
-- entreprises bretonnes du CSV prospects_bretagne_2026-05-07_FINAL.csv
-- (architectes, agences immo, maîtres d'œuvre, plombiers, électriciens,
-- couvreurs, etc.) depuis l'espace employé. Premier employé à contacter un
-- prospect = il le "claim" → les autres employés voient le prospect comme
-- "Suivi par {prénom}" sans pouvoir cliquer ni accéder aux infos contact.
--
-- Tables :
--   - brh_reseau_prospects   : annuaire master (15k entreprises)
--   - brh_reseau_claims      : qui a contacté quoi quand (ownership progressif)
--
-- RPC :
--   - brh_reseau_prospects_list(filtres) : retourne prospects + claim status
--   - brh_reseau_claim(prospect_id, method, notes) : claim atomique
--   - brh_reseau_unclaim(prospect_id) : libère (admin ou propriétaire claim)
--
-- Idempotente : IF NOT EXISTS + ON CONFLICT DO NOTHING.
-- =============================================================================

-- 1) Table annuaire
CREATE TABLE IF NOT EXISTS public.brh_reseau_prospects (
  id BIGSERIAL PRIMARY KEY,

  -- Identité entreprise
  nom TEXT NOT NULL,
  secteur TEXT,                          -- 'BTP' | 'Immo/Partenariat'
  metier_categorie TEXT,                 -- Plombier, Architecte, Agence immobilière, etc.

  -- Dirigeant
  nom_gerant TEXT,
  prenom_gerant TEXT,
  qualite_gerant TEXT,
  tous_dirigeants TEXT,                  -- JSON-string-like ou résumé

  -- Contacts
  telephone TEXT,
  email TEXT,
  email_site_web TEXT,
  site_web TEXT,
  site_web_titre TEXT,
  site_web_description TEXT,

  -- Réseaux sociaux
  facebook TEXT,
  instagram TEXT,
  linkedin TEXT,
  tiktok TEXT,
  youtube TEXT,

  -- Localisation
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  departement TEXT,                       -- '22' | '29' | '35' | '56'
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Légal / fiscal
  siret TEXT,
  siren TEXT,
  naf TEXT,
  naf_libelle TEXT,
  forme_juridique TEXT,
  forme_juridique_libelle TEXT,
  effectif TEXT,
  tranche_effectif_libelle TEXT,
  chiffre_affaires TEXT,                  -- garde en TEXT car parfois "NN" / vide
  date_creation DATE,

  -- Contenu marketing
  description TEXT,
  prestations TEXT,
  logo_url TEXT,
  page_pagesjaunes TEXT,
  note_google DOUBLE PRECISION,
  nb_avis INTEGER DEFAULT 0,

  -- RGE
  is_rge BOOLEAN DEFAULT false,
  rge_certifications TEXT,
  rge_domaines TEXT,
  rge_date_validite DATE,

  -- Métadata source
  sources TEXT,
  date_scraping DATE,
  source_csv TEXT DEFAULT 'prospects_bretagne_2026-05-07_FINAL',
  ingested_at TIMESTAMPTZ DEFAULT now()
);

-- Dédup key : SIRET (préféré) ou nom_norm + code_postal (fallback)
CREATE UNIQUE INDEX IF NOT EXISTS brh_reseau_prospects_siret_uq
  ON public.brh_reseau_prospects (siret)
  WHERE siret IS NOT NULL AND length(siret) >= 14;

CREATE UNIQUE INDEX IF NOT EXISTS brh_reseau_prospects_nomville_uq
  ON public.brh_reseau_prospects (lower(nom), code_postal)
  WHERE siret IS NULL OR length(siret) < 14;

-- Indexes filtres + recherche
CREATE INDEX IF NOT EXISTS brh_reseau_prospects_metier_idx ON public.brh_reseau_prospects (metier_categorie);
CREATE INDEX IF NOT EXISTS brh_reseau_prospects_dept_idx ON public.brh_reseau_prospects (departement);
CREATE INDEX IF NOT EXISTS brh_reseau_prospects_secteur_idx ON public.brh_reseau_prospects (secteur);
CREATE INDEX IF NOT EXISTS brh_reseau_prospects_rge_idx ON public.brh_reseau_prospects (is_rge) WHERE is_rge = true;
CREATE INDEX IF NOT EXISTS brh_reseau_prospects_nom_trgm_idx
  ON public.brh_reseau_prospects USING gin (lower(nom) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS brh_reseau_prospects_ville_trgm_idx
  ON public.brh_reseau_prospects USING gin (lower(ville) gin_trgm_ops);

COMMENT ON TABLE public.brh_reseau_prospects IS
  '2026-05-27 — Annuaire 15k entreprises bretonnes (BTP + Immo) pour démarchage employés BRH. Source : CSV PagesJaunes/Apify mai 2026.';

-- 2) Table claims (ownership progressif)
CREATE TABLE IF NOT EXISTS public.brh_reseau_claims (
  id BIGSERIAL PRIMARY KEY,
  prospect_id BIGINT NOT NULL REFERENCES public.brh_reseau_prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Mode de contact réalisé (informatif)
  contact_method TEXT,                    -- 'phone' | 'email' | 'linkedin' | 'visit' | 'other'
  -- Status du suivi
  status TEXT NOT NULL DEFAULT 'contacte',  -- 'contacte' | 'rdv_pris' | 'partenaire' | 'refus' | 'abandonne'
  -- Notes libres
  notes TEXT,
  last_action_at TIMESTAMPTZ DEFAULT now(),

  -- Un prospect ne peut être claim que par un seul employé à la fois
  UNIQUE (prospect_id)
);

CREATE INDEX IF NOT EXISTS brh_reseau_claims_user_idx ON public.brh_reseau_claims (user_id);
CREATE INDEX IF NOT EXISTS brh_reseau_claims_status_idx ON public.brh_reseau_claims (status);
CREATE INDEX IF NOT EXISTS brh_reseau_claims_last_action_idx ON public.brh_reseau_claims (last_action_at DESC);

COMMENT ON TABLE public.brh_reseau_claims IS
  '2026-05-27 — Ownership progressif réseau : premier employé à contacter un prospect le verrouille pour les autres. Admin peut unclaim.';

-- 3) Trigger updated_at sur claims
CREATE OR REPLACE FUNCTION public.brh_reseau_claims_touch_last_action()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.last_action_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_reseau_claims_touch_trg ON public.brh_reseau_claims;
CREATE TRIGGER brh_reseau_claims_touch_trg
  BEFORE UPDATE ON public.brh_reseau_claims
  FOR EACH ROW EXECUTE FUNCTION public.brh_reseau_claims_touch_last_action();

-- 4) RLS — employés lisent tout (avec masking côté RPC), claims = own only
ALTER TABLE public.brh_reseau_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brh_reseau_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reseau_prospects_employes_can_read ON public.brh_reseau_prospects;
CREATE POLICY reseau_prospects_employes_can_read ON public.brh_reseau_prospects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.role IN ('employe', 'admin')
    )
  );

DROP POLICY IF EXISTS reseau_claims_select_own_or_admin ON public.brh_reseau_claims;
CREATE POLICY reseau_claims_select_own_or_admin ON public.brh_reseau_claims
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

DROP POLICY IF EXISTS reseau_claims_insert_self ON public.brh_reseau_claims;
CREATE POLICY reseau_claims_insert_self ON public.brh_reseau_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('employe', 'admin'))
  );

DROP POLICY IF EXISTS reseau_claims_update_own_or_admin ON public.brh_reseau_claims;
CREATE POLICY reseau_claims_update_own_or_admin ON public.brh_reseau_claims
  FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

DROP POLICY IF EXISTS reseau_claims_delete_admin ON public.brh_reseau_claims;
CREATE POLICY reseau_claims_delete_admin ON public.brh_reseau_claims
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

-- 5) RPC list : retourne prospects + claim_status + masque les contacts si claimed par autre
DROP FUNCTION IF EXISTS public.brh_reseau_prospects_list(
  text, text, text, boolean, boolean, boolean, text, integer, integer, text
);

CREATE OR REPLACE FUNCTION public.brh_reseau_prospects_list(
  p_dept TEXT DEFAULT NULL,                -- '22' | '29' | '35' | '56'
  p_secteur TEXT DEFAULT NULL,              -- 'BTP' | 'Immo/Partenariat'
  p_metier TEXT DEFAULT NULL,               -- Plombier, Architecte, etc.
  p_filter_rge BOOLEAN DEFAULT FALSE,
  p_filter_with_email BOOLEAN DEFAULT FALSE,
  p_filter_with_site BOOLEAN DEFAULT FALSE,
  p_search TEXT DEFAULT NULL,               -- nom OU ville
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_claim_filter TEXT DEFAULT 'all'         -- 'all' | 'free' | 'mine'
)
RETURNS TABLE (
  id BIGINT,
  nom TEXT,
  secteur TEXT,
  metier_categorie TEXT,
  ville TEXT,
  code_postal TEXT,
  departement TEXT,
  description TEXT,
  is_rge BOOLEAN,
  rge_certifications TEXT,
  note_google DOUBLE PRECISION,
  nb_avis INTEGER,
  logo_url TEXT,
  -- Contacts (NULL si claim par autre)
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  linkedin TEXT,
  -- Claim status
  is_claimed BOOLEAN,
  claimed_by_user_id UUID,
  claimed_by_name TEXT,
  claimed_at TIMESTAMPTZ,
  claim_status TEXT,
  -- Effectif/CA pour preview
  effectif TEXT,
  -- Pagination
  total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_search_pct TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_search_pct := CASE WHEN p_search IS NOT NULL AND length(p_search) > 0
                       THEN '%' || lower(p_search) || '%' ELSE NULL END;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.*,
      c.user_id AS c_user_id,
      c.claimed_at AS c_claimed_at,
      c.status AS c_status,
      prof.full_name AS c_user_name
    FROM public.brh_reseau_prospects p
    LEFT JOIN public.brh_reseau_claims c ON c.prospect_id = p.id
    LEFT JOIN public.profiles prof ON prof.id = c.user_id
    WHERE
      (p_dept IS NULL OR p.departement = p_dept)
      AND (p_secteur IS NULL OR p.secteur = p_secteur)
      AND (p_metier IS NULL OR p.metier_categorie = p_metier)
      AND (p_filter_rge = FALSE OR p.is_rge = TRUE)
      AND (p_filter_with_email = FALSE OR (p.email IS NOT NULL AND length(p.email) > 0))
      AND (p_filter_with_site = FALSE OR (p.site_web IS NOT NULL AND length(p.site_web) > 0))
      AND (v_search_pct IS NULL OR lower(p.nom) LIKE v_search_pct OR lower(p.ville) LIKE v_search_pct)
      AND (p_claim_filter = 'all'
           OR (p_claim_filter = 'free' AND c.user_id IS NULL)
           OR (p_claim_filter = 'mine' AND c.user_id = v_user_id))
  ),
  cnt AS (SELECT COUNT(*) AS n FROM base)
  SELECT
    b.id,
    b.nom,
    b.secteur,
    b.metier_categorie,
    b.ville,
    b.code_postal,
    b.departement,
    b.description,
    b.is_rge,
    b.rge_certifications,
    b.note_google,
    b.nb_avis,
    b.logo_url,
    -- Mask contacts si claim par autre (le owner et l'admin voient tout)
    CASE
      WHEN b.c_user_id IS NULL THEN b.telephone
      WHEN b.c_user_id = v_user_id THEN b.telephone
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.role = 'admin') THEN b.telephone
      ELSE NULL
    END AS telephone,
    CASE
      WHEN b.c_user_id IS NULL THEN b.email
      WHEN b.c_user_id = v_user_id THEN b.email
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.role = 'admin') THEN b.email
      ELSE NULL
    END AS email,
    CASE
      WHEN b.c_user_id IS NULL THEN b.site_web
      WHEN b.c_user_id = v_user_id THEN b.site_web
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.role = 'admin') THEN b.site_web
      ELSE NULL
    END AS site_web,
    CASE
      WHEN b.c_user_id IS NULL THEN b.linkedin
      WHEN b.c_user_id = v_user_id THEN b.linkedin
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.role = 'admin') THEN b.linkedin
      ELSE NULL
    END AS linkedin,
    (b.c_user_id IS NOT NULL) AS is_claimed,
    b.c_user_id AS claimed_by_user_id,
    b.c_user_name AS claimed_by_name,
    b.c_claimed_at AS claimed_at,
    b.c_status AS claim_status,
    b.effectif,
    (SELECT n FROM cnt) AS total_count
  FROM base b
  ORDER BY
    (b.c_user_id IS NULL) DESC,        -- non claim d'abord
    b.is_rge DESC NULLS LAST,           -- RGE en haut
    b.note_google DESC NULLS LAST,
    b.nom
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_reseau_prospects_list(
  text, text, text, boolean, boolean, boolean, text, integer, integer, text
) TO authenticated;

-- 6) RPC fiche détail : full data si non claim ou claim par soi/admin, masked sinon
DROP FUNCTION IF EXISTS public.brh_reseau_prospect_get(BIGINT);

CREATE OR REPLACE FUNCTION public.brh_reseau_prospect_get(p_id BIGINT)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_prospect public.brh_reseau_prospects%ROWTYPE;
  v_claim public.brh_reseau_claims%ROWTYPE;
  v_claim_user_name TEXT;
  v_can_see_contacts BOOLEAN;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_user_id;

  SELECT * INTO v_prospect FROM public.brh_reseau_prospects WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'prospect not found'; END IF;

  SELECT * INTO v_claim FROM public.brh_reseau_claims WHERE prospect_id = p_id;
  IF FOUND THEN
    SELECT full_name INTO v_claim_user_name FROM public.profiles WHERE id = v_claim.user_id;
  END IF;

  v_can_see_contacts := (v_claim.user_id IS NULL)
                      OR (v_claim.user_id = v_user_id)
                      OR v_is_admin;

  v_result := jsonb_build_object(
    'id', v_prospect.id,
    'nom', v_prospect.nom,
    'secteur', v_prospect.secteur,
    'metier_categorie', v_prospect.metier_categorie,
    'nom_gerant', v_prospect.nom_gerant,
    'prenom_gerant', v_prospect.prenom_gerant,
    'qualite_gerant', v_prospect.qualite_gerant,
    'tous_dirigeants', v_prospect.tous_dirigeants,
    'adresse', v_prospect.adresse,
    'code_postal', v_prospect.code_postal,
    'ville', v_prospect.ville,
    'departement', v_prospect.departement,
    'latitude', v_prospect.latitude,
    'longitude', v_prospect.longitude,
    'siret', v_prospect.siret,
    'siren', v_prospect.siren,
    'naf', v_prospect.naf,
    'naf_libelle', v_prospect.naf_libelle,
    'forme_juridique', v_prospect.forme_juridique_libelle,
    'effectif', v_prospect.effectif,
    'tranche_effectif', v_prospect.tranche_effectif_libelle,
    'chiffre_affaires', v_prospect.chiffre_affaires,
    'date_creation', v_prospect.date_creation,
    'description', v_prospect.description,
    'prestations', v_prospect.prestations,
    'logo_url', v_prospect.logo_url,
    'page_pagesjaunes', v_prospect.page_pagesjaunes,
    'note_google', v_prospect.note_google,
    'nb_avis', v_prospect.nb_avis,
    'is_rge', v_prospect.is_rge,
    'rge_certifications', v_prospect.rge_certifications,
    'rge_domaines', v_prospect.rge_domaines,
    'rge_date_validite', v_prospect.rge_date_validite,
    'sources', v_prospect.sources,
    'date_scraping', v_prospect.date_scraping,

    'is_claimed', (v_claim.user_id IS NOT NULL),
    'claim', CASE WHEN v_claim.user_id IS NOT NULL THEN jsonb_build_object(
      'user_id', v_claim.user_id,
      'user_name', v_claim_user_name,
      'claimed_at', v_claim.claimed_at,
      'status', v_claim.status,
      'contact_method', v_claim.contact_method,
      'last_action_at', v_claim.last_action_at,
      'notes', CASE WHEN v_claim.user_id = v_user_id OR v_is_admin THEN v_claim.notes ELSE NULL END
    ) ELSE NULL END,

    'can_see_contacts', v_can_see_contacts,
    'contacts', CASE WHEN v_can_see_contacts THEN jsonb_build_object(
      'telephone', v_prospect.telephone,
      'email', v_prospect.email,
      'email_site_web', v_prospect.email_site_web,
      'site_web', v_prospect.site_web,
      'site_web_titre', v_prospect.site_web_titre,
      'site_web_description', v_prospect.site_web_description,
      'facebook', v_prospect.facebook,
      'instagram', v_prospect.instagram,
      'linkedin', v_prospect.linkedin,
      'tiktok', v_prospect.tiktok,
      'youtube', v_prospect.youtube
    ) ELSE NULL END
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_reseau_prospect_get(BIGINT) TO authenticated;

-- 7) RPC claim atomique
DROP FUNCTION IF EXISTS public.brh_reseau_claim(BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.brh_reseau_claim(
  p_id BIGINT,
  p_method TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing public.brh_reseau_claims%ROWTYPE;
  v_user_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role IN ('employe', 'admin')) THEN
    RAISE EXCEPTION 'forbidden: employe or admin only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brh_reseau_prospects WHERE id = p_id) THEN
    RAISE EXCEPTION 'prospect not found';
  END IF;

  SELECT * INTO v_existing FROM public.brh_reseau_claims WHERE prospect_id = p_id;
  IF FOUND AND v_existing.user_id != v_user_id THEN
    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_existing.user_id;
    RAISE EXCEPTION 'already claimed by %', COALESCE(v_user_name, v_existing.user_id::text);
  END IF;

  IF FOUND THEN
    -- Update own claim
    UPDATE public.brh_reseau_claims SET
      contact_method = COALESCE(p_method, contact_method),
      notes = COALESCE(p_notes, notes),
      last_action_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.brh_reseau_claims (prospect_id, user_id, contact_method, notes)
    VALUES (p_id, v_user_id, p_method, p_notes);
  END IF;

  RETURN public.brh_reseau_prospect_get(p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_reseau_claim(BIGINT, TEXT, TEXT) TO authenticated;

-- 8) RPC update status / notes
DROP FUNCTION IF EXISTS public.brh_reseau_claim_update(BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.brh_reseau_claim_update(
  p_id BIGINT,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_claim public.brh_reseau_claims%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_user_id;
  SELECT * INTO v_claim FROM public.brh_reseau_claims WHERE prospect_id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found'; END IF;
  IF v_claim.user_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden : owner or admin only';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('contacte','rdv_pris','partenaire','refus','abandonne') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.brh_reseau_claims SET
    status = COALESCE(p_status, status),
    notes = COALESCE(p_notes, notes),
    last_action_at = now()
  WHERE id = v_claim.id;
  RETURN public.brh_reseau_prospect_get(p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_reseau_claim_update(BIGINT, TEXT, TEXT) TO authenticated;

-- 9) RPC unclaim (owner ou admin)
DROP FUNCTION IF EXISTS public.brh_reseau_unclaim(BIGINT);

CREATE OR REPLACE FUNCTION public.brh_reseau_unclaim(p_id BIGINT)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_claim public.brh_reseau_claims%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_user_id;
  SELECT * INTO v_claim FROM public.brh_reseau_claims WHERE prospect_id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found'; END IF;
  IF v_claim.user_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden : owner or admin only';
  END IF;
  DELETE FROM public.brh_reseau_claims WHERE id = v_claim.id;
  RETURN public.brh_reseau_prospect_get(p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_reseau_unclaim(BIGINT) TO authenticated;

-- 10) RPC stats : KPIs admin dashboard + employé side
DROP FUNCTION IF EXISTS public.brh_reseau_stats(TEXT);

CREATE OR REPLACE FUNCTION public.brh_reseau_stats(p_scope TEXT DEFAULT 'global')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_total BIGINT;
  v_claimed BIGINT;
  v_my_claims BIGINT;
  v_by_dept jsonb;
  v_by_metier jsonb;
  v_by_status jsonb;
  v_top_employees jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_user_id;

  SELECT COUNT(*) INTO v_total FROM public.brh_reseau_prospects;
  SELECT COUNT(*) INTO v_claimed FROM public.brh_reseau_claims;
  SELECT COUNT(*) INTO v_my_claims FROM public.brh_reseau_claims WHERE user_id = v_user_id;

  SELECT jsonb_object_agg(departement, n) INTO v_by_dept FROM (
    SELECT departement, COUNT(*) AS n FROM public.brh_reseau_prospects
    GROUP BY departement
  ) x;

  SELECT jsonb_agg(jsonb_build_object('metier', metier_categorie, 'n', n) ORDER BY n DESC) INTO v_by_metier FROM (
    SELECT metier_categorie, COUNT(*) AS n FROM public.brh_reseau_prospects
    WHERE metier_categorie IS NOT NULL GROUP BY metier_categorie ORDER BY n DESC LIMIT 30
  ) x;

  SELECT jsonb_object_agg(status, n) INTO v_by_status FROM (
    SELECT status, COUNT(*) AS n FROM public.brh_reseau_claims GROUP BY status
  ) x;

  IF v_is_admin THEN
    SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'name', full_name, 'n', n) ORDER BY n DESC) INTO v_top_employees FROM (
      SELECT c.user_id, p.full_name, COUNT(*) AS n
      FROM public.brh_reseau_claims c
      LEFT JOIN public.profiles p ON p.id = c.user_id
      GROUP BY c.user_id, p.full_name ORDER BY n DESC LIMIT 20
    ) x;
  ELSE
    v_top_employees := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'claimed', v_claimed,
    'free', v_total - v_claimed,
    'my_claims', v_my_claims,
    'by_dept', COALESCE(v_by_dept, '{}'::jsonb),
    'by_metier', COALESCE(v_by_metier, '[]'::jsonb),
    'by_status', COALESCE(v_by_status, '{}'::jsonb),
    'top_employees', COALESCE(v_top_employees, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_reseau_stats(TEXT) TO authenticated;
