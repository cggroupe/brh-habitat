-- 2026-05-21 — Phase 2A.M-3 + M-4 — RPC normalize + RPC match DPE
--
-- CONTEXTE :
--   Suite à M-1 (unaccent) + M-2 (colonnes générées), les tables ont des
--   colonnes (adresse_norm, numero_norm, voie_norm) indexées. Mais la
--   normalisation pure-Postgres ne traite PAS l'expansion d'abréviations
--   (r → rue, av → avenue, bd → boulevard, etc.) ni les particules
--   discutables.
--
--   Option B retenue (cf docs/wiki/matching-adresse.md §5.M-3) :
--   appliquer l'expansion abréviations dans une fonction plpgsql appelée
--   à la volée par le RPC de matching. Pas de trigger sur les tables —
--   réversible, testable.
--
--   Pipeline complet RPC normalize :
--     1. lower + unaccent + trim (déjà dans colonnes générées)
--     2. Suppression CP+ville+pays embedded
--     3. Suppression apostrophes (l'argoat → l argoat)
--     4. Expansion abréviations voie (r/av/bd/pl/imp/ch/all/rte/sq/lot)
--     5. Espaces multiples → 1
--     6. Extraction numero_norm + voie_norm
--
-- LIENS :
--   - Spec : docs/wiki/matching-adresse.md §3 (pipeline) + §5.M-3/M-4
--   - Algo brh_client_360 : §8 de la spec

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. brh_normalize_adresse — pipeline complet exposé en RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.brh_normalize_adresse(
  p_adresse text
)
RETURNS TABLE (
  adresse_norm text,
  numero_norm text,
  voie_norm text
)
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_clean text;
  v_numero text;
  v_voie text;
BEGIN
  -- 1-2. Lower + unaccent
  v_clean := lower(public.f_unaccent(p_adresse));

  -- 3. Suppression CP+ville+pays embedded (pattern PPO 44)
  v_clean := regexp_replace(v_clean, '\s*\d{5}\s*[a-z][a-z\s\-]*\s*(france|fr)?\s*$', '', 'i');

  -- 4. Suppression suffixe pays seul
  v_clean := regexp_replace(v_clean, '\s*(france|fr)\s*$', '', 'i');

  -- 5. Apostrophes → espace (l'argoat → l argoat)
  v_clean := replace(v_clean, '''', ' ');

  -- 6. Ponctuation parasite (sauf tirets dans noms composés type saint-pierre)
  v_clean := regexp_replace(v_clean, '[,;:]+', ' ', 'g');

  -- 7a. Remplacer le point qui suit une lettre par un espace (av. → av_)
  --     Permet aux regex \m...\M de fonctionner sur les abréviations pointées
  v_clean := regexp_replace(v_clean, '([a-z])\.', '\1 ', 'g');

  -- 7b. Expansion abréviations voie (mot-à-mot, sensibles aux limites de mots)
  --     Ordre : plus longues abrévs d'abord pour éviter chevauchements
  v_clean := regexp_replace(v_clean, '\m(boul|bld|bd)\M', 'boulevard', 'g');
  v_clean := regexp_replace(v_clean, '\m(av)\M', 'avenue', 'g');
  v_clean := regexp_replace(v_clean, '\m(rte)\M', 'route', 'g');
  v_clean := regexp_replace(v_clean, '\m(pl)\M', 'place', 'g');
  v_clean := regexp_replace(v_clean, '\m(imp)\M', 'impasse', 'g');
  v_clean := regexp_replace(v_clean, '\m(chem|ch)\M', 'chemin', 'g');
  v_clean := regexp_replace(v_clean, '\m(all)\M', 'allee', 'g');
  v_clean := regexp_replace(v_clean, '\m(sq)\M', 'square', 'g');
  v_clean := regexp_replace(v_clean, '\m(lot)\M', 'lotissement', 'g');
  v_clean := regexp_replace(v_clean, '\m(lieu-?dit|lieudit)\M', 'lieu dit', 'g');
  -- "r" en dernier car risque de matcher dans des noms (ex. "le r" → "le rue")
  -- → ne remplacer que si suivi d'un nom de voie probable (espace + mot)
  v_clean := regexp_replace(v_clean, '\mr\s+(?=[a-z])', 'rue ', 'g');

  -- 8. Espaces multiples → 1 + trim final
  v_clean := trim(regexp_replace(v_clean, '\s+', ' ', 'g'));

  -- 9. Extraction numéro + voie
  v_numero := lower(substring(v_clean FROM '^(\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?)'));
  v_voie   := trim(regexp_replace(v_clean, '^\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?\s*', ''));

  -- Si pas de numéro, voie = adresse complète
  IF v_numero IS NULL OR v_numero = '' THEN
    v_numero := NULL;
    v_voie := v_clean;
  END IF;

  RETURN QUERY SELECT v_clean, v_numero, v_voie;
END;
$$;

COMMENT ON FUNCTION public.brh_normalize_adresse(text) IS
  'Pipeline canonique de normalisation adresse. Lower + unaccent + suppression CP/ville/pays embedded + expansion abréviations (r/av/bd/pl/imp/ch/all/rte/sq/lot) + extraction (numero, voie). Voir docs/wiki/matching-adresse.md §3.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. brh_match_dpe_by_address — trouve les DPE pour une adresse client
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.brh_match_dpe_by_address(
  p_adresse text,
  p_code_postal text
)
RETURNS TABLE (
  dpe_id bigint,
  numero_dpe text,
  adresse_dpe text,
  etiquette_dpe text,
  owner_name text,
  owner_siren text,
  owner_type text,
  match_kind text  -- 'exact_num_voie' | 'voie_only' | 'lieu_dit'
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_numero text;
  v_voie text;
BEGIN
  IF p_adresse IS NULL OR p_code_postal IS NULL THEN
    RETURN;
  END IF;

  -- Normaliser l'adresse d'entrée via la fonction canonique
  SELECT n.numero_norm, n.voie_norm INTO v_numero, v_voie
  FROM public.brh_normalize_adresse(p_adresse) n;

  -- Cas 1 : matching exact numéro + voie
  IF v_numero IS NOT NULL THEN
    RETURN QUERY
    SELECT d.id, d.numero_dpe, d.adresse, d.etiquette_dpe,
           d.owner_name, d.owner_siren, d.owner_type,
           'exact_num_voie'::text AS match_kind
    FROM public.brh_dpe_prospects d
    WHERE d.code_postal = p_code_postal
      AND d.numero_norm = v_numero
      AND d.voie_norm = v_voie;
  ELSE
    -- Cas 2 : lieu-dit (pas de numéro) → match sur voie seule
    RETURN QUERY
    SELECT d.id, d.numero_dpe, d.adresse, d.etiquette_dpe,
           d.owner_name, d.owner_siren, d.owner_type,
           'lieu_dit'::text AS match_kind
    FROM public.brh_dpe_prospects d
    WHERE d.code_postal = p_code_postal
      AND (d.numero_norm IS NULL OR d.numero_norm = '')
      AND d.voie_norm = v_voie;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.brh_match_dpe_by_address(text, text) IS
  'Retourne les DPE matchés pour une adresse + code postal. Applique brh_normalize_adresse pour l''entrée puis lookup indexé. 2 modes : exact (num+voie) ou lieu-dit (voie only).';

GRANT EXECUTE ON FUNCTION public.brh_normalize_adresse(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.brh_match_dpe_by_address(text, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Smoke tests
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_result record;
BEGIN
  -- Test normalize : abréviation + accents + CP embedded
  SELECT * INTO v_result FROM public.brh_normalize_adresse(
    '14 R De L''École 35720 Bonnemain France'
  );
  IF v_result.numero_norm <> '14' OR v_result.voie_norm <> 'rue de l ecole' THEN
    RAISE EXCEPTION 'brh_normalize_adresse test 1 failed: numero=% voie=%',
      v_result.numero_norm, v_result.voie_norm;
  END IF;

  -- Test normalize : avenue + bis
  SELECT * INTO v_result FROM public.brh_normalize_adresse('12 bis Av. de la République');
  IF v_result.numero_norm <> '12 bis' OR v_result.voie_norm <> 'avenue de la republique' THEN
    RAISE EXCEPTION 'brh_normalize_adresse test 2 failed: numero=% voie=%',
      v_result.numero_norm, v_result.voie_norm;
  END IF;

  -- Test normalize : lieu-dit (pas de num)
  SELECT * INTO v_result FROM public.brh_normalize_adresse('Kervennou');
  IF v_result.numero_norm IS NOT NULL OR v_result.voie_norm <> 'kervennou' THEN
    RAISE EXCEPTION 'brh_normalize_adresse test 3 failed: numero=% voie=%',
      v_result.numero_norm, v_result.voie_norm;
  END IF;

  RAISE NOTICE 'brh_normalize_adresse: 3 smoke tests OK';
END $$;
