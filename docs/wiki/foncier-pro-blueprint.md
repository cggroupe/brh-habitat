# Foncier Pro Agence `/agence/foncier/*` — Blueprint architecture (Phase 19)

> **Status** : 📐 Blueprint cadré 2026-05-06 (Phase 19 Sprint A en cours).
>
> Voir aussi : [foncier-pro-status.md](foncier-pro-status.md) (statut livraison) · [log.md](log.md) · [score-vente-agences.md](score-vente-agences.md) (Phase 16 déjà livrée).

---

## 1. Vision & objectif

Module **Foncier Pro** intégré au portail agence (`/agence/foncier/*`) qui récupère 80 % des features de **Quelfoncier — Foncier Facile Plus** + ajoute des différenciateurs IA inédits sur le marché. Cible V1 : agences immo bretonnes prospects pour vendre des biens à fort potentiel rénovation et apporter des leads BRH chauds.

**Contexte stratégique** :
- 0 agence cliente actuellement, prospection lancée dans quelques semaines
- Phase 18 réseau social mise en pause (à retravailler plus tard)
- Score Vente Agences (Phase 16) déjà en place — Foncier Pro l'enrichit
- Phases 11.x (89 sources data Bretagne) déjà cadrées en partie

**Périmètre V1** : **Bretagne uniquement** (depts 22 / 29 / 35 / 56 / 44).

**Tarification V1** : skip — mode dev pur, monétisation V2 post-validation produit.

---

## 2. 12 features Foncier Facile Plus livrées en V1

| # | Feature | Sprint | Source data |
|---|---|---|---|
| 1 | Enregistrer/favoris parcelles | A | Supabase |
| 2 | Carte cadastre + recherche parcelle | A | api-carto IGN parcelles_express |
| 3 | **Résumé PLUi via IA** | D | GPU geoportail-urbanisme.gouv.fr + Claude Sonnet |
| 4 | Recherche filtre SCI | B | DGFIP locaux PM 2024 (32k déjà en DB) |
| 5 | Croisement âge dirigeants SCI | B | recherche-entreprises.api.gouv.fr (DataInfogreffe) |
| 6 | Croisement décès INSEE → succession | B | fichier-deces.api.gouv.fr |
| 7 | DVF + **archive long-terme** | C | data.gouv DVF + Supabase Storage |
| 8 | **Croisement satellite/aérien Vision IA** | D | IGN BD ORTHO 5m + Claude Sonnet vision |
| 9 | Markers DPE colorés A-G | F | DPE existant + Leaflet divIcon |
| 10 | Tertiaire + BODACC ventes urgentes | E | bodacc.api.gouv.fr (étend `prospection-immat`) |
| 11 | Permis de construire + validité | E | Sit@del2 (mensuel) |
| 12 | Sociodémo quartier (loyers, CSP, gentrification, élus, élections) | C | Filosofi + CLAMEUR + Recensement + DV3F + RNE élus |

---

## 3. 8 décisions stratégiques actées (06/05/2026)

| # | Sujet | Décision Philippe |
|---|---|---|
| 1 | Scope V1 | TOUS les 12 features, pas de phasing partiel |
| 2 | Tarification | Skip — mode dev |
| 3 | PLU IA | Claude Sonnet 4.6 |
| 4 | DPIA RGPD | OK avocat. SCI = personnes morales (pas physiques) |
| 5 | Pappers payant | NON — combiner gratuites (INPI + recherche-entreprises + Sirene + Infogreffe) |
| 6 | Archive DVF | Supabase Storage |
| 7 | Géo V1 | Bretagne uniquement (22/29/35/56/44) |
| 8 | Priorité business | TOUT en bloc, pas de tri |

---

## 4. Architecture cible

### Routes nouvelles `/agence/foncier/*` (5 pages)

```
/agence (existant — 14 entrées sidebar)
└─ NEW : section "Foncier Pro"
    ├─ /agence/foncier/carte         — Carte cadastre + DPE pings + filtres SCI/BODACC (Sprint A+F)
    ├─ /agence/foncier/parcelle/:idu — Détail parcelle (DVF + PLU IA + satellite + permis + sociodémo)
    ├─ /agence/foncier/sci           — Filtre SCI + âge + décès (Sprint B)
    ├─ /agence/foncier/tertiaire     — BODACC alerts (Sprint E)
    └─ /agence/foncier/favoris       — Mes parcelles (Sprint A)
```

### 8 nouvelles tables Supabase

| Table | Rôle | Sprint |
|---|---|---|
| `brh_parcelles_cache` | Cache GeoJSON api-carto IGN (90j TTL) | A |
| `brh_agence_favoris_parcelles` | Favoris agence (parcelle_idu + tags + notes) | A |
| `brh_sci_dirigeants` | Date naissance + flag décès × 32k SCI DGFIP | B |
| `brh_dvf_archive` | Snapshot historique DVF (anti-suppression 4-5 ans) | C |
| `brh_loyers_communes` | Carte des loyers CLAMEUR + INSEE | C |
| `brh_plu_summaries` | Cache résumé IA PDF PLUi par commune/zone | D |
| `brh_satellite_analyses` | Cache Vision IA crop aérien → toiture/orientation | D |
| `brh_bodacc_alerts` | Étendu vs `prospection-immat` (ventes + liquidations + procédures collectives) | E |

### Edge Functions Deno (4 nouvelles)

| EF | Rôle | Sprint |
|---|---|---|
| `cadastre-fetch` | Proxy api-carto IGN parcelles_express + cache 90j | A |
| `plu-summarize-ai` | Download GPU PDF + Claude Sonnet résumé + cache Storage | D |
| `satellite-vision-ai` | Crop BD ORTHO 5m + Claude Sonnet vision toiture/orientation | D |
| `bodacc-scan-tertiaire` | Étend pipeline `prospection-immat` aux ventes/liquidations/PC | E |

### Patterns techniques (réutilisés — non-négociables)

| Pattern | Réf existante |
|---|---|
| Guard React Query | [src/components/auth/AgenceGuard.tsx](../../src/components/auth/AgenceGuard.tsx) |
| Shell layout | [src/components/layout/AgenceShell.tsx](../../src/components/layout/AgenceShell.tsx) |
| API ↔ Hooks miroir | [src/api/agences-immo.ts](../../src/api/agences-immo.ts) ↔ [src/hooks/queries/agences-immo.ts](../../src/hooks/queries/agences-immo.ts) |
| RLS + helpers SECURITY DEFINER | [supabase/migrations/20260706200000_brh_artisan_phase_17_1.sql](../../supabase/migrations/20260706200000_brh_artisan_phase_17_1.sql) |
| Storage signed URL | [src/api/audits.ts](../../src/api/audits.ts) |
| Realtime channels | [src/hooks/useNotifications.ts](../../src/hooks/useNotifications.ts) |
| Multi-tenant | [src/lib/tenant-region.ts](../../src/lib/tenant-region.ts) |
| Carte Leaflet | [src/pages/pro/ProTerrain.tsx](../../src/pages/pro/ProTerrain.tsx) ; [src/pages/pro/ProProspectsCarte.tsx](../../src/pages/pro/ProProspectsCarte.tsx) |
| EF Deno + cors + rate limit | [supabase/functions/fetch-fx-rate/index.ts](../../supabase/functions/fetch-fx-rate/index.ts) |
| Cache générique brh_ext | [supabase/functions/_shared/](../../supabase/functions/_shared/) |

---

## 5. 6 sprints de livraison (séquencement par dépendance)

| # | Sprint | Contenu | Effort | Dépend |
|---|---|---|---|---|
| **A** | Foundation | Cadastre IGN + carte agence + favoris | 5-7 j | — |
| **B** | SCI enrichi | INPI + âge dirigeants + décès INSEE + filtres | 8-10 j | A |
| **C** | DVF + sociodémo | Archive Storage + loyers + élections + élus + gentrification | 6-8 j | A |
| **D** | IA killer | PLU PDF Claude + Vision IA toiture | 12-15 j | A |
| **E** | BODACC + permis | Tertiaire étendu + Sit@del2 mensuel | 6-8 j | A |
| **F** | UX intégrée | Markers DPE colorés A-G + page détail parcelle + sidebar | 5-7 j | A-E |

**Total estimé** : 42-55 jours dev compressés.

---

## 6. Différenciateurs vs Quelfoncier (Foncier Facile Plus)

| Domaine | Quelfoncier | BRH Foncier Pro |
|---|---|---|
| **Résumé PLUi** | Manuel (rédigé à la main) | **IA Claude Sonnet 4.6** auto en 30s |
| **Type toiture** | Manuel ou pas du tout | **Vision IA Claude** sur crop aérien IGN BD ORTHO |
| **Score Vente** | Aucun scoring | **Phase 16 Score Vente Agences** : 13 règles + futur ML XGBoost T+12 |
| **DPE croisé** | DPE simple | **DPE + score v2** (89 sources data Bretagne) |
| **Aides MPR par parcelle** | Non | **Cumul ANIL EPCI + MPR auto Filosofi décile** |
| **Bretagne ancrage** | National générique | **TerriSTORY + DPE Rennes Métropole + Datarmor + LiDAR HD 100% mai 2026** |
| **Anti-piège DVF** | Suppression 4-5 ans subie | **Archive Supabase Storage long-terme** |

---

## 7. Sources data publiques 100% gratuites

Réutilise [external-data-sources.md](external-data-sources.md) (89 sources documentées Phase 11.0). Ajouts Phase 19 :

| Source | Endpoint | Sprint |
|---|---|---|
| api-carto IGN parcelles_express | `apicarto.ign.fr/api/cadastre/parcelle?code_insee=...` | A |
| api-adresse.data.gouv.fr (BAN) | `api-adresse.data.gouv.fr/search` | A |
| GPU Géoportail Urbanisme | `geoportail-urbanisme.gouv.fr/api/document` | D |
| fichier-deces.api.gouv.fr | API REST OU CSV mensuel INSEE | B |
| recherche-entreprises.api.gouv.fr | DataInfogreffe gratuit (date naissance dirigeants) | B |
| api.gouv.fr/elus (RNE élus) | `repertoire-national-des-elus.api.gouv.fr` | C |
| data.gouv elections | `data.gouv.fr/datasets/elections-municipales` etc. | C |
| data.gouv carte-des-loyers | CLAMEUR + INSEE CSV commune | C |
| bodacc.api.gouv.fr | Étendu vs `prospection-immat` (ventes+liquidations+PC) | E |
| Sit@del2 permis | data.gouv mensuel CSV | E |
| IGN BD ORTHO 5m WMTS | `wxs.ign.fr/{key}/geoportail/wmts` (key gratuite) | D |

**Coûts API** : seul Claude Sonnet 4.6 (~0.01 €/résumé PLU + ~0.02 €/Vision toiture). Soit ~3 cts/parcelle complète. Négligeable.

---

## 8. Conformité 14 règles anti-bug (rappel)

- #2 INTEGER cents (`prix_dvf_cents`, `loyer_moyen_eur_cents`)
- #5 `if (error) throw error` après chaque appel Supabase
- #8 Jamais `USING(true)` sauf exception documentée
- #9 Rate limit sur toutes les EFs (pattern `_shared/rate-limit.ts`)
- #11 TIMESTAMPTZ partout
- #12 `SET search_path = ''` sur fonctions SECURITY DEFINER
- Pattern API ↔ Hooks miroir respecté
- Préfixe `brh_*` cohérent

---

## 9. Tests cibles

- **Vitest** : 390 → ~430 (au moins +40 pure functions sur scoring foncier, parsing PLU, matching décès)
- **Playwright E2E** : ajouter 1 smoke par sprint (login agence → page foncier visible)
- **Type-check `npx tsc --noEmit`** : exit 0 après chaque sprint
- **CI** GitHub Actions : verte
- **ESLint** : exit 0

---

## 10. Refs

- Plan source : `/root/.claude/plans/c-elle-qui-te-semble-wiggly-sundae.md` (Phase 18) — Phase 19 démarrée 06/05 sans replan formel (décisions actées en chat)
- Mémoire Phase 19 : `/root/.claude/projects/-root/memory/brh-foncier-pro-phase19-2026-05-06.md`
- Sources data Bretagne : `/root/.claude/projects/-root/memory/brh-data-sources-prospection-bretagne.md` (89 sources)
- Phase 16 Score Vente Agences : [score-vente-agences.md](score-vente-agences.md)
- Phase 18 Réseau social : 🟡 PAUSE — [reseau-social-status.md](reseau-social-status.md)
