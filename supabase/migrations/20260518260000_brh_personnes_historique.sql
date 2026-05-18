-- 2026-05-18 — Table brh_personnes_historique : tous les contacts BRH historiques.
--
-- Contexte : les 14 122 candidats entity-hub (staging.brh_clients_v2 + brh_clients
-- + brh_prospects + brh_rdv) — la plupart n'ont pas de DPE F/G correspondant dans
-- brh_dpe_prospects (clients commerciaux acquis ailleurs). Mais ils ont du
-- téléphone/email/CA/adresse exploitables pour Pierre Collard et l'équipe BRH.
--
-- Approche : table d'archive indépendante des leads DPE. Lien optionnel
-- vers brh_dpe_prospects via linked_dpe_id (NULL si pas de match).

CREATE TABLE IF NOT EXISTS public.brh_personnes_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL UNIQUE,
  -- Identité
  nom text,
  prenom text,
  full_name text,
  societe text,
  is_pro boolean DEFAULT false,
  -- Contact (depuis staging direct, pas via core.contact)
  telephone text,
  telephone_secondaire text,
  email text,
  -- Adresse
  adresse text,
  code_postal text,
  ville text,
  -- Historique commercial (brh_clients_v2 enrichi)
  ca_total_eur integer,
  premiere_facture date,
  derniere_facture date,
  nb_rdv smallint DEFAULT 0,
  -- Famille (brh_clients_v2)
  enfants text,
  -- Métadonnées
  statut text,
  categorie text,
  source_primaire text NOT NULL CHECK (source_primaire IN
    ('brh_clients_v2', 'brh_clients', 'brh_prospects', 'brh_rdv', 'osint')),
  sources_secondaires text[] DEFAULT '{}',
  -- Lien optionnel vers un DPE prospect
  linked_dpe_id integer REFERENCES public.brh_dpe_prospects(id) ON DELETE SET NULL,
  link_confidence numeric(3,2),
  -- Enrichissement OSINT
  osint_linkedin text,
  osint_facebook text,
  osint_other jsonb DEFAULT '{}'::jsonb,
  -- Dates
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brh_personnes_cp ON public.brh_personnes_historique (code_postal);
CREATE INDEX IF NOT EXISTS idx_brh_personnes_ville ON public.brh_personnes_historique (lower(ville));
CREATE INDEX IF NOT EXISTS idx_brh_personnes_dpe ON public.brh_personnes_historique (linked_dpe_id) WHERE linked_dpe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brh_personnes_statut ON public.brh_personnes_historique (statut) WHERE statut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brh_personnes_fullname_trgm ON public.brh_personnes_historique USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_brh_personnes_societe_trgm ON public.brh_personnes_historique USING gin (societe gin_trgm_ops);

ALTER TABLE public.brh_personnes_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personnes_select_authenticated" ON public.brh_personnes_historique
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.brh_personnes_historique
  IS '2026-05-18 — Archive des 14k+ contacts BRH historiques (clients/prospects/RDV). Lien optionnel vers brh_dpe_prospects.';
