# Karpathy Pattern Setup — BRH Habitat

> Règles d'installation et de maintenance de cette wiki. Inspiré du [Gist Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) (avril 2026).

## Principe fondamental

Une **LLM Wiki** = source de vérité markdown, auto-mise-à-jour, lue AVANT chaque modification, mise à jour APRÈS. Remplace partiellement le RAG : au lieu d'indexer du code, on construit un corpus de documents **compactés, curés, à jour**.

**Différence clé vs documentation classique** : la wiki est faite PAR Claude POUR Claude (et accessoirement Philippe). Elle privilégie les faits vérifiables, les pointeurs précis, les décisions justifiées.

## Emplacement

- **Wiki source** : [`docs/wiki/`](./) (dans le repo, versionné)
- **Chemin absolu** : `/Users/philippegagnon/Desktop/brh-habitat/brh-habitat/docs/wiki/`
- **Entrée obligatoire** : [index.md](index.md)

**Différence vs BRHCRM** : BRHCRM a son wiki en dehors du repo (`/Desktop/axonaut-audit/report/`) avec symlink. BRH Habitat a son wiki directement dans le repo — versionné avec le code, plus simple.

## Protocole AVANT toute modification

1. **Lire [index.md](index.md)** (catalogue complet)
2. **Identifier 1-3 pages pertinentes** pour la tâche
3. **Lire ces pages** (contexte minimal nécessaire)
4. **Vérifier absence de contradiction** entre la tâche et la wiki
5. **Si contradiction** → clarifier avec Philippe AVANT d'agir

### Exemples de mapping tâche → pages à lire

| Tâche | Pages à lire |
|-------|--------------|
| Ajouter un champ à `brh_quotes` | data-model.md + migrations-audit.md + partner-platform.md |
| Créer une nouvelle Edge Function | edge-functions-reference.md (patterns) + karpathy-pattern-setup.md |
| Modifier le calcul de commission | partner-platform.md + data-model.md (triggers) |
| Ajouter un portail / guard | architecture-snapshot.md + tenant-multitenancy.md |
| Corriger un bug RLS | data-model.md + migrations-audit.md |
| Ajouter une feature au tier enterprise | tenant-multitenancy.md + hooks-reference.md |

## Protocole APRÈS toute modification

1. **Mettre à jour les pages wiki impactées** (factuellement, avec chiffres réels)
2. **Ajouter une entrée dans [log.md](log.md)** au format :
   ```markdown
   ## {YYYY-MM-DD} — {titre court}
   - **Contexte** : {pourquoi cette modif}
   - **Fichiers modifiés** : {liste}
   - **Migrations créées** : {si applicable}
   - **Pages wiki impactées** : {liste}
   - **Risque** : {None / Low / Medium / High}
   - **Tests** : {résultat manuel / automatisé}
   - **Status** : {✅ DONE / 🟡 PARTIEL / 🔴 BLOQUÉ}
   ```
3. **Si blueprint** → mettre à jour le statut de la tâche

## Interdictions

- ❌ **JAMAIS modifier le code** sans avoir lu la wiki
- ❌ **JAMAIS supprimer/renommer une page wiki** sans justification dans log.md
- ❌ **JAMAIS créer de page hors catégories** définies dans index.md
- ❌ **JAMAIS push/deploy** sans accord explicite de Philippe (règle globale hook PreToolUse)
- ❌ **JAMAIS de chiffres périmés** — toujours re-mesurer avant de rédiger (ex: nombre de pages, LOC, migrations)
- ❌ **JAMAIS de secrets / credentials** dans la wiki (`.env` uniquement)

## Structure des pages

Chaque page suit cette structure minimale :

```markdown
# {Titre de la page}

> Source : {chemin ou référence}
> Dernière mesure : {YYYY-MM-DD}
> Rôle : {1 ligne — à quoi sert cette page}

## {Sections par sujet}

...

## Statut d'implémentation
- ✅ {ce qui est fait}
- 🟡 {ce qui est partiel}
- 🔴 {ce qui reste à faire}

## Mises à jour de cette page
- **{date}** : {description modif}
```

## Maintenance

### Pages à re-mesurer régulièrement (chiffres peuvent dériver)
- [architecture-snapshot.md](architecture-snapshot.md) : pages, composants, routes, LOC, score santé
- [migrations-audit.md](migrations-audit.md) : nombre de migrations
- [edge-functions-reference.md](edge-functions-reference.md) : nombre d'EFs
- [hooks-reference.md](hooks-reference.md) : nombre de hooks, d'API modules
- [data-model.md](data-model.md) : nombre de tables

### Commande de ré-audit rapide
```bash
cd /Users/philippegagnon/Desktop/brh-habitat/brh-habitat

echo "Pages:" && find src/pages -name "*.tsx" -type f | wc -l
echo "Composants:" && find src/components -name "*.tsx" -type f | wc -l
echo "Hooks:" && find src/hooks -name "*.ts" -type f | wc -l
echo "Migrations:" && ls supabase/migrations/*.sql | wc -l
echo "Edge Functions:" && ls -d supabase/functions/*/ | grep -v _shared | wc -l
echo "API modules:" && ls src/api/ | wc -l
echo "Routes:" && grep -c "path=" src/App.tsx
```

## Évolution de la wiki

- Ne pas hésiter à **fusionner** deux pages trop proches
- Ne pas hésiter à **splitter** une page > 500 lignes
- Ajouter une page **guide-{feature}.md** dès qu'une feature majeure devient complexe (>2 tables, >1 EF, >3 hooks)
- Retirer les pages obsolètes → déplacer vers `archive/` (sous-dossier) avec note dans log.md

## Références

- Gist Karpathy original : https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Article VentureBeat (avril 2026) : https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an
- Wiki BRHCRM (autre projet Philippe) : `/Users/philippegagnon/Desktop/axonaut-audit/report/`

## Mises à jour de cette page

- **2026-04-23** : Création du pattern Karpathy pour BRH Habitat.
