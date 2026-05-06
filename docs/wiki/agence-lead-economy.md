# Modèle économique unifié — Économie de leads agences (Phase 16.1 Steps A-C)

> **Statut** : ✅ Livré 2026-05-06 · ⚠️ CGU à valider par avocat avant lancement public.

## Pourquoi cette page

Avant Phase 16.1 Step A, le RPC central `brh_grant_lead_claim` ne décrémentait que le `monthly_lead_quota` du tier d'abonnement Stripe. Les colonnes `bonus_leads_unlocked` et `bonus_leads_consumed` existaient mais n'étaient jamais mises à jour au claim → **les agences ne profitaient jamais de leurs bonus**. Bug structurel.

Cette page documente le modèle unifié post-correction : 1 RPC qui consomme tier + 3 sources de bonus dans un ordre prédictible, avec décomposition exposée à l'UI.

---

## 1. Sources de leads d'une agence

| Source | Mécanisme | Plafond | Reset |
|--------|-----------|---------|-------|
| **Tier** (forfait) | Abonnement Stripe : Discovery 0€/5, Standard 390€/30, Premium 990€/100, Expert 2490€/∞ | Selon tier | 1er du mois |
| **Bonus contributions** | +5 leads par chantier signé issu d'un apport prospect travaux | Aucun | 1er du mois |
| **Bonus parrainage** | Cascade 5 niveaux : N1=+5, N2=+3, N3=+2, N4=+1, N5=+1 par charte signée | Aucun | 1er du mois |
| **Bonus social** | +5 leads par publication réseau validée (FB/IG/LI/TikTok/Google) | 2 publications/mois → 10 leads max | 1er du mois |

Toutes les sources resettent le 1er du mois (décision Philippe 2026-05-06 : simplicité > carry-over).

---

## 2. RPC central `brh_grant_lead_claim`

Atomique via `FOR UPDATE` sur 2 tables (`brh_agence_subscriptions`, `brh_agence_progression`). Ordre de consommation :

```
1. tier (current_month_claims++)
2. bonus contribution (contribution_consumed++)
3. bonus referral (referral_consumed++)
4. bonus social (social_consumed++)
```

Si toutes les sources sont à 0 → `RAISE EXCEPTION 'quota_exhausted'`.

Le tier est consommé en premier pour préserver les bonus (ils restent dispos si l'agence n'épuise pas son tier). C'est plus généreux pour l'agence active.

Code source : `supabase/migrations/20260706200000_brh_agence_lead_economy_unified.sql` (Step A).

---

## 3. RPC breakdown `brh_get_my_lead_breakdown`

SECURITY DEFINER, scope `auth.uid()` (signer OR employee via `brh_agence_members`). Retourne en 1 query :

```ts
{
  agenceId, tier, tierQuota, tierUsed, tierRemaining,    // tier (NULL = ∞)
  social: { unlocked, consumed, remaining },
  contribution: { unlocked, consumed, remaining },
  referral: { unlocked, consumed, remaining },
  bonusTotalRemaining, totalRemaining
}
```

Consommé par le hook `useMyLeadBreakdown()` → composant `<LeadBreakdownCard>`.

---

## 4. Cascade parrainage 5 niveaux (Step C)

### Principe

Quand une agence X signe sa charte (`brh_partner_contracts.status → 'active'`), le trigger remonte la chaîne `referred_by_agence_id` via une boucle PL/pgSQL et crée jusqu'à 5 commissions :

```
X signe charte
  ├── parent direct (N1) reçoit 100 € HT + 5 leads
  ├── grand-parent (N2)  reçoit  25 € HT + 3 leads
  ├── arrière (N3)       reçoit  10 € HT + 2 leads
  ├── arrière² (N4)      reçoit   5 € HT + 1 lead
  └── arrière³ (N5)      reçoit   5 € HT + 1 lead
```

**Total max par charte signée : 145 € HT cash + 12 leads** distribués sur 5 ancêtres. Cap dur à 5 niveaux (pas de pyramide infinie).

### RPC arbre `brh_get_my_referral_tree`

CTE récursive (5 niveaux max) — descend dans l'arbre des filleuls. Chaque ligne enrichie avec `cash_earned_cents` et `leads_earned` (somme des commissions où `recruiter_agence_id = caller`).

Consommé par `<ReferralTreeView>` → onglet "Mon arbre" sur `/agence/parrainage`.

---

## 5. Triggers et flux

```
brh_agence_social_posts  ──[trigger validation]──▶  social_unlocked +=5
brh_agence_contributions ──[trigger recompute]──▶  contribution_unlocked = signed_this_month*5
brh_partner_contracts     ──[trigger cascade]───▶  brh_agence_referral_commissions (×5)
                                                                │
                                                                ▼
                                                       [trigger credit_referral]
                                                                │
                                                                ▼
                                                    referral_unlocked += leads_bonus_amount

brh_lead_assignments ◀────[RPC grant_lead_claim]──── claim user
                              ▼ FOR UPDATE
                              │
                       tier > contribution > referral > social
```

---

## 6. Code source

| Élément | Chemin |
|---------|--------|
| Migration unifiée Step A | `supabase/migrations/20260706200000_brh_agence_lead_economy_unified.sql` |
| Migration cascade Step C | `supabase/migrations/20260706210000_brh_agence_referral_chain.sql` |
| API + erreurs FR | `src/api/agence-lead-economy.ts` |
| Hooks React Query | `src/hooks/queries/agence-lead-economy.ts` |
| `<LeadBreakdownCard>` | `src/components/agence/LeadBreakdownCard.tsx` |
| `<ReferralTreeView>` | `src/components/agence/ReferralTreeView.tsx` |
| Page parrainage modifiée | `src/pages/agence/AgenceParrainage.tsx` |
| Page progression modifiée | `src/pages/agence/AgenceProgression.tsx` |
| Page dashboard modifiée | `src/pages/agence/AgenceDashboard.tsx` |

---

## 7. Compliance / risques

5 niveaux = MLM réel au sens loi Hamon. Garde-fous mis en place :

1. **Cap dur à 5 niveaux** : trigger boucle `EXIT WHEN v_level > 5`.
2. **Récompense conditionnée à un acte réel** : `partner_contracts.status = 'active'` (charte signée + email confirmé). Pas de prime à l'inscription seule → pas pyramidale.
3. **Pas de droit d'entrée** : agence parrainée ne paie rien pour rejoindre le réseau.
4. **Reset mensuel des bonus leads** : pas d'accumulation infinie favorable aux dormants.
5. **Cash dégressif** : 100 / 25 / 10 / 5 / 5 € — la valeur économique converge vers zéro plus on monte.
6. **Total max contrôlé** : 145 € HT par charte vs MRR cible 390-2490 €/mois → marge largement positive.

**À faire avant lancement public** :
- [ ] Section CGU agence "Programme de recommandation 5 niveaux" + disclaimer non-pyramidal (budget 1500 € avocat Hoguet déjà acté)
- [ ] Page d'aide `/agence/parrainage/comment-ca-marche` (transparence barème)
- [ ] Notification email automatique au parrain quand commission créée (Phase 16.2 admin)

---

## 8. Tests E2E à faire (post-déploiement)

1. **Atomicité claim avec mix tier+bonus** : agence avec `tier_remaining=2`, `social=5`, `contribution=5`. Faire 12 claims successifs, vérifier ordre de décompte (tier → contribution → social).
2. **Cascade signature** : créer chaîne A→B→C→D→E→F→G. Charte signée par G. Vérifier que A à E ont chacun une ligne dans `brh_agence_referral_commissions` avec leur `chain_level` et `leads_bonus_amount`. F et G n'ont rien.
3. **Reset 1er du mois** : exécuter `SELECT brh_reset_agence_monthly_quotas()` → vérifier `social_unlocked = 0` et `current_month_claims = 0` sur toutes les agences dont `current_period_end < now()`.
4. **RLS employee** : un employé sur `brh_agence_members.member_role = 'employee'` doit voir le breakdown via `brh_get_my_lead_breakdown` et l'arbre via `brh_get_my_referral_tree`.
5. **Anti pyramide** : créer cycle A→B→A (referred_by croise). Vérifier que la cascade `EXIT WHEN v_current = NEW.agence_id` empêche la boucle infinie.

---

## 9. Évolutions futures (Phase 16.2 admin)

- `/admin/network-tree` : arbre global de tous les parrainages agences (vue contrôle)
- Validation manuelle commissions N2-N5 (ou auto avec cap mensuel par agence)
- Dashboard ROI : pour chaque tier abonnement, ratio leads bonus distribués / MRR généré
- Export comptable : CSV mensuel des commissions cash dues

Voir [agence-portal-status.md § Reste admin](agence-portal-status.md#4--reste-à-faire-côté-admin-brh-session-dédiée-à-venir).
