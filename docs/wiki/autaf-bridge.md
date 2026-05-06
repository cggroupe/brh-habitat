# Bridge AUTAF API — Spec & implémentation (Phase 18.8)

> **Status** : 🟡 V1 livré 2026-05-06 — configuration manuelle. V1.5 OAuth flow en attente API Genesii.
>
> Voir aussi : [reseau-social-blueprint.md](reseau-social-blueprint.md) · [reseau-social-status.md](reseau-social-status.md) · [log.md](log.md#2026-05-06--phase-18-étape-8--bridge-autaf-api).

---

## 1. Décision structurante (06/05/2026)

**AUTAF (WorkRepublic) reste autonome sur WordPress OVH.** Pas de migration vers React/Supabase BRH. À la place : **bridge API** optionnel qui enrichit BRH des données AUTAF du user :

- ✅ V1 livré — Recommandations AUTAF read-only affichées sur profil pro BRH
- ⏸ V1.5 — Cross-post BRH → AUTAF (publications, chantiers)
- ⏸ V2 — Webhook AUTAF → BRH (synchro endorsements bilatéraux)

---

## 2. Architecture

```
┌──────────────────────┐                    ┌────────────────────────────┐
│  BRH Habitat         │                    │  AUTAF (WorkRepublic)      │
│  React/Supabase      │                    │  WordPress OVH             │
│                      │                    │  IP 91.134.134.73          │
│  /reseau/parametres  │                    │                            │
│  /autaf              │                    │  plugin autaf-core         │
│                      │   1. Configure     │  endpoints autaf/v1/*      │
│  brh_autaf_link      │ ─────────────────► │                            │
│  (token chiffré V2)  │                    │                            │
│                      │   2. Fetch recos   │                            │
│  EF autaf-           │ ─────────────────► │  GET /recommendations/:id  │
│  recommendations-    │ ◄───────────────── │  Bearer <user_token>       │
│  fetch (Deno)        │                    │                            │
│                      │                    │                            │
│  AutafRecommendation │                    │                            │
│  s.tsx               │                    │                            │
│  (read-only display) │                    │                            │
└──────────────────────┘                    └────────────────────────────┘
```

---

## 3. Schéma DB (déjà migré Phase 18.1)

Table `brh_autaf_link` :

```sql
CREATE TABLE brh_autaf_link (
  id UUID PK,
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES brh_partner_contracts(id),
  autaf_user_id TEXT UNIQUE NOT NULL,
  autaf_username TEXT,
  oauth_access_token_encrypted TEXT NOT NULL,  -- token API AUTAF (chiffré AES-GCM en V2)
  oauth_refresh_token_encrypted TEXT,
  oauth_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',         -- read_recommendations, write_posts, ...
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  ...
);
```

RLS : owner only (`profile_id = auth.uid()`) + admin.

---

## 4. Spec endpoints API AUTAF (à implémenter côté Genesii)

### 4.1 V1 livré — `GET /wp-json/autaf/v1/recommendations/:user_id`

**Action côté Genesii** : exposer cet endpoint.

```
GET https://www.autaf.fr/wp-json/autaf/v1/recommendations/:user_id
Authorization: Bearer <personal_access_token>
Accept: application/json

Response 200:
[
  {
    "id": "rec_abc123",
    "metier": "couverture",         // ou null
    "body": "Très bon travail...",  // ou null
    "author_name": "Jean Dupont",   // pseudo ou nom de l'auteur AUTAF
    "created_at": "2026-04-15T14:32:00Z"
  },
  ...
]

Response 401: { "error": "invalid_token" }
Response 404: { "error": "user_not_found" }
Response 429: { "error": "rate_limited" }
```

**Rate limit recommandé** : 60 req/min/token.

### 4.2 V1.5 — `POST /wp-json/autaf/v1/posts` (cross-post BRH → AUTAF)

```
POST https://www.autaf.fr/wp-json/autaf/v1/posts
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "content": "Texte du post BRH",
  "media_urls": ["https://...public.jpg"],
  "tags": ["couverture", "zinguerie"],
  "source": { "platform": "brh", "post_id": "uuid-brh" }
}

Response 201:
{
  "autaf_post_id": "post_xyz789",
  "url": "https://www.autaf.fr/post/xyz789"
}
```

### 4.3 V1.5 — `POST /wp-json/autaf/v1/chantiers` (cross-post chantier)

Idem `/posts` avec champs spécifiques (titre, métiers cherchés, ville, budget).

### 4.4 V2 — OAuth flow `autaf/v1/oauth/*`

Remplace la saisie manuelle de token par un flow OAuth 2.0 standard :

- `GET /autaf/v1/oauth/authorize?client_id=brh&redirect_uri=...&scope=read_recommendations&state=...`
- `POST /autaf/v1/oauth/token` (échange code → access_token + refresh_token)

---

## 5. Côté BRH — implémentation V1

### Fichiers (Phase 18.8)

- `src/api/reseau-autaf.ts` — CRUD `brh_autaf_link` + appel EF recommendations-fetch
- `src/hooks/queries/reseau-autaf.ts` — 5 hooks Tanstack
- `src/components/reseau/AutafRecommendations.tsx` — affichage read-only avec fallback gracieux
- `src/pages/reseau/ReseauParamsAutaf.tsx` — page config bridge (V1 saisie manuelle token)
- `supabase/functions/autaf-recommendations-fetch/index.ts` — EF Deno (auth + fetch AUTAF + last_error tracking)

### Workflow V1

1. User va sur `/reseau/parametres/autaf`
2. User saisit son **autaf_user_id** + **token API AUTAF** + scopes
3. Bridge stocké dans `brh_autaf_link` (1:1 par profile_id)
4. Sur les profils pro `/reseau/profil/:slug` (V1.5), si le pro a un bridge actif → composant `AutafRecommendations` fait fetch via EF → affiche les recos

### Fallback gracieux

L'EF retourne **toujours HTTP 200** avec `available: false` + `error: '...'` si :
- Bridge non configuré côté user requesting (`bridge_inactive`)
- Scope manquant (`scope_missing`)
- API AUTAF down (`autaf_unavailable`)
- Token AUTAF rejeté (`autaf_http_401`)

→ L'UI affiche un message "Recommandations AUTAF indisponibles" sans casser l'expérience.

---

## 6. Sécurité

- Token AUTAF **stocké en clair V1** dans `oauth_access_token_encrypted` (le champ s'appelle `_encrypted` par anticipation)
- **V2 obligatoire** : chiffrement AES-GCM via pgcrypto (clef rotation 90j)
- RLS empêche les autres users de lire le token (owner only via `profile_id = auth.uid()`)
- Service role utilisé côté EF pour lire le token sans bypass RLS
- Rate limit EF : 60 req/min/IP
- Timeout fetch AUTAF : 8s (évite les EF gelées)
- `last_error` tracké pour debug + UI feedback

---

## 7. Roadmap

| Étape | Status | Détail |
|---|---|---|
| 18.8.1 — Config manuelle V1 | ✅ DONE 2026-05-06 | Saisie token API + EF recos fetch |
| 18.8.2 — Cross-post posts | ⏸ V1.5 | EF `autaf-cross-post` + bouton dans PostComposer |
| 18.8.3 — Cross-post chantiers | ⏸ V1.5 | EF `autaf-cross-chantier` + checkbox dans ChantierForm |
| 18.8.4 — OAuth flow | ⏸ V2 | EF `autaf-oauth-callback` + page `/autaf/oauth/return` |
| 18.8.5 — Webhook AUTAF → BRH | ⏸ V2 | EF `autaf-webhook` (endorsements bilatéraux, suppressions) |
| 18.8.6 — Chiffrement token AES-GCM | ⏸ V2 | pgcrypto + clef rotation Vault |

---

## 8. Action requise — dev Genesii

**Email à envoyer dès J-0** :

> Bonjour Genesii,
>
> Dans le cadre de la Phase 18 BRH Habitat (réseau social pro), nous souhaitons
> connecter les comptes utilisateurs AUTAF aux profils pros BRH via votre API
> `autaf/v1`. Voici les endpoints attendus côté AUTAF (priorité V1) :
>
> 1. **`GET /wp-json/autaf/v1/recommendations/:user_id`** (lecture des
>    recommandations reçues par un user AUTAF) — Bearer auth, retourne JSON array
>    `{ id, metier, body, author_name, created_at }`. Rate limit 60/min/token.
>
> 2. À court terme V1.5 : `POST /wp-json/autaf/v1/posts` et
>    `POST /wp-json/autaf/v1/chantiers` (cross-post depuis BRH). Spec dans
>    `docs/wiki/autaf-bridge.md`.
>
> Pouvez-vous me confirmer la dispo de l'endpoint #1 avant le {date+5j} ?
> Je peux fournir un exemple de response JSON pour validation.
>
> Pour V2 nous viserons un OAuth flow standard (`/oauth/authorize`,
> `/oauth/token`).
>
> Merci !

---

## Refs

- Plan source : `/root/.claude/plans/c-elle-qui-te-semble-wiggly-sundae.md`
- Mémoire : `brh-reseau-social-phase18-2026-05-06.md`
- Migration table : `supabase/migrations/20260706300000_brh_phase_18_1_reseau.sql` (table `brh_autaf_link`)
- EF reference : `supabase/functions/fetch-fx-rate/index.ts` (pattern fetch + cache)
