# Tests E2E (Playwright) — Phase 19

Smoke tests qui démarrent l'app via `npm run dev` et naviguent dans un Chromium réel.

## Lancer

```bash
# Premier run : installer Chromium
npx playwright install chromium

# Run smoke (lance le dev server automatiquement sur :5173)
npm run test:e2e

# Mode UI interactif (debug)
npm run test:e2e:ui

# Cibler un environnement déjà en route
E2E_BASE_URL=https://staging.renovation-brh.fr npm run test:e2e
```

## Périmètre actuel

3 tests dans `smoke.spec.ts` :
1. Page d'accueil publique charge sans erreur console bloquante
2. Page `/login` expose un champ email
3. `/admin` redirige les visiteurs non-authentifiés (guard fonctionnel)

## Pourquoi pas plus ?

Les flows authentifiés (login Clerk → dashboard, création prospect, signature
devis) demandent des comptes test stables et des fixtures Supabase. Voir la
roadmap complète dans [docs/wiki/tests.md](../docs/wiki/tests.md) (Phase 6 — E2E).

Les 3 smoke tests détectent déjà les régressions les plus visibles : build
cassé, route 404, guard désactivé par erreur.
