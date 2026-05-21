# Hub Client BRH — fiche employé (entité-pivot)

> **Hub fiche client BRH** : vue 360° d'un contact qui figure dans `brh_personnes_historique`.
> Accessible **uniquement par les employés BRH** (route `/employe/clients-brh/:id`).
>
> Statut : 🟡 **SQUELETTE Phase 0** — contenu rempli Phase 3 (cf [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md)).

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

## 4. RPC cibles (à créer ou enrichir Phase 3)

- `brh_personne_360` v2 (existant — sortie cas Bodard) → étendre avec :
  - `foncier_at_address` : DPE + permis + BDNB + DVF matchés par clé stricte
  - `is_tenant_of_sci` BOOLEAN
- Ou nouveau RPC `brh_client_360` qui agrège tout en 1 round-trip

---

## 5. UI cible

Fichier : [src/pages/employe/EmployeClientBrhDetail.tsx](../../src/pages/employe/EmployeClientBrhDetail.tsx)

Section "Foncier à l'adresse" à ajouter — single-page, pas d'onglet caché.

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 3
- Inventaire data : [data-inventory.md](data-inventory.md)
- Matching adresse : [matching-adresse.md](matching-adresse.md)
- Hubs sœurs : [hub-lead-public.md](hub-lead-public.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md)
- Bugs : [bugs-ouverts.md](bugs-ouverts.md) (B1-B5 corrigés local, B8 confusion clients/prospects)

---

**Dernière maj** : 2026-05-21 (squelette Phase 0) — Claude Opus 4.7
