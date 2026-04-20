# Scripts utilitaires

## capture-screenshots.ts

Capture automatique des 36 pages du site pour la présentation.

### Setup (1 seule fois)

```bash
npm install -D playwright tsx dotenv
npx playwright install chromium
```

### Config

1. Copier l'exemple :
   ```bash
   cp scripts/env.screenshots.example.txt scripts/.env.screenshots
   ```
2. Éditer `scripts/.env.screenshots` avec les vraies credentials :
   - `BASE_URL` : URL du site (par défaut `https://brh-habitat.vercel.app`)
   - 3 paires `EMAIL` + `PASSWORD` pour les comptes admin / pro / particulier

### Exécution

```bash
npm run screenshots
```

Les fichiers `.png` sont générés dans `/screenshots/` à la racine du projet.

### Structure

- **6 pages publiques** (pas de login)
- **4 pages client** (compte particulier sur dashboard client)
- **5 pages admin**
- **10 pages pro**
- **11 pages particulier affilié**

Total : **36 screenshots** en environ 3 minutes.

### Dépannage

- Erreur login → vérifier que les comptes existent en prod et que les rôles sont corrects
- Erreur "selector not found" → le formulaire de login a peut-être changé, ajuster les sélecteurs dans `login()`
- Pages lentes → augmenter `timeout: 30_000` dans `capture()`
