-- 2026-05-18 — Favoris polymorphes pour le graph navigable BRH
--
-- Étend l'ancienne table brh_agence_favoris_parcelles (spécifique aux parcelles)
-- pour supporter les 3 types d'entités drill-down : adresse / entreprise / personne.
--
-- Pattern : table polymorphe (entity_type, entity_id_text) + UNIQUE par profile/entity.

CREATE TABLE IF NOT EXISTS public.brh_favoris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agence_id uuid REFERENCES public.brh_agences_immo(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('adresse', 'entreprise', 'personne', 'parcelle')),
  entity_id text NOT NULL,
  -- Snapshot pour affichage rapide (évite un re-fetch RPC pour les chips)
  label text NOT NULL,
  sublabel text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  priority text NOT NULL DEFAULT 'normale' CHECK (priority IN ('urgente', 'haute', 'normale', 'basse')),
  status text NOT NULL DEFAULT 'a_etudier' CHECK (status IN ('a_etudier', 'en_cours', 'rdv_pris', 'gagne', 'perdu', 'archive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_brh_favoris_profile ON public.brh_favoris (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brh_favoris_agence ON public.brh_favoris (agence_id, created_at DESC) WHERE agence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brh_favoris_entity ON public.brh_favoris (entity_type, entity_id);

ALTER TABLE public.brh_favoris ENABLE ROW LEVEL SECURITY;

-- Policies : un user voit/écrit ses propres favoris uniquement
CREATE POLICY "favoris_select_own" ON public.brh_favoris
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "favoris_insert_own" ON public.brh_favoris
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "favoris_update_own" ON public.brh_favoris
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "favoris_delete_own" ON public.brh_favoris
  FOR DELETE USING (profile_id = auth.uid());

-- Helper : toggle favoris (insert si absent, delete si présent → renvoie le nouvel état)
CREATE OR REPLACE FUNCTION public.brh_favoris_toggle(
  p_entity_type text,
  p_entity_id text,
  p_label text,
  p_sublabel text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_existing_id uuid;
  v_is_favorite boolean;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.brh_favoris
  WHERE profile_id = auth.uid()
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM public.brh_favoris WHERE id = v_existing_id;
    RETURN false;
  ELSE
    INSERT INTO public.brh_favoris (profile_id, entity_type, entity_id, label, sublabel)
    VALUES (auth.uid(), p_entity_type, p_entity_id, p_label, p_sublabel);
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_favoris_toggle(text, text, text, text) TO authenticated;

COMMENT ON TABLE public.brh_favoris IS '2026-05-18 — Favoris polymorphes par utilisateur (4 types : adresse/entreprise/personne/parcelle).';
COMMENT ON FUNCTION public.brh_favoris_toggle IS '2026-05-18 — Toggle on/off un favori. Retourne true si ajouté, false si retiré.';
