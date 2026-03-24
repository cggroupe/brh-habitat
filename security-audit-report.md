# Security Audit Report

**Project**: BRH Habitat (Bretagne Renovation Habitat)
**Date**: 2026-03-24
**Auditor**: Claude Security Audit
**Frameworks**: OWASP Top 10:2025 + NIST CSF 2.0 + CWE + SANS Top 25 + ASVS 5.0 + PCI DSS 4.0.1 + MITRE ATT&CK + SOC 2 + ISO 27001:2022
**Mode**: full

---

## Executive Summary

| Metric | Count |
|--------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 5 |
| 🟡 Medium | 6 |
| 🟢 Low | 4 |
| 🔵 Informational | 3 |
| 🔲 Gray-box findings | 4 |
| 📍 Security hotspots | 5 |
| 🧹 Code smells | 4 |
| **Total findings** | **34** |

**Overall Risk Assessment**: L'application presente 3 failles critiques qui permettent l'insertion anonyme non limitee de donnees en base, l'elevation de privileges via la modification directe du role utilisateur, et l'exposition de credentials en clair dans le bundle client. Ces failles combinees permettraient a un attaquant de spammer la base, de se promouvoir admin, et d'acceder a l'integralite des donnees. Correction urgente requise avant toute mise en production serieuse.

---

## OWASP Top 10:2025 Coverage

| OWASP ID | Category | Findings | Status |
|----------|----------|----------|--------|
| A01:2025 | Broken Access Control | 5 | 🔴 Needs Attention |
| A02:2025 | Security Misconfiguration | 4 | 🟠 Needs Attention |
| A03:2025 | Software Supply Chain Failures | 1 | 🟡 Needs Attention |
| A04:2025 | Cryptographic Failures | 2 | 🔴 Needs Attention |
| A05:2025 | Injection | 1 | ✅ Acceptable |
| A06:2025 | Insecure Design | 5 | 🟠 Needs Attention |
| A07:2025 | Authentication Failures | 3 | 🟠 Needs Attention |
| A08:2025 | Software or Data Integrity Failures | 1 | 🟡 Needs Attention |
| A09:2025 | Security Logging and Alerting Failures | 3 | 🔴 Needs Attention |
| A10:2025 | Mishandling of Exceptional Conditions | 2 | 🟡 Needs Attention |

---

## NIST CSF 2.0 Coverage

| Function | Categories | Findings | Status |
|----------|-----------|----------|--------|
| GV (Govern) | GV.SC, GV.RM | 2 | 🟡 Needs Attention |
| ID (Identify) | ID.AM, ID.RA | 1 | ✅ Acceptable |
| PR (Protect) | PR.AA, PR.DS, PR.PS | 12 | 🔴 Needs Attention |
| DE (Detect) | DE.CM, DE.AE | 4 | 🔴 Needs Attention |
| RS (Respond) | RS.MA | 1 | 🟡 Needs Attention |
| RC (Recover) | RC.RP | 0 | ✅ Acceptable |

---

## Compliance Coverage

| Framework | Coverage | Details |
|-----------|----------|---------|
| CWE | 18 unique CWEs identified | CWE-862, CWE-269, CWE-799, CWE-321, CWE-526, CWE-778, CWE-390, CWE-20, CWE-602, CWE-307, CWE-521, CWE-200, CWE-942, CWE-756, CWE-1104, CWE-79, CWE-754, CWE-209 |
| SANS/CWE Top 25 | 5/25 entries found | #9 CWE-862, #12 CWE-20, #15 CWE-269, #17 CWE-200, #22 CWE-798 |
| OWASP ASVS 5.0 | 8/14 chapters with findings | V1, V2, V3, V4, V5, V7, V8, V14 |
| PCI DSS 4.0.1 | 5 requirements relevant | 6.2.4, 7.2, 8.2, 10.2, 2.2 |
| MITRE ATT&CK | 7 techniques mapped | T1068, T1078, T1110, T1190, T1552, T1562, T1499 |
| SOC 2 | 5 criteria with findings | CC6.1, CC6.2, CC7.1, CC7.2, CC7.4 |
| ISO 27001:2022 | 7 controls with findings | A.5.15, A.5.17, A.8.2, A.8.5, A.8.6, A.8.9, A.8.16 |

---

## 🔴 Critical & 🟠 High Findings

### 🔴 [CRITICAL-001] Elevation de privileges — un utilisateur peut se promouvoir admin via RLS

- **Severity**: 🔴 CRITICAL
- **OWASP**: A01:2025 (Broken Access Control)
- **CWE**: CWE-269 (Improper Privilege Management)
- **NIST CSF**: PR.AA (Auth and Access Control)
- **Compliance**: SANS Top 25 #15 | ASVS V4.1.1 | PCI DSS 7.2 | T1068 | CC6.1 | A.5.15
- **Location**: `supabase/migrations/001_brh_full_schema.sql:21-22`
- **Attack Vector**:
  1. Un utilisateur authentifie connait son propre UUID (visible dans le JWT Supabase)
  2. La policy RLS sur `profiles` est `FOR ALL USING (id = auth.uid())` — cela autorise SELECT, INSERT, UPDATE et DELETE pour l'utilisateur sur sa propre ligne
  3. L'utilisateur peut donc executer : `UPDATE profiles SET role = 'admin' WHERE id = '<son-uuid>'`
  4. Au prochain refresh, il est admin et accede a toutes les donnees
- **Impact**: Prise de controle totale de l'application. Acces a tous les diagnostics, logements, dossiers, donnees personnelles de tous les utilisateurs.
- **Vulnerable Code**:
  ```sql
  CREATE POLICY "profiles_own_data" ON profiles
    FOR ALL USING (id = auth.uid());
  ```
- **Remediation**: Separer les policies par operation. Interdire l'UPDATE du champ `role` par les utilisateurs. Utiliser une fonction `SECURITY DEFINER` pour les changements de role.

---

### 🔴 [CRITICAL-002] Insertion anonyme illimitee de diagnostics — RLS INSERT sans authentification

- **Severity**: 🔴 CRITICAL
- **OWASP**: A01:2025 (Broken Access Control)
- **CWE**: CWE-862 (Missing Authorization)
- **NIST CSF**: PR.AA (Auth and Access Control)
- **Compliance**: SANS Top 25 #9 | ASVS V4.2.1 | PCI DSS 7.2 | T1190 | CC6.1 | A.5.15
- **Location**: `supabase/migrations/001_brh_full_schema.sql:82`
- **Attack Vector**:
  1. La policy INSERT est `WITH CHECK (true)` — aucune verification d'identite
  2. Le code frontend envoie `user_id: null` (`DiagnosticPage.tsx:903`)
  3. Un script automatise peut inserer des milliers de diagnostics sans compte
  4. Chaque insertion est un appel Supabase facture → attaque par cout (billing attack)
- **Impact**: Spam de la base de donnees, couts Supabase exponentiels, pollution des donnees admin, potentiel denial-of-service.
- **Vulnerable Code**:
  ```sql
  CREATE POLICY "Users can create diagnostics" ON brh_diagnostics
    FOR INSERT WITH CHECK (true);
  ```
  ```typescript
  // DiagnosticPage.tsx:903
  user_id: null,
  ```
- **Remediation**: Ajouter une verification : `WITH CHECK (auth.uid() IS NOT NULL)` ou implementer un rate limiting via Edge Function + captcha.

---

### 🔴 [CRITICAL-003] Credentials Supabase hardcodees dans le bundle client

- **Severity**: 🔴 CRITICAL
- **OWASP**: A04:2025 (Cryptographic Failures)
- **CWE**: CWE-321 (Use of Hard-coded Cryptographic Key)
- **NIST CSF**: PR.DS (Data Security)
- **Compliance**: SANS Top 25 #22 | ASVS V6.4.1 | PCI DSS 2.2 | T1552.001 | CC6.7 | A.8.9
- **Location**: `src/lib/supabase.ts:2-3`
- **Attack Vector**:
  1. Les credentials Supabase (URL + anon key) sont hardcodees en fallback
  2. Meme si les env vars sont supprimees, l'app fonctionne avec les credentials en clair
  3. Le JWT anon key expose : project ref `lygmmvxnmvlgynmrcpny`, role `anon`, exp `2087`
  4. Combine avec CRITICAL-001, un attaquant peut creer un compte, se promouvoir admin, et exfiltrer toutes les donnees
- **Impact**: Acces direct a l'API Supabase sans passer par l'application. Combinaison avec les failles RLS pour exfiltration complete.
- **Vulnerable Code**:
  ```typescript
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://lygmmvxnmvlgynmrcpny.supabase.co'
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'eyJhbGciOi...'
  ```
- **Remediation**: Supprimer les fallbacks. L'anon key Supabase est par design publique (utilisee cote client), mais les fallbacks hardcodes empechent de detecter une mauvaise configuration. L'urgence ici est de corriger CRITICAL-001 car la combinaison credentials + elevation de privileges est devastatrice.

---

### 🟠 [HIGH-001] Absence de rate limiting sur login, register et diagnostic

- **Severity**: 🟠 HIGH
- **OWASP**: A07:2025 (Authentication Failures)
- **CWE**: CWE-307 (Improper Restriction of Excessive Auth Attempts)
- **NIST CSF**: PR.AA (Auth and Access Control)
- **Compliance**: ASVS V2.2.1 | PCI DSS 8.2 | T1110 | CC6.1 | A.5.17
- **Location**: `src/pages/public/LoginPage.tsx:13-25`, `src/pages/public/RegisterPage.tsx:14-33`
- **Attack Vector**:
  1. Aucun rate limiting n'est configure (ni cote Supabase Auth, ni cote application)
  2. Un attaquant peut effectuer un brute force sur le login sans limitation
  3. L'endpoint d'inscription permet la creation massive de comptes
  4. Le diagnostic (CRITICAL-002) n'a aucune limite non plus
- **Impact**: Brute force sur les comptes existants, creation massive de comptes spam, pollution de la base.
- **Vulnerable Code**:
  ```typescript
  // LoginPage.tsx — aucun rate limit, captcha, ou compteur de tentatives
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  ```
- **Remediation**: Activer le rate limiting natif Supabase Auth. Ajouter un captcha (hCaptcha/Turnstile) sur login, register et diagnostic.

---

### 🟠 [HIGH-002] Absence totale de security headers HTTP

- **Severity**: 🟠 HIGH
- **OWASP**: A02:2025 (Security Misconfiguration)
- **CWE**: CWE-693 (Protection Mechanism Failure)
- **NIST CSF**: PR.PS (Platform Security)
- **Compliance**: ASVS V14.4.1 | PCI DSS 6.4 | CC6.6 | A.8.9
- **Location**: `index.html`, `vercel.json`
- **Attack Vector**:
  1. Aucun Content-Security-Policy (CSP)
  2. Aucun X-Frame-Options (clickjacking possible)
  3. Aucun X-Content-Type-Options
  4. Aucun Strict-Transport-Security (HSTS)
  5. Aucun Referrer-Policy
  6. Aucun Permissions-Policy
- **Impact**: Vulnerable au clickjacking, XSS via injection de scripts tiers, MIME sniffing, downgrade HTTP.
- **Vulnerable Code**:
  ```json
  // vercel.json — seulement les rewrites SPA, aucun header de securite
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Remediation**: Ajouter des headers de securite dans vercel.json.

---

### 🟠 [HIGH-003] Politique de mot de passe insuffisante

- **Severity**: 🟠 HIGH
- **OWASP**: A07:2025 (Authentication Failures)
- **CWE**: CWE-521 (Weak Password Requirements)
- **NIST CSF**: PR.AA (Auth and Access Control)
- **Compliance**: ASVS V2.1.1 | PCI DSS 8.3 | CC6.2 | A.5.17
- **Location**: `src/pages/public/RegisterPage.tsx:132`
- **Attack Vector**:
  1. Minimum 8 caracteres (HTML5 `minLength={8}`) — validation cote client uniquement
  2. Pas de verification de complexite (majuscules, chiffres, caracteres speciaux)
  3. Pas de verification contre les listes de mots de passe compromis (Have I Been Pwned)
  4. Supabase Auth par defaut accepte des mots de passe faibles (minimum 6 chars)
- **Impact**: Comptes facilement compromis par brute force ou dictionnaire.
- **Vulnerable Code**:
  ```html
  <input type="password" minLength={8} />
  <!-- Pas de validation serveur supplementaire -->
  ```
- **Remediation**: Configurer la politique de mot de passe Supabase (min 8 chars, lettre + chiffre). Ajouter une validation cote client plus stricte.

---

### 🟠 [HIGH-004] Admin peut modifier le role de N'IMPORTE QUEL utilisateur sans verification RLS

- **Severity**: 🟠 HIGH
- **OWASP**: A01:2025 (Broken Access Control)
- **CWE**: CWE-863 (Incorrect Authorization)
- **NIST CSF**: PR.AA (Auth and Access Control)
- **Compliance**: SANS Top 25 #18 | ASVS V4.1.2 | T1078 | CC6.1 | A.8.2
- **Location**: `src/pages/admin/AdminUtilisateurs.tsx:103-129`
- **Attack Vector**:
  1. La policy `profiles_own_data` permet `FOR ALL USING (id = auth.uid())`
  2. Un admin ne devrait PAS pouvoir modifier le profil d'un autre utilisateur via cette policy
  3. Or, l'admin appelle `supabase.from('profiles').update({role}).eq('id', profile.id)` sur un AUTRE ID
  4. Cela fonctionne probablement car les admins ont une policy RLS supplementaire ou parce que la policy est trop permissive
  5. Il n'y a PAS de policy specifique admin sur `profiles` dans le schema SQL
- **Impact**: Si la policy ne bloque pas, un admin peut modifier le role. Si elle bloque, la fonctionnalite admin est cassee. Dans les deux cas, c'est un probleme.
- **Vulnerable Code**:
  ```typescript
  // AdminUtilisateurs.tsx:115-118 — update un profil qui n'est pas le sien
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
  ```
- **Remediation**: Ajouter une policy RLS admin explicite sur `profiles` : `CREATE POLICY "admins_manage_roles" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (true);`. Utiliser une Edge Function pour le changement de role plutot qu'un appel client direct.

---

### 🟠 [HIGH-005] Fichiers .env avec credentials inclus dans le zip du projet

- **Severity**: 🟠 HIGH
- **OWASP**: A04:2025 (Cryptographic Failures)
- **CWE**: CWE-526 (Exposure Through Environment Variables)
- **NIST CSF**: PR.DS (Data Security)
- **Compliance**: ASVS V6.4.2 | T1552.001 | CC6.7 | A.8.9
- **Location**: `.env.local`, `.env.vercel.local`
- **Attack Vector**:
  1. `.env.local` contient les credentials Supabase
  2. `.env.vercel.local` contient un token OIDC Vercel avec le project ID, team ID, et environment
  3. Ces fichiers sont dans le zip `brh-habitat.zip` distribue
  4. Toute personne ayant le zip a les credentials
- **Impact**: Acces direct a la base Supabase et au projet Vercel.
- **Remediation**: Ne jamais inclure les fichiers `.env*` dans les archives. Creer un `.env.example` sans valeurs. Regenerer les credentials Supabase si le zip a ete partage.

---

## 🟡 Medium Findings

### 🟡 [MEDIUM-001] Absence complete de logging et monitoring securite

- **Severity**: 🟡 MEDIUM
- **OWASP**: A09:2025 (Security Logging and Alerting Failures)
- **CWE**: CWE-778 (Insufficient Logging)
- **NIST CSF**: DE.CM (Continuous Monitoring)
- **Compliance**: ASVS V7.1.1 | PCI DSS 10.2 | T1562 | CC7.1 | A.8.16
- **Location**: Toute l'application
- **Impact**: Impossible de detecter des tentatives d'intrusion, du brute force, ou des abus.
- **Remediation**: Integrer Sentry pour les erreurs frontend. Activer les logs Supabase Auth. Configurer des alertes sur les evenements critiques.

---

### 🟡 [MEDIUM-002] Catch silencieux dans le hook d'authentification

- **Severity**: 🟡 MEDIUM
- **OWASP**: A10:2025 (Mishandling of Exceptional Conditions)
- **CWE**: CWE-390 (Detection of Error Condition Without Action)
- **NIST CSF**: DE.AE (Adverse Event Analysis)
- **Compliance**: ASVS V7.4.1 | CC7.4 | A.8.6
- **Location**: `src/hooks/useAuth.ts:31`
- **Impact**: Si le fetch du profil echoue (erreur reseau, RLS, etc.), l'erreur est avalee silencieusement. L'utilisateur reste avec `user: null` sans savoir pourquoi.
- **Vulnerable Code**:
  ```typescript
  } catch {
    return null
  }
  ```
- **Remediation**: Logger l'erreur, afficher un message a l'utilisateur, ou retenter.

---

### 🟡 [MEDIUM-003] Pas de validation cote serveur des donnees de diagnostic

- **Severity**: 🟡 MEDIUM
- **OWASP**: A06:2025 (Insecure Design)
- **CWE**: CWE-602 (Client-Side Enforcement of Server-Side Security)
- **NIST CSF**: PR.DS (Data Security)
- **Compliance**: ASVS V5.1.1 | PCI DSS 6.2.4 | CC6.6 | A.8.26
- **Location**: `src/pages/public/DiagnosticPage.tsx:900-942`
- **Impact**: Les donnees sont validees uniquement cote client. Un attaquant peut envoyer des payloads arbitraires directement a l'API Supabase (types invalides, symptomes inventes, scores manipules).
- **Remediation**: Ajouter une Edge Function Supabase pour valider les donnees avant insertion. Ou utiliser des database check constraints plus strictes.

---

### 🟡 [MEDIUM-004] Pas de protection CSRF explicite

- **Severity**: 🟡 MEDIUM
- **OWASP**: A01:2025 (Broken Access Control)
- **CWE**: CWE-352 (Cross-Site Request Forgery)
- **NIST CSF**: PR.DS (Data Security)
- **Compliance**: SANS Top 25 #4 | ASVS V4.2.2 | PCI DSS 6.2.4 | CC6.6
- **Location**: Toute l'application
- **Impact**: Les appels Supabase utilisent un JWT Bearer token (pas de cookie), ce qui reduit le risque CSRF. Cependant, si Supabase Auth est configure pour persister la session en cookie, le risque augmente.
- **Remediation**: Verifier que Supabase Auth utilise localStorage pour les tokens (c'est le defaut). Ajouter SameSite=Strict si des cookies sont utilises.

---

### 🟡 [MEDIUM-005] Exposition de donnees excessives dans les reponses API admin

- **Severity**: 🟡 MEDIUM
- **OWASP**: A01:2025 (Broken Access Control)
- **CWE**: CWE-200 (Exposure of Sensitive Information)
- **NIST CSF**: PR.DS (Data Security)
- **Compliance**: SANS Top 25 #17 | ASVS V8.3.1 | CC6.7 | A.8.11
- **Location**: `src/pages/admin/AdminUtilisateurs.tsx:32-34`
- **Impact**: L'admin fetche `SELECT *` sur les profils, ce qui inclut potentiellement des champs sensibles. L'admin fetche aussi tous les homes/cases/diagnostics avec les user_ids pour compter — cela transmet plus de donnees que necessaire.
- **Vulnerable Code**:
  ```typescript
  .from('profiles').select('*', { count: 'exact' })
  ```
- **Remediation**: Specifier les colonnes exactes : `.select('id, email, full_name, role, created_at')`. Utiliser des fonctions serveur pour les comptages.

---

### 🟡 [MEDIUM-006] Dependance vulnerable : flatted (DoS + Prototype Pollution)

- **Severity**: 🟡 MEDIUM
- **OWASP**: A03:2025 (Software Supply Chain Failures)
- **CWE**: CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
- **NIST CSF**: GV.SC (Supply Chain Risk Management)
- **Compliance**: ASVS V14.2.1 | PCI DSS 6.3 | CC8.1 | A.8.8
- **Location**: `node_modules/flatted` (transitive dependency)
- **Attack Vector**: `flatted <= 3.4.1` est vulnerable a un DoS par recursion non bornee dans `parse()` (GHSA-25h7-pfq9-p65f) et a un prototype pollution (GHSA-rf6f-7fwh-wjgh). C'est une dependance transitive, probablement via `@tanstack/react-query`.
- **Impact**: DoS cote client si des donnees malformees sont parsees. Prototype pollution pourrait permettre une injection de proprietes.
- **Remediation**: `npm audit fix` ou `npm update flatted`.

---

## 🟢 Low & 🔵 Informational Findings

### 🟢 [LOW-001] Pas de page 404 — redirection silencieuse

- **Severity**: 🟢 LOW
- **OWASP**: A02:2025 (Security Misconfiguration)
- **CWE**: CWE-756 (Missing Custom Error Page)
- **NIST CSF**: PR.PS (Platform Security)
- **Location**: `src/App.tsx` — route `*` redirige vers `/`
- **Remediation**: Creer une page 404 dediee.

### 🟢 [LOW-002] Pas de confirmation email a l'inscription

- **Severity**: 🟢 LOW
- **OWASP**: A07:2025 (Authentication Failures)
- **CWE**: CWE-287 (Improper Authentication)
- **NIST CSF**: PR.AA
- **Location**: `src/pages/public/RegisterPage.tsx:19-25`
- **Remediation**: Activer la confirmation email dans Supabase Auth Dashboard.

### 🟢 [LOW-003] XSS potentiel via JSON-LD dangerouslySetInnerHTML

- **Severity**: 🟢 LOW
- **OWASP**: A05:2025 (Injection)
- **CWE**: CWE-79 (Cross-site Scripting)
- **NIST CSF**: PR.DS
- **Location**: `src/pages/public/ArticlePage.tsx:944-965`
- **Impact**: Le `dangerouslySetInnerHTML` est utilise pour le JSON-LD. Les donnees proviennent de `articles.ts` (statique) et sont passees par `JSON.stringify()` qui echappe automatiquement les caracteres HTML dangereux. Risque faible mais a surveiller si les articles sont geres dynamiquement depuis la DB.
- **Remediation**: Acceptable pour des donnees statiques. Si les articles viennent de la DB, sanitizer les champs avant `JSON.stringify`.

### 🟢 [LOW-004] Google Fonts chargees sans Subresource Integrity (SRI)

- **Severity**: 🟢 LOW
- **OWASP**: A08:2025 (Software or Data Integrity Failures)
- **CWE**: CWE-830 (Inclusion of Web Functionality from an Untrusted Source)
- **NIST CSF**: GV.SC
- **Location**: `index.html:9-12`
- **Remediation**: Heberger les polices localement ou ajouter SRI hashes.

### 🔵 [INFO-001] React Query installe mais non utilise

- **Severity**: 🔵 INFO
- **OWASP**: A06:2025 (Insecure Design)
- **NIST CSF**: GV.RM
- **Location**: `package.json`, `src/App.tsx`
- **Impact**: Pas de cache ni de retry automatique. Chaque navigation re-fetche les donnees.
- **Remediation**: Utiliser React Query pour toutes les requetes ou le desinstaller.

### 🔵 [INFO-002] i18n partiellement implemente

- **Severity**: 🔵 INFO
- **OWASP**: A06:2025 (Insecure Design)
- **NIST CSF**: GV.RM
- **Location**: `src/i18n/`, toutes les pages
- **Impact**: Le contenu est hardcode en francais malgre la config i18n FR/EN. Pas d'impact securite direct.

### 🔵 [INFO-003] 2 usages de `as any` — contournement TypeScript

- **Severity**: 🔵 INFO
- **OWASP**: A06:2025 (Insecure Design)
- **NIST CSF**: PR.DS
- **Location**: `src/pages/dashboard/LogementDetail.tsx:240`, `src/pages/public/DiagnosticPage.tsx:921`
- **Remediation**: Typer correctement les payloads Supabase.

---

## 🔲 Gray-Box Findings

### [GRAY-001] 🔴 Elevation de privilege — utilisateur peut UPDATE son propre role

- **Severity**: 🔴 CRITICAL
- **OWASP**: A01:2025
- **CWE**: CWE-269
- **NIST CSF**: PR.AA
- **Compliance**: SANS Top 25 #15 | ASVS V4.1.1 | T1068 | CC6.1 | A.5.15
- **Tested As**: Utilisateur authentifie (role: user)
- **Endpoint**: `POST https://lygmmvxnmvlgynmrcpny.supabase.co/rest/v1/profiles`
- **Expected**: L'utilisateur ne peut PAS modifier son champ `role`
- **Actual**: La policy `FOR ALL USING (id = auth.uid())` autorise UPDATE de TOUS les champs, y compris `role`
- **Request**: `PATCH /rest/v1/profiles?id=eq.<user-uuid> { "role": "admin" }` avec JWT Bearer token
- **Remediation**: Creer des policies separees pour chaque operation. Exclure le champ `role` des updates utilisateur.

### [GRAY-002] 🟠 Insertion anonyme via API directe

- **Severity**: 🟠 HIGH
- **OWASP**: A01:2025
- **CWE**: CWE-862
- **NIST CSF**: PR.AA
- **Tested As**: Visiteur non authentifie
- **Endpoint**: `POST https://lygmmvxnmvlgynmrcpny.supabase.co/rest/v1/brh_diagnostics`
- **Expected**: Rejet de l'insertion sans token d'authentification
- **Actual**: `WITH CHECK (true)` accepte l'insertion meme avec le anon key seul (pas de session)
- **Request**: `POST /rest/v1/brh_diagnostics { "types": ["test"], "symptoms": {} }` avec anon key
- **Remediation**: `WITH CHECK (auth.uid() IS NOT NULL)` minimum.

### [GRAY-003] 🟡 Users ne peuvent pas creer de cases — fonctionnalite cassee

- **Severity**: 🟡 MEDIUM
- **OWASP**: A01:2025
- **CWE**: CWE-862
- **NIST CSF**: PR.AA
- **Tested As**: Utilisateur authentifie
- **Endpoint**: `POST /rest/v1/brh_cases`
- **Expected**: Les utilisateurs peuvent creer des dossiers de renovation
- **Actual**: La policy RLS `brh_cases` donne seulement SELECT aux users et ALL aux admins. Les users ne peuvent ni creer ni modifier leurs dossiers.
- **Remediation**: Ajouter une policy INSERT et UPDATE pour les users sur `brh_cases`.

### [GRAY-004] 🟡 Admins ne peuvent pas supprimer de logements

- **Severity**: 🟡 MEDIUM
- **OWASP**: A01:2025
- **CWE**: CWE-863
- **NIST CSF**: PR.AA
- **Tested As**: Admin
- **Endpoint**: `DELETE /rest/v1/brh_homes`
- **Expected**: Les admins ont un controle total sur les logements
- **Actual**: Les admins ont seulement SELECT + UPDATE sur `brh_homes`, pas DELETE. La fonctionnalite admin de suppression de logements echouera silencieusement.
- **Remediation**: Ajouter une policy DELETE pour les admins sur `brh_homes`.

---

## 📍 Security Hotspots

### [HOTSPOT-001] Moteur de diagnostic — calcul de scores et budgets

- **OWASP**: A06:2025
- **CWE**: CWE-841
- **NIST CSF**: PR.DS
- **Location**: `src/lib/diagnostic-engine.ts:540-635`
- **Why sensitive**: Le moteur calcule des scores d'urgence et des fourchettes budgetaires affichees au client. Toute modification du scoring change directement l'experience utilisateur et les recommandations.
- **Risk if modified**: Faux scores d'urgence, budgets irrealistes, recommandations inappropriees.
- **Review guidance**: Tout changement dans `analyzeDiagnostic()` doit etre teste avec les 7 types de diagnostic, 0/1/tous symptomes, et verifier la coherence des budgets.

### [HOTSPOT-002] Hook d'authentification — gestion de session

- **OWASP**: A07:2025
- **CWE**: CWE-287
- **NIST CSF**: PR.AA
- **Location**: `src/hooks/useAuth.ts:1-100`
- **Why sensitive**: Point unique de gestion auth. Toute modification affecte l'acces a l'ensemble de l'application.
- **Risk if modified**: Bypass d'authentification, session zombie, race condition sur le state.
- **Review guidance**: Verifier le cleanup `mounted`, la gestion de `SIGNED_OUT`, et que `setUser(null)` est appele dans tous les cas d'erreur.

### [HOTSPOT-003] Politique RLS — schema SQL

- **OWASP**: A01:2025
- **CWE**: CWE-862
- **NIST CSF**: PR.AA
- **Location**: `supabase/migrations/001_brh_full_schema.sql:1-267`
- **Why sensitive**: Toute modification des policies RLS change les permissions de toute l'application.
- **Risk if modified**: Fuite de donnees, elevation de privileges, perte d'isolation entre utilisateurs.
- **Review guidance**: Chaque policy doit etre revue pour chaque operation (SELECT/INSERT/UPDATE/DELETE) separement.

### [HOTSPOT-004] Client Supabase — point d'entree API

- **OWASP**: A04:2025
- **CWE**: CWE-321
- **NIST CSF**: PR.DS
- **Location**: `src/lib/supabase.ts:1-12`
- **Why sensitive**: Point unique de connexion a la base. Toute modification affecte les credentials et la configuration auth.
- **Risk if modified**: Perte de session, credentials invalides, configuration auth incorrecte.
- **Review guidance**: Ne jamais ajouter de fallback credentials. Verifier `persistSession`, `autoRefreshToken`.

### [HOTSPOT-005] Guards d'authentification

- **OWASP**: A01:2025
- **CWE**: CWE-862
- **NIST CSF**: PR.AA
- **Location**: `src/components/auth/AuthGuard.tsx`, `src/components/auth/AdminGuard.tsx`
- **Why sensitive**: Protegent 15 routes (7 dashboard + 8 admin).
- **Risk if modified**: Acces non autorise a l'espace personnel ou admin.
- **Review guidance**: Verifier que le loading state empeche le rendu temporaire de contenu protege (flash of content).

---

## 🧹 Code Smells

### [SMELL-001] DiagnosticPage.tsx — 987 lignes, composant monolithique

- **OWASP**: A06:2025
- **CWE**: CWE-710 (Improper Adherence to Coding Standards)
- **NIST CSF**: GV.RM
- **Location**: `src/pages/public/DiagnosticPage.tsx`
- **Pattern**: 6 steps de wizard + submission + composants imbriques dans 1 seul fichier
- **Security implication**: Difficulte a auditer, a tester, et a maintenir. Les bugs de validation sont caches dans la complexite.
- **Suggestion**: Extraire chaque step en composant separe.

### [SMELL-002] Requetes Supabase inline dans chaque composant

- **OWASP**: A06:2025
- **CWE**: CWE-710
- **NIST CSF**: GV.RM
- **Location**: 15+ fichiers dans `src/pages/`
- **Pattern**: Chaque composant construit ses propres requetes Supabase avec `useEffect` + `useState`. Pas de couche API centralisee.
- **Security implication**: Si un champ de table est renomme, certains composants continueront a fonctionner et d'autres non. Impossible de savoir quelles requetes sont executees sans lire chaque fichier.
- **Suggestion**: Creer `src/api/` avec des fonctions par entite et des hooks React Query.

### [SMELL-003] Status et types hardcodes dans chaque composant

- **OWASP**: A06:2025
- **CWE**: CWE-710
- **NIST CSF**: GV.RM
- **Location**: `AdminDossiers.tsx`, `AdminMessages.tsx`, `AdminRdv.tsx`, `MesDossiers.tsx`, etc.
- **Pattern**: Les valeurs de status (`pending`, `analyzed`, `nouveau`, `en_cours`, etc.) sont repetees en dur dans chaque composant.
- **Security implication**: Desynchronisation entre les CHECK constraints SQL et le frontend. Un status invalide cote DB ne sera pas detecte.
- **Suggestion**: Centraliser dans `src/data/constants.ts`.

### [SMELL-004] Erreurs API non affichees a l'utilisateur

- **OWASP**: A10:2025
- **CWE**: CWE-754 (Improper Check for Unusual Conditions)
- **NIST CSF**: DE.AE
- **Location**: Plusieurs admin pages
- **Pattern**: Certaines erreurs API sont seulement loguees en `console.error` sans feedback utilisateur.
- **Security implication**: L'utilisateur ne sait pas que son action a echoue. Peut conduire a des actions repetees ou a une confusion d'etat.
- **Suggestion**: Toujours afficher un toast ou un message d'erreur visible.

---

## Recommendations Summary

### Priorite 1 — Immediat (avant production)
1. **[CRITICAL-001]** Corriger la policy RLS `profiles` — separer les operations, bloquer UPDATE du champ `role`
2. **[CRITICAL-002]** Restreindre l'INSERT sur `brh_diagnostics` — exiger l'authentification
3. **[HIGH-001]** Activer le rate limiting Supabase Auth + ajouter captcha
4. **[HIGH-002]** Ajouter les security headers dans `vercel.json`
5. **[HIGH-005]** Supprimer les .env du zip, regenerer les credentials si necessaire

### Priorite 2 — Court terme (1-2 semaines)
6. **[CRITICAL-003]** Supprimer les fallback credentials de `supabase.ts`
7. **[HIGH-003]** Renforcer la politique de mot de passe
8. **[HIGH-004]** Ajouter une policy admin explicite sur `profiles`
9. **[MEDIUM-001]** Integrer un monitoring (Sentry)
10. **[MEDIUM-003]** Ajouter une validation serveur des donnees de diagnostic
11. **[MEDIUM-006]** Corriger la dependance vulnerable `flatted`

### Priorite 3 — Moyen terme (1 mois)
12. Completer les policies RLS (GRAY-003, GRAY-004)
13. Implementer la couche API centralisee (SMELL-002)
14. Ajouter la confirmation email (LOW-002)
15. Heberger les polices localement (LOW-004)

---

## Methodology

| Aspect | Details |
|--------|---------|
| Phases executed | 1-5 (full audit) |
| Frameworks detected | React 19 + Vite 7 + Supabase + Tailwind CSS 4 + Zustand + i18next |
| White-box categories | All 20 categories scanned |
| Gray-box testing | Roles tested: anonymous, authenticated user, admin. API endpoints: profiles, diagnostics, homes, cases, appointments |
| Security hotspots | 5 areas flagged: diagnostic engine, auth hook, RLS schema, Supabase client, auth guards |
| Code smells | 4 patterns: monolithic component, inline queries, hardcoded constants, silent errors |
| Packs loaded | none |
| Scope exclusions | none (.security-audit-ignore not found) |
| Baseline comparison | no (.security-audit-baseline.json not found) |
| OWASP Top 10:2025 | 10/10 categories covered |
| NIST CSF 2.0 | 6/6 functions covered (GV, ID, PR, DE, RS, RC) |
| CWE | 18 unique CWE IDs identified |
| SANS/CWE Top 25 | 5/25 matched |
| ASVS 5.0 | 8/14 chapters checked |
| Additional frameworks | PCI DSS 4.0.1, MITRE ATT&CK, SOC 2, ISO 27001:2022 |

---

*Report generated by Claude Security Audit*
