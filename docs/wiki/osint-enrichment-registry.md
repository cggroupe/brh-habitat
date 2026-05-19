# OSINT Enrichment Registry — BRH (Pattern Karpathy)

> **Source de vérité unique** des campagnes d'enrichissement OSINT/IA appliquées aux 16 607 contacts de `brh_personnes_historique`. Mis à jour à CHAQUE run.
>
> But : éviter les doublons (relancer 2× la même source sur les mêmes contacts) + savoir ce qui manque pour planifier les futures campagnes.

**Table cible** : `public.brh_personnes_historique` (16 607 rows)
**Tiers de qualité** : `enrichment_tier ∈ {gold, silver, bronze, none}` (cf. migration `20260519100000_brh_personnes_enrichment_tier.sql`)

---

## Vue d'ensemble — Couverture par source au 2026-05-19

| Source | Outil | Champ | Checked | Hits utiles | Coût | Date | Statut |
|---|---|---|--:|--:|--:|---|---|
| **Google Search** | Apify b1 + b2 | `osint_other.apify_google` | 4 734 | 4 734 (100%) | ~12 € | 2026-05-18 | ✅ DONE |
| **LinkedIn URLs** | Apify (extraction) | `osint_linkedin` | — | 94 | (inclus) | 2026-05-18 | ✅ DONE |
| **Facebook URLs** | Apify (extraction) | `osint_facebook` | — | 667 | (inclus) | 2026-05-18 | ✅ DONE |
| **Profilage psy IA** | Claude Sonnet 4.6 run 1 | `psy_profile` | 914 | 914 (100%) | ~5 € | 2026-05-18 | ✅ DONE |
| **Profilage psy IA** | Claude Sonnet 4.6 run 2 | `psy_profile` | 2 500 (cible) | _en cours_ | ~13 € | 2026-05-19 | 🟡 RUNNING (PID 1761695) |
| **Email enum (Holehe)** | Holehe `--only-used` | `osint_other.holehe.used_on` | 3 500+/5000 | 96 | 0 € (free) | 2026-05-18→19 | 🟡 RUNNING |
| **Username scan (Maigret)** | Maigret v3 + filtre URL | `osint_other.maigret` | 500 | 200 | 0 € (free) | 2026-05-18 | ✅ DONE |
| **Username scan (Sherlock)** | Sherlock v2 + blacklist | `osint_sherlock` | 313 (stoppé) | **18 (13 personnes)** | 0 € | 2026-05-19 | ✅ STOPPÉ (faux+) |

**Budget OSINT** : 50 € autorisés · consommé : **~30 €** (Apify 12 + Claude 5 + Claude run 2 ~13)

---

## Distribution finale des tiers (cible commerciale)

| Tier | N | % | Score | Commentaire |
|---|--:|--:|---|---|
| 🥇 **gold** | 133 | 0.8 % | 10–15 | Fiche prête à appeler — CA + RDV + signal IA + LinkedIn/FB |
| 🥈 **silver** | 1 543 | 9.3 % | 6–9 | Exploitable — au moins 3 signaux dont 1 OSINT |
| 🥉 **bronze** | 3 848 | 23.2 % | 3–5 | Signal minimal (tél ou email + 1 source) |
| ⚪ **none** | 11 083 | 66.7 % | 0–2 | À enrichir lors des prochaines campagnes |

---

## Détail des campagnes (chronologique)

### C1 — Apify Google Search batch 1 (16 605 contacts ciblés à l'origine)
- **Date** : 2026-05-17
- **Script** : `/opt/stack/scripts/brh-osint-apify.py`
- **Cible** : top 1 500 par CA + RDV avec nom + ville
- **Critère SQL** : `ville IS NOT NULL AND full_name IS NOT NULL AND NOT (osint_other ? 'apify_google')`
- **Actor Apify** : `apify~google-search-scraper` (10 résultats × 1 page)
- **Coût** : ~3 €
- **Résultat** : ~955 enrichis (rematch inclus)
- **Stocké** : `osint_other.apify_google` (linkedin, facebook, instagram, twitter, pagesjaunes, immo_intentions[], societes[], web_hits[])

### C2 — Apify Google Search batch 2
- **Date** : 2026-05-18 après-midi
- **Script** : `/opt/stack/scripts/brh-osint-apify-batch2.py`
- **Cible** : `WHERE NOT (osint_other ? 'apify_google') AND (nb_rdv > 0 OR linked_dpe_id IS NOT NULL)` LIMIT 5000
- **Coût** : 8.89 €
- **Résultat** : 3 779 nouveaux enrichis
- **Note** : 8 050 contacts avec `full_name` cassé (calendar.google.com IDs) ont été corrigés AVANT via `brh-fix-rdv-names.py` (extraction depuis `staging.brh_rdv.titre`).

### C3 — Claude Sonnet 4.6 psy profile run 1
- **Date** : 2026-05-18 soir
- **Script** : `/opt/stack/scripts/brh-psy-profile-claude.py`
- **Cible** : 2 500 contacts ayant ≥ 1 signal (apify OR holehe OR sherlock OR (CA + RDV))
- **Coût** : 4.93 € (≈ $0.0054/profil)
- **Résultat** : 914 profils stockés dans `psy_profile`
- **Schema JSON** : `personality_traits[]`, `digital_footprint`, `communication_style`, `best_contact_channel`, `renovation_motivators[]`, `renovation_barriers[]`, `estimated_segment`, `approach_advice`, `confidence`

### C4 — Holehe email enumeration
- **Date** : 2026-05-18 fin journée → 2026-05-19 matin
- **Script** : `/opt/stack/scripts/brh-osint-enrich.py --tier with_email --limit 5000`
- **Cible** : 5 000 emails non encore checkés
- **Coût** : 0 €
- **Résultat (en cours)** : 96 emails avec comptes actifs / 3 500 checkés (taux 2.7 %)
- **Stocké** : `osint_other.holehe.used_on[]` (ex. ["twitter.com", "office365.com", "firefox.com"])

### C5 — Maigret v3 (top 500 acheteurs en ligne)
- **Date** : 2026-05-18 soir → 2026-05-19 fin de nuit
- **Script** : `/opt/stack/scripts/brh-osint-maigret.py` (3 155 sites, top 50 par run)
- **Cible** : 500 contacts avec email, par CA décroissant
- **Filtre faux positifs** : URL doit contenir le username complet OU une variante ≥ 5 chars (sinon écarté — règle « herve » sur github.com/herve = non)
- **Coût** : 0 €
- **Résultat** : 500 traités · 200 avec hits exploitables (40 %)
- **Stocké** : `osint_other.maigret` (n_hits, hits[], categories{e_commerce, voyage, abonnements_streaming, professionnel, forums_social, lifestyle_deco, tech_dev})

### C6 — Sherlock v2 (STOPPÉ)
- **Date** : 2026-05-19 nuit
- **Script** : `/opt/stack/scripts/brh-osint-sherlock.py`
- **Cible** : top 1 000 par CA avec prénom + nom
- **Problème détecté** : Sherlock liste de sites a un taux de faux positifs énorme pour B2C français (`threads`, `Linktree`, `BugCrowd`, `Pinterest`, `Polarsteps`, `Wikidot`, `omg.lol`, `Spotify`…) — chacun retourne 200 OK même quand le compte n'existe pas. 920 hits bruts post-purge sur les seuls 313 contacts traités.
- **Action** : **kill du job** (à 313/1000) + purge stricte (whitelist 22 sites OSINT B2C réellement fiables) → 18 hits réels sur 13 personnes.
- **Coût** : 0 €
- **Whitelist Sherlock** : GitHub, GitLab, Bitbucket, Twitter/X, Instagram, Facebook, LinkedIn, Reddit, Strava, Twitch, Behance, Dribbble, StackOverflow, Bluesky, About.me, Hackernews, Keybase, Steam, Letterboxd, Goodreads, last.fm, TradingView
- **Décision** : ne pas continuer Sherlock. Le ROI est nul vs Apify.

### C7 — Claude Sonnet 4.6 psy profile run 2 (en cours)
- **Date** : 2026-05-19 matin
- **Script** : `/opt/stack/scripts/brh-psy-profile-claude.py` (LIMIT 2500 par défaut)
- **Cible** : 2 500 contacts éligibles (apify OU holehe OU sherlock OU (CA+RDV)) ET `psy_profile IS NULL`
- **PID** : 1761695
- **Log** : `/tmp/brh-psy-2.log`
- **Coût attendu** : ~13–15 €
- **ETA** : ~30–60 min

---

## Comment savoir ce qui MANQUE par contact

Champs DB qui répondent à la question « quelle source a déjà été tentée ? » :

| Source | Présence indique « tenté » | Présence + non-vide indique « trouvé » |
|---|---|---|
| Apify Google | `osint_other ? 'apify_google'` | idem (toujours non-vide si tenté) |
| Holehe | `osint_other ? 'holehe'` (≠ NULL si email checké) | `jsonb_array_length(used_on) > 0` |
| Maigret | `osint_other ? 'maigret'` | `(osint_other->'maigret'->>'n_hits')::int > 0` |
| Sherlock | `osint_sherlock IS NOT NULL` (post-purge whitelist) | idem |
| Profilage IA | (pas de marqueur de tentative) | `psy_profile IS NOT NULL` |
| Apify Pappers | NON LANCÉ — 5 pros seulement, ROI nul | — |
| GHunt Gmail | NON LANCÉ — pending | — |

**Note** : pour Claude psy, on ne stocke pas explicitement les échecs. Stratégie : « si non-null = profilé », sinon il faut relancer (le script filtre `psy_profile IS NULL`).

---

## Plan de campagnes futures (proposition)

| Priorité | Campagne | Cible | Outil | Coût estimé | Pré-requis |
|---|---|---|---|---|---|
| P1 | Apify Google batch 3 | ~5 000 silver/bronze restants | Apify | ~15 € | Fin Holehe + run 2 Claude |
| P2 | Claude psy run 3 | nouveaux Apify b3 + Maigret v3 | Sonnet 4.6 | ~10 € | Apify b3 fait |
| P3 | GHunt sur @gmail.com | top 500 gold/silver | GHunt (free) | 0 € | API cookies Google |
| P4 | Reverse phone | 4 000 numéros mobiles | API tier (pages d'or, Truecaller) | 30–50 € | accord budget |
| P5 | DPE F/G cross-link | 11 083 « none » | Logic interne (cross fingerprint) | 0 € | algo dédié |
| P6 | Cadastre / mutations DVF | propriétaires connus | data.gouv.fr | 0 € | jointure adresse_ban |

---

## Référentiel scripts (`/opt/stack/scripts/`)

- `brh-import-personnes-v5.py` — import initial 16 607 contacts depuis entity-hub
- `brh-fix-rdv-names.py` — correctif noms depuis `staging.brh_rdv.titre` (8 050 fixés)
- `brh-osint-apify.py` / `brh-osint-apify-batch2.py` / `brh-osint-apify-rematch.py`
- `brh-osint-enrich.py` (Holehe + DDG/Searx + Apify LinkedIn optionnel)
- `brh-osint-maigret.py` (v3 avec filtre URL faux positifs)
- `brh-osint-sherlock.py` (v2 avec whitelist 22 sites) — **gardé pour mémoire mais non utilisé**
- `brh-psy-profile-claude.py` (LIMIT par défaut 2500)

---

## Liens

- Migration `enrichment_tier` : [`20260519100000_brh_personnes_enrichment_tier.sql`](../supabase/migrations/20260519100000_brh_personnes_enrichment_tier.sql)
- RPC v5 : [`20260519110000_rpc_brh_personnes_search_v5.sql`](../supabase/migrations/20260519110000_rpc_brh_personnes_search_v5.sql)
- UI : [`src/components/leads/ClientsBrhView.tsx`](../../src/components/leads/ClientsBrhView.tsx)
- Export CSV QA : `exports/brh-leads-enrichis-2026-05-19.csv` (1 680 leads gold+silver)
- Log Karpathy : [`log.md`](log.md)

---

**Dernière maj** : 2026-05-19 05:25 — Claude Opus 4.7 (1M ctx)
