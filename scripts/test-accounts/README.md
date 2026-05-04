# Comptes de test BRH Habitat

6 comptes pour valider tous les portails de la plateforme.

## Mot de passe (commun aux 6) : `BrhTest2026!`

| Email | Rôle | Portail à tester | Particularités |
|-------|------|------------------|----------------|
| `admin@brh-test.fr` | admin | `/admin` | Accès complet à toutes les pages admin (15 entrées menu + 4 nouvelles Phase 16) |
| `pro-owner@brh-test.fr` | pro (owner) | `/pro` | Toutes les permissions activées (Finance, Équipe, Marketplace, Export, Courriers) |
| `pro-member@brh-test.fr` | pro (member) | `/pro` | Permissions limitées : **PAS** Finance / Équipe / Marketplace. **OUI** Export / Courriers. Idéal pour tester `<PermissionGate>` et `<PermissionRoute>`. |
| `particulier@brh-test.fr` | particulier | `/particulier` | 2500 points (catalogue cadeaux actif), code parrainage `TESTPART01` |
| `artisan@brh-test.fr` | user + artisan_rge | `/artisan` | Lié à `brh_artisans_rge` : SIRET 98765432101234, Brest, spécialités PAC + isolation combles + ITE |
| `agence@brh-test.fr` | user + agence_immo | `/agence` | Charte signée active (Phase 16.0.7), tier `standard` (390€/30 leads/mois), 3 leads claim cumulés |

## Workflow recommandé pour chaque compte

### admin
1. Connexion → redirect auto `/admin`
2. Vérifier le menu sidebar (19 entrées dont les 4 récentes Phase 16 : Claims agences, Audits agences, Chartes signées, Demandes RGPD + 2 commissions distinctes)
3. Visiter `/admin/score-vente`, `/admin/agences-immo`, `/admin/commissions-vendeurs`, `/admin/commissions-artisans`

### pro-owner vs pro-member
1. Connexion `pro-owner` → menu pro complet (8 groupes accordéon)
2. Déconnexion → connexion `pro-member`
3. **Comparer les menus** : pro-member ne doit PAS voir Finance (Commissions, Abonnement, Rapport, Analytics, Mes leads artisans)
4. Tenter URL directe `/pro/commissions` en pro-member → redirect vers `/pro` (PermissionRoute)

### particulier
1. Connexion → redirect `/particulier`
2. Vérifier le solde 2500 pts dans `/particulier/points`
3. Tester `/particulier/catalogue` (cadeaux disponibles avec ce solde)
4. Tester `/particulier/ia` (mode chiffrage par défaut, mode dtu via dropdown)

### artisan
1. Connexion `artisan@brh-test.fr` → redirect `/tableau-de-bord` (role='user')
2. Naviguer manuellement vers `/artisan` → `ArtisanGuard` autorise via `brh_artisans_rge.profile_id`
3. Vérifier les 6 entrées sidebar Artisan (Accueil, Missions, Agenda, Factures, Profil, Messages)

### agence (Phase 16)
1. Connexion `agence@brh-test.fr` → redirect `/tableau-de-bord` (role='user')
2. Naviguer manuellement vers `/agence` → `AgenceGuard` autorise via `brh_partner_contracts(active)`
3. Vérifier les 5 pages : Dashboard, Leads, Score Vente, Abonnement, Profil
4. `/agence/abonnement` doit afficher tier=standard, quota=30, claims=3

## Setup / Cleanup

```bash
# Création des 6 comptes (idempotent)
PGPASSWORD='Brh29200..@@' psql \
  "postgresql://postgres.lygmmvxnmvlgynmrcpny@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f scripts/test-accounts/setup.sql

# Suppression
PGPASSWORD='Brh29200..@@' psql \
  "postgresql://postgres.lygmmvxnmvlgynmrcpny@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f scripts/test-accounts/teardown.sql
```

## URLs prod

- **Vercel** : https://brh-habitat.vercel.app
- **Domaine** : https://www.renovation-brh.fr (une fois DNS+SSL prêts)

## Notes techniques

- Les comptes `artisan` et `agence` ont `role='user'` car le système de Guards vérifie via les tables membership (`brh_artisans_rge.profile_id`, `brh_partner_contracts.signer_profile_id`), pas via le rôle profile.
- Idempotent : ré-exécuter `setup.sql` réinitialise les 6 comptes sans casse (DELETE puis INSERT avec UUIDs fixes).
- Ne pas committer `BrhTest2026!` dans le code applicatif. Ce mdp est pour environnement de test/staging uniquement.
