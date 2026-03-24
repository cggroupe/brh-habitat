# Security Audit Report

**Project**: BRH Habitat v2.0
**Date**: 2026-03-24
**Auditor**: Claude Security Audit
**Frameworks**: OWASP Top 10:2025 + NIST CSF 2.0
**Mode**: quick (CRITICAL & HIGH only, Phases 1-2)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 3 |
| 🟡 Medium | — |
| 🟢 Low | — |
| 🔵 Informational | — |
| **Total findings** | **3** |

**Overall Risk Assessment**: Les 3 failles critiques de l'audit precedent (elevation de privileges RLS, insertion anonyme, credentials hardcodees) sont **corrigees et deployees en production**. Il reste 3 findings HIGH : la ContactRdvModal qui ecrit dans des colonnes SQL inexistantes (les donnees de contact sont perdues), la page Contact avec un formulaire non connecte, et l'absence de monitoring. Aucune faille critique de securite n'est presente.

### Comparaison avec l'audit precedent (2026-03-24 v1)

| Severite | Avant | Apres | Delta |
|----------|-------|-------|-------|
| 🔴 Critical | 3 | **0** | -3 ✅ |
| 🟠 High | 5 | **3** | -2 ✅ |
| Total | 8 | **3** | **-5** |

**Failles corrigees** :
- ~~CRITICAL-001 : Elevation privileges RLS profiles~~ → Policies separees + role locked
- ~~CRITICAL-002 : Insertion anonyme diagnostics~~ → `auth.uid() IS NOT NULL`
- ~~CRITICAL-003 : Credentials hardcodees~~ → Env vars obligatoires, throw si manquantes
- ~~HIGH-002 : Security headers manquants~~ → CSP, HSTS, X-Frame-Options en place
- ~~HIGH-003 : Password policy faible~~ → Validation 8 chars + majuscule + chiffre

---

## OWASP Top 10:2025 Coverage

| OWASP ID | Category | Findings | Status |
|----------|----------|----------|--------|
| A01:2025 | Broken Access Control | 0 | ✅ Acceptable |
| A02:2025 | Security Misconfiguration | 0 | ✅ Acceptable |
| A03:2025 | Software Supply Chain Failures | 0 | ✅ Acceptable (0 vulnerabilites npm) |
| A04:2025 | Cryptographic Failures | 0 | ✅ Acceptable |
| A05:2025 | Injection | 0 | ✅ Acceptable |
| A06:2025 | Insecure Design | 2 | 🟠 Needs Attention |
| A07:2025 | Authentication Failures | 0 | ✅ Acceptable |
| A08:2025 | Software or Data Integrity Failures | 0 | ✅ Acceptable |
| A09:2025 | Security Logging and Alerting Failures | 1 | 🟠 Needs Attention |
| A10:2025 | Mishandling of Exceptional Conditions | 0 | ✅ Acceptable |

---

## NIST CSF 2.0 Coverage

| Function | Findings | Status |
|----------|----------|--------|
| GV (Govern) | 0 | ✅ Acceptable |
| ID (Identify) | 0 | ✅ Acceptable |
| PR (Protect) | 2 | 🟠 Needs Attention |
| DE (Detect) | 1 | 🟠 Needs Attention |
| RS (Respond) | 0 | ✅ Acceptable |
| RC (Recover) | 0 | ✅ Acceptable |

---

## 🟠 High Findings

### 🟠 [HIGH-001] ContactRdvModal insere dans des colonnes SQL inexistantes — donnees de contact perdues

- **Severity**: 🟠 HIGH
- **OWASP**: A06:2025 (Insecure Design)
- **CWE**: CWE-404 (Improper Resource Shutdown or Release)
- **NIST CSF**: PR.DS (Data Security)
- **Location**: `src/components/ContactRdvModal.tsx:143-154`
- **Attack Vector**:
  1. Un particulier remplit la modal de contact/RDV apres son diagnostic
  2. La modal insere dans `brh_appointments` avec les colonnes : `contact_name`, `contact_phone`, `contact_email`, `preferred_slot`, `diagnostic_id`
  3. Le schema SQL de `brh_appointments` ne contient PAS ces colonnes (il a : `user_id`, `case_id`, `home_id`, `type`, `requested_date`, `confirmed_date`, `status`, `notes`, `admin_notes`)
  4. Supabase ignore silencieusement les colonnes inconnues lors d'un INSERT
  5. Le RDV est cree mais SANS les coordonnees du particulier ni le lien vers le diagnostic
- **Impact**: Toutes les demandes de contact via la modal sont perdues. L'admin recoit un RDV vide. Le particulier croit avoir ete contacte mais personne ne sait qui il est.
- **Vulnerable Code**:
  ```typescript
  await (supabase as any)
    .from('brh_appointments')
    .insert({
      type: 'diagnostic',
      diagnostic_id: diagnosticId,     // COLONNE INEXISTANTE
      contact_name: form.nom.trim(),   // COLONNE INEXISTANTE
      contact_phone: phoneClean,       // COLONNE INEXISTANTE
      contact_email: form.email,       // COLONNE INEXISTANTE
      preferred_slot: form.creneau,    // COLONNE INEXISTANTE
      notes: appointmentNotes,         // OK - existe
      status: 'pending',              // VALEUR INEXISTANTE (schema = 'demande')
    })
  ```
- **Remediation**: Creer une migration SQL ajoutant les colonnes manquantes a `brh_appointments` : `contact_name TEXT`, `contact_phone TEXT`, `contact_email TEXT`, `preferred_slot TEXT`, `diagnostic_id UUID REFERENCES brh_diagnostics(id)`. Ou adapter le code pour utiliser les colonnes existantes (`notes` pour le contexte, `status: 'demande'`).

---

### 🟠 [HIGH-002] Page Contact — formulaire simule, messages perdus

- **Severity**: 🟠 HIGH
- **OWASP**: A06:2025 (Insecure Design)
- **CWE**: CWE-404 (Improper Resource Shutdown or Release)
- **NIST CSF**: PR.DS (Data Security)
- **Location**: `src/pages/public/ContactPage.tsx`
- **Attack Vector**: Le formulaire de contact fait un `setTimeout(1200ms)` puis affiche "Message envoye !" sans aucun appel Supabase ni API. Les messages sont systematiquement perdus.
- **Impact**: Perte de leads. Un prospect qui envoie un message via /contact croit avoir contacte BRH mais le message n'arrive nulle part.
- **Vulnerable Code**:
  ```typescript
  // Simulation — pas d'appel reel
  setTimeout(() => {
    setSubmitting(false)
    setSubmitted(true)
  }, 1200)
  ```
- **Remediation**: Connecter le formulaire a Supabase (nouvelle table `brh_contacts` ou insertion dans `brh_appointments` avec type adapte). Ou remplacer par un lien vers la ContactRdvModal.

---

### 🟠 [HIGH-003] Absence totale de monitoring et alerting

- **Severity**: 🟠 HIGH
- **OWASP**: A09:2025 (Security Logging and Alerting Failures)
- **CWE**: CWE-778 (Insufficient Logging)
- **NIST CSF**: DE.CM (Continuous Monitoring)
- **Location**: Toute l'application
- **Attack Vector**: Les erreurs JavaScript en production (crashs, erreurs reseau, echecs d'auth) ne sont ni loguees ni alertees. Un attaquant pourrait exploiter une faille sans que personne ne soit notifie.
- **Impact**: Impossible de detecter les incidents de securite, les bugs de production, ou les abus.
- **Remediation**: Integrer Sentry (gratuit jusqu'a 5K events/mois) avec `Sentry.init()` dans main.tsx.

---

## Recommendations Summary

### Priorite 1 — Immediat
1. **[HIGH-001]** Creer migration SQL pour les colonnes manquantes dans `brh_appointments` et corriger le status 'pending' → 'demande'
2. **[HIGH-002]** Connecter le formulaire Contact a Supabase ou le rediriger vers la ContactRdvModal

### Priorite 2 — Court terme
3. **[HIGH-003]** Integrer Sentry pour le monitoring des erreurs

### Elements positifs confirmes
- 0 faille critique
- 0 vulnerabilite npm
- Security headers complets (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- RLS robuste avec `is_admin()` SECURITY DEFINER
- Credentials Supabase via env vars (plus de fallback hardcode)
- Protection double-soumission sur tous les formulaires
- Validation mot de passe renforcee (8 chars, majuscule, chiffre)
- Password change via Supabase Auth (bcrypt par defaut)

---

## Methodology

| Aspect | Details |
|--------|---------|
| Phases executed | 1-2 (quick mode) |
| Frameworks detected | React 19, Vite 7, Supabase, Tailwind CSS 4 |
| White-box categories | 20/20 categories scanned (CRITICAL + HIGH only) |
| Gray-box testing | Skipped (quick mode) |
| Security hotspots | Skipped (quick mode) |
| Code smells | Skipped (quick mode) |
| Packs loaded | none |
| Scope exclusions | none |
| OWASP Top 10:2025 | 10/10 categories covered |
| NIST CSF 2.0 | 6/6 functions covered |
| CWE | 2 unique CWE IDs identified |
| npm audit | 0 vulnerabilities (all severities) |

---

*Report generated by Claude Security Audit*
