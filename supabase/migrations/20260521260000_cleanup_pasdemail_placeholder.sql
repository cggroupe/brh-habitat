-- 2026-05-21 — Audit Philippe — Nettoyage emails factices @pasdemail
--
-- BUG DÉTECTÉ par Philippe sur fiche client "Charrier France" (29200 Brest) :
--   email = "797b0a173e5e4c242f7afc3daca0ca3a@pasdemail.fr"
--   = pattern hash MD5 généré par un précédent import legacy quand l'email
--   était obligatoire dans le CRM source. Polue la fiche client + induit
--   l'employé en erreur.
--
-- VOLUMÉTRIE :
--   - 1 926 emails @pasdemail.fr
--   - 20 emails @pasdemail.com
--   = 1 946 emails factices à NULLifier
--
-- ACTION : SET email = NULL pour tous les emails ressemblant à un
--          placeholder factice. La donnée brute reste dans le champ
--          `notes` si elle avait du sens (sinon perdue = ok car factice).

UPDATE public.brh_personnes_historique
SET email = NULL
WHERE email IS NOT NULL
  AND (
    email ILIKE '%@pasdemail.fr'
    OR email ILIKE '%@pasdemail.com'
    OR email ILIKE '%@noemail.fr'
    OR email ILIKE '%@noreply.%'
  );

-- Smoke test
DO $$
DECLARE
  v_remaining bigint;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public.brh_personnes_historique
  WHERE email ILIKE '%@pasdemail%' OR email ILIKE '%@noemail.fr' OR email ILIKE '%@noreply.%';
  RAISE NOTICE 'Emails factices restants : %', v_remaining;
END $$;
