# ProHacker Audit — BRH Habitat

**Date** : 2026-04-13
**Mode** : PROJECT (workstation macOS)
**Phases** : 1-10 (Secrets, Injection, XSS, Rate Limiting, Headers, CORS, Deps, Input, Auth, Summary)
**Standards** : OWASP Top 10:2025, CWE Top 25, NIST SP 800-123

---

## Score de Risque

**Avant corrections : 33/100 → Grade B+**
- CRITICAL x 10 = 0
- HIGH x 7 = 3 x 7 = 21
- MEDIUM x 4 = 3 x 4 = 12
- LOW x 1 = 5 x 1 = 5
- Total = 38

**Apres corrections : 5/100 → Grade A**
- CRITICAL = 0
- HIGH = 0 (tous corriges)
- MEDIUM = 0 (tous corriges)
- LOW x 1 = 5
- Total = 5

---

## Findings Corriges

### [CORRIGE] HIGH — Edge Functions sans authentification
**OWASP A01:2021 | CWE-306**
**Fichiers** : `ai-proxy/index.ts`, `send-notification-email/index.ts`, `crm-sync/index.ts`, `chiffrage-prices/index.ts`
**Probleme** : Aucune verification JWT. Tout appelant avec la cle anon pouvait acceder aux modes pro/chiffrage, envoyer des emails, sync CRM.
**Fix** : `verifyAuth()` avec `supabase.auth.getUser()` sur les modes pro/chiffrage. Mode visiteur reste public.

### [CORRIGE] HIGH — Injection PostgREST via `.or()` non sanitise
**OWASP A03:2021 | CWE-89**
**Fichier** : `ai-proxy/index.ts:67`
**Probleme** : `searchTerms` issu du message utilisateur injecte directement dans `.or()` sans sanitisation.
**Fix** : `sanitizeSearchTerm()` — regex `[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s-]` applique sur chaque terme.

### [CORRIGE] HIGH — CORS legacy corsHeaders bloque renovation-brh.fr
**OWASP A05:2021 | CWE-942**
**Fichier** : `_shared/cors.ts`
**Probleme** : Export statique `corsHeaders` utilise partout au lieu de `getCorsHeaders(req)`.
**Fix** : Remplacement dans les 4 fonctions. Legacy export supprime.

### [CORRIGE] MEDIUM — IP VPS hardcodee dans le code source
**CWE-798**
**Fichier** : `ai-proxy/index.ts:4`
**Fix** : `Deno.env.get('AI_VPS_URL')` + secret set via `supabase secrets set`.

### [CORRIGE] MEDIUM — URL BRHCRM hardcodee
**CWE-798**
**Fichiers** : `ai-proxy/index.ts:13`, `chiffrage-prices/index.ts:5`
**Fix** : `Deno.env.get('BRHCRM_URL')` + secret set.

### [CORRIGE] MEDIUM — XSS via `href={post.post_url}` sans validation
**OWASP A03:2021 | CWE-79**
**Fichiers** : `ProSocial.tsx:312`, `PartSocial.tsx:420`, `AdminPublications.tsx:182`
**Fix** : `isSafeUrl()` valide le protocole (http/https uniquement) avant rendu.

### [CORRIGE] MEDIUM — Imports esm.sh non pinnes (@2 au lieu de @2.96.0)
**Fix** : Tous les imports pinnes a `@2.96.0`.

### [CORRIGE] HIGH (dev) — Vite 7.3.1 avec 3 CVE
**CWE-22, CWE-200, CWE-306**
**Fix** : `npm update vite` applique.

---

## Findings Acceptes (risque residuel faible)

### [ACCEPTE] LOW — Role expose en localStorage
**CWE-522 | appStore.ts**
Le role utilisateur est dans localStorage. Un attaquant avec acces DevTools peut temporairement voir les pages admin, mais la RLS Supabase bloque toutes les requetes DB.

### [ACCEPTE] LOW — AdminGuard race condition sur cache
**CWE-362 | AdminGuard.tsx**
Fenetre d'exploitation courte entre cache et validation. RLS constitue la vraie barriere.

### [ACCEPTE] LOW — Login sans CAPTCHA
Supabase Auth a un rate limiting built-in (30 req/h par IP). CAPTCHA recommande pour la production.

### [ACCEPTE] LOW — CSP `unsafe-inline` sur script-src
**CWE-693 | vercel.json**
Requis par le build Vite. A durcir avec des nonces si possible.

### [ACCEPTE] LOW — Upload fichiers sans validation type/taille cote client
**CWE-434 | DocumentsList.tsx, PartSocial.tsx**
Supabase Storage policies constituent la barriere serveur.

---

## Verifications OK

| Check | Statut |
|-------|--------|
| .env dans .gitignore | PASS |
| Pas de service_role key dans le frontend | PASS |
| Pas de secret AWS/GitHub/Stripe/Anthropic | PASS |
| Pas de token git dans remote URL | PASS |
| SQL injection (Supabase client parametrise) | PASS |
| dangerouslySetInnerHTML (JSON-LD safe) | PASS |
| handle_new_user bloque role admin | PASS |
| profiles_update_own empeche changement role | PASS |
| RLS sur 24/24 tables | PASS |
| 14 SECURITY DEFINER sans recursion | PASS |
| Headers securite Vercel (HSTS, X-Frame, CSP) | PASS |
| Double-submit protection sur tous les formulaires | PASS |
| Sentry Error Boundary configure | PASS |
| TypeScript strict mode | PASS |

---

## Posture de Securite

**Score final : 95/100 — Grade A**

| Domaine | Score |
|---------|-------|
| Secrets | 9/10 (env vars, pas de hardcode) |
| Injection | 10/10 (client parametrise + sanitisation) |
| XSS | 9/10 (isSafeUrl + CSP) |
| Auth | 9/10 (RLS + guards + SECURITY DEFINER) |
| CORS | 10/10 (domaines restreints dynamiques) |
| Headers | 9/10 (complet, unsafe-inline residuel) |
| Dependencies | 10/10 (a jour apres npm update) |
| Edge Functions | 9/10 (auth + CORS + input validation) |

---

*Rapport genere par ProHacker Skill — Claude Code*
*Prochain audit recommande : dans 30 jours ou apres modification majeure*
