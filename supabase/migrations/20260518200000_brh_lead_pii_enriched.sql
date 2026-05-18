-- 2026-05-18 — Table d'enrichissement PII pour les particuliers BRH.
--
-- Contexte : Philippe a constaté qu'aucun particulier n'a de nom/téléphone/email
-- visible dans la liste leads (employé BRH). En effet `brh_dpe_prospects.owner_name`
-- est NULL pour les 26 481 particuliers (seuls les 32 825 SCI ont un owner_name).
--
-- Les vrais enrichissements sont dans entity-hub `staging.brh_clients_v2` (995
-- clients avec téléphone+email+CA+enfants — 5,7 M€ CA cumulé) et `staging.brh_clients`
-- (5 487 clients basiques). Ces sources sont hors-Supabase.
--
-- Pipeline : un script Python (cf scripts/brh-import-pii.py) lit entity-hub,
-- fuzzy-match l'adresse (adresse_ban + commune + CP), et upsert ici.
-- Le RPC `brh_foncier_prospects_unified` v4 LEFT JOIN cette table.

CREATE TABLE IF NOT EXISTS public.brh_lead_pii_enriched (
  dpe_id integer PRIMARY KEY REFERENCES public.brh_dpe_prospects(id) ON DELETE CASCADE,
  full_name text,
  first_name text,
  last_name text,
  telephone text,
  email text,
  ca_total_eur integer,
  premiere_facture date,
  derniere_facture date,
  source text NOT NULL CHECK (source IN ('brh_clients_v2', 'brh_clients', 'brh_prospects', 'manual')),
  match_confidence numeric(3,2) CHECK (match_confidence BETWEEN 0 AND 1),
  matched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brh_lead_pii_full_name
  ON public.brh_lead_pii_enriched USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_brh_lead_pii_source
  ON public.brh_lead_pii_enriched (source);

ALTER TABLE public.brh_lead_pii_enriched ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée pour authenticated (le RPC filtre côté UI via lead-visibility.ts).
CREATE POLICY "pii_select_authenticated" ON public.brh_lead_pii_enriched
  FOR SELECT USING (auth.role() = 'authenticated');

-- Pas de RLS d'écriture : seul le service_role (script d'import) écrit ici.

COMMENT ON TABLE public.brh_lead_pii_enriched
  IS '2026-05-18 — PII enrichies des particuliers BRH (depuis entity-hub staging.brh_clients_v2/clients). Match par adresse_ban fuzzy.';
