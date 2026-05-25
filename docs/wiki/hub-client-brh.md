# Hub Client BRH — fiche employé (entité-pivot)

> **Hub fiche client BRH** : vue 360° d'un contact qui figure dans `brh_personnes_historique`.
> Accessible **uniquement par les employés BRH** (route `/employe/clients-brh/:id`).
>
> Statut : ✅ **LIVRÉ Phase 3 (21/05/2026)** — RPC foncier + section UI + détection locataire SCI.

---

## 1. Ce que l'employé BRH doit voir sur la fiche client

Demande Philippe 21/05 (vocal) :

> « Pour les clients BRH, je souhaite qu'on ait leurs fiches avec les informations des travaux qui ont été réalisés si possible. Un numéro de téléphone ou une adresse mail, ou les deux. Nom prénom, forcément. Leur adresse postale. Et savoir si leur adresse postale est rattachée à un DPE avec les données de l'ADEME, ou un permis de construire, ou si on a des données du CSTB BDNB à cette adresse. Un match absolument parfait : numéro de rue, nom de rue, code postal. Bien faire attention que ces informations ne soient pas rattachées à une SCI — dans ces cas-là, le client est maintenant locataire du propriétaire. Mais dans ces cas-là je pense qu'il y en aura très peu parce que tous nos clients sont en général les propriétaires. »

### Blocs à afficher

1. **Identité** : nom, prénom (capitalisés FR — fix B1)
2. **Contact** : téléphone (formaté FR — fix B2) + email
3. **Adresse postale** : dédupliquée (fix B3), formatée FR
4. **Travaux réalisés** : table `brh_personne_travaux` + visites `brh_personne_visits`
5. **Foncier à l'adresse** (matching strict cf [matching-adresse.md](matching-adresse.md)) :
   - DPE rattaché (ADEME) + détails énergétiques
   - Permis de construire à l'adresse (Sitadel)
   - BDNB / CSTB (typologie bâti)
   - DVF (mutations à l'adresse)
6. **Badge "Locataire" si client occupant** :
   - Si `dpe.owner_siren IS NOT NULL` ET client pas dirigeant SCI → badge `"Locataire — SCI X propriétaire"` (fix B4)
7. **Score d'enrichissement** : tier gold/silver/bronze/none (cf [osint-enrichment-registry.md](osint-enrichment-registry.md))
8. **Signaux externes** (déjà câblé 19/05) : DVF récent, succession SCI, BODACC

---

## 2. Sources data utilisées

| Source | Table | Pivot |
|--------|-------|-------|
| Identité + contact | `brh_personnes_historique` | `id` UUID |
| Travaux observés | `brh_personne_travaux` | `personne_id` |
| Visites terrain | `brh_personne_visits` | `personne_id` |
| DPE à l'adresse | `brh_dpe_prospects` | clé `(cp, voie_norm, num)` |
| Permis | `brh_permis_construire` | clé `(cp, voie_norm, num)` ⚠️ table vide actuellement |
| BDNB | `brh_bdnb_*` ⚠️ à créer P3 | clé `(cp, voie_norm, num)` |
| DVF | `brh_dvf_archive` | clé `(cp, voie_norm)` |
| Détection SCI | `brh_sci_companies` | `owner_siren` du DPE |

---

## 3. Décisions Philippe (21/05)

- **D-4** : pas de nouvelle table `brh_clients_brh_canonical`. On enrichit `brh_personnes_historique` existant (18 571 rows) avec colonne(s) supplémentaires si nécessaire.
- **Fichiers source d'import** : départements 22 / 29 / 35 / 44 / 56 (4 bretons + 44 Loire-Atlantique). À localiser sur VPS Phase 1.

---

## 4. RPC livrée Phase 3 ✅ — v3 actif (25/05) avec match BAN id

**v3 (actif)** : [supabase/migrations/20260525110000_rpc_brh_client_foncier_at_address_v3.sql](../../supabase/migrations/20260525110000_rpc_brh_client_foncier_at_address_v3.sql)
**v1 (conservée pour rollback)** : [supabase/migrations/20260521160000_rpc_brh_client_foncier_at_address.sql](../../supabase/migrations/20260521160000_rpc_brh_client_foncier_at_address.sql)

Signature : `brh_client_foncier_at_address_v3(p_personne_id uuid)` (identique à v1, drop-in)

Retour (TABLE) :
- `client_address jsonb` : adresse brute + clé normalisée + **`adresse_ban_id`** (nouveau v3)
- `dpe_matches jsonb[]` : DPE F/G matchés (legacy strict OR via ban_id, DISTINCT sur dpe_id) + `role`
- `dvf_matches jsonb[]` : 20 dernières mutations DVF à la voie (`usable_for_brh = TRUE`)
- `permis_matches jsonb[]` : permis Sitadel à la voie stricte
- `is_tenant_of_sci boolean` : flag cas Bodard (matching élargi v3)
- `sci_proprietaire jsonb | null` : `{name, siren}` si is_tenant_of_sci

Algorithme matching DPE (v3) :
1. **Legacy strict** : `(code_postal, numero_norm, voie_norm)` exact, ou lieu-dit (voie only)
2. **OR BAN id** : `adresse_ban_id = client.adresse_ban_id` (clé immune aux variations d'écriture)
3. `DISTINCT ON (d.id)` pour dé-doublonner
4. Pour chaque DPE matché avec `owner_siren NOT NULL` : `brh_entity_links` → dirigeant SCI / locataire SCI / particulier

Impact attendu : 419 matches v1 → 5 000-15 000 v3 sur les 16 740 clients avec ban_id (gain conditionné à la couverture BAN du côté DPE — enrichissement Phase 1.2 finalise ~95% de couverture).

SECURITY DEFINER + access guard `profiles.role ∈ (admin, pro, employe)` + `SET search_path = ''` (règle anti-bug #12).

---

## 5. UI livrée Phase 3 ✅

**Composant** : [src/components/leads/ClientFoncierSection.tsx](../../src/components/leads/ClientFoncierSection.tsx)

Affiche en single-page sur la fiche client BRH :
- **En-tête** : icône Home + clé normalisée affichée (debug visible)
- **Badge "Locataire — SCI propriétaire"** (ambre) si `is_tenant_of_sci = TRUE` — cas Bodard, mentionne le nom + SIREN de la SCI propriétaire et précise "Pour les travaux, contacter le propriétaire"
- **Bloc DPE F/G** : badge couleur A→G + numéro DPE + surface + année + rôle (propriétaire / dirigeant / locataire) avec code couleur
- **Bloc Mutations DVF** : date + nature + type local + surface + valeur foncière formatée FR + prix/m² (sauf si is_groupee → badge "groupée")
- **Fallback vide** : lien Géoportail si aucun match

**Intégré** dans [src/pages/employe/EmployeClientBrhDetail.tsx](../../src/pages/employe/EmployeClientBrhDetail.tsx) juste après `ClientVisitsTravauxSection` (logique métier : adresse → foncier → visites terrain).

**Hook + API** :
- [src/api/brh-client-foncier.ts](../../src/api/brh-client-foncier.ts) — 6 interfaces TypeScript + `brhClientFoncierApi.getFoncier()`
- [src/hooks/queries/useClientFoncier.ts](../../src/hooks/queries/useClientFoncier.ts) — React Query `staleTime: 60s`

**Build** : ✅ tsc strict + Vite 22s, 0 erreur.

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 3
- Inventaire data : [data-inventory.md](data-inventory.md)
- Matching adresse : [matching-adresse.md](matching-adresse.md)
- Hubs sœurs : [hub-lead-public.md](hub-lead-public.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md)
- Bugs : [bugs-ouverts.md](bugs-ouverts.md) (B1-B5 corrigés local, B8 confusion clients/prospects)

---

**Dernière maj** : 2026-05-21 (Phase 3 livrée — RPC + UI Foncier à l'adresse) — Claude Opus 4.7
