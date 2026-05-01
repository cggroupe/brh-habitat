# BRH Habitat — Carnet Santé Habitat

> Source : migration `20260326150000_health_carnet` + `src/api/` (health-records, work-history, home-documents) + `src/components/carnet/`.
> **Dernière mesure** : 2026-04-23.

## Vue d'ensemble

Feature signature de BRH Habitat : chaque particulier a un **"carnet de santé"** de son logement, suivant l'état des différents domaines (toiture, électricité, isolation, VMC, plomberie, menuiseries, chauffage) avec score santé et rappels de maintenance.

**Analogie** : comme un carnet de santé médical, mais pour la maison.

## Tables

### `brh_health_records`
Score santé par domaine du logement.

```
id                UUID PK
home_id           UUID → brh_homes
domain            TEXT ('toiture' | 'electricite' | 'isolation' | 'vmc' | 'plomberie' | 'menuiserie' | 'chauffage')
score             INTEGER 0-100
last_check_date   DATE
next_check_date   DATE
notes             TEXT
created_at, updated_at  TIMESTAMPTZ

UNIQUE (home_id, domain)
```

### `brh_work_history`
Historique des travaux réalisés sur le logement.

```
id           UUID PK
home_id      UUID → brh_homes
type         TEXT (nature du travail : 'remplacement_vmc', 'isolation_combles', etc.)
domain       TEXT (référence les domains de health_records)
date         DATE
cost_cents   INTEGER (coût INTEGER cents)
contractor   TEXT (entreprise qui a réalisé)
description  TEXT
created_at, updated_at TIMESTAMPTZ
```

### `brh_home_documents`
Documents attachés (factures, contrats, photos avant/après, plans).

```
id            UUID PK
home_id       UUID → brh_homes
file_path     TEXT (chemin bucket home-documents)
file_name     TEXT (original)
mime_type     TEXT
size          INTEGER (bytes)
category      TEXT ('facture' | 'contrat' | 'plan' | 'photo' | 'autre')
domain        TEXT? (lien avec health_record)
uploaded_at   TIMESTAMPTZ
uploaded_by   UUID → profiles
```

## Storage bucket `home-documents`

- **Scope** : `{user_id}/{home_id}/*`
- **Policy** : `(storage.foldername(name))[1] = auth.uid()::text`
- **Limite taille** : ~10MB par fichier (config à vérifier)
- **MIME acceptés** : PDF, images (JPEG, PNG, WebP), Office (facultatif)

## Composants

### `components/carnet/` (4 composants)

- `HealthScoreGauge.tsx` — Jauge circulaire du score global (0-100)
- `HealthOverview.tsx` — Vue d'ensemble des 7 domaines avec scores
- `HealthDomainCard.tsx` — Carte d'un domaine (score, dernière vérif, prochaine vérif, notes)
- `DocumentsList.tsx` — Liste des documents attachés + upload

### Calcul score global
```typescript
// Moyenne pondérée des scores par domaine
const weights = {
  toiture: 20,      // critique
  electricite: 20,  // critique
  isolation: 15,
  vmc: 10,
  plomberie: 15,
  menuiserie: 10,
  chauffage: 10,
}
const globalScore = sumOf(score[domain] * weights[domain]) / sum(weights)
```

## API

### `api/health-records.ts`
```typescript
{
  list(homeId): HealthRecord[]
  upsert(homeId, domain, data): HealthRecord
  remove(id)
}
```

### `api/work-history.ts`
```typescript
{
  listByHome(homeId): WorkHistory[]
  create(input): WorkHistory
  update(id, input): WorkHistory
  remove(id)
}
```

### `api/home-documents.ts`
```typescript
{
  listByHome(homeId): HomeDocument[]
  upload(homeId, file, category): HomeDocument  // handle storage + DB
  remove(id): void  // handle storage + DB
  getDownloadUrl(id): string
}
```

## Hooks

`hooks/queries/health.ts` agrège les 3 APIs :

```typescript
useHealthRecords(homeId)
useWorkHistory(homeId)
useHomeDocuments(homeId)
useUpsertHealthRecord()
useCreateWorkHistory()
useUploadDocument()
useDeleteDocument()
```

**staleTime** : 5 min (ressource user-centric, peu volatile).

**Invalidations** :
- `upsertHealthRecord` → `['health', homeId]` + `['dashboard', 'stats']`
- `createWorkHistory` → `['health', homeId]` + `['dashboard', 'stats']`
- `uploadDocument` → `['home-documents', homeId]`

## Pages

### `/tableau-de-bord/logements/:id/carnet`
Vue complète du carnet santé d'un logement :
- `HealthScoreGauge` en header (score global)
- Grille de `HealthDomainCard` (7 domaines)
- Section `WorkHistoryList` (timeline)
- Section `DocumentsList` (upload + liste)

### Admin : `/admin/logements/:id`
Vue admin : même infos + capacité edit.

## Pattern d'upload document

```typescript
const uploadDocument = useMutation({
  mutationFn: async ({ homeId, file, category }) => {
    // 1. Upload au bucket
    const path = `${userId}/${homeId}/${Date.now()}-${file.name}`
    const { error: uploadErr } = await supabase.storage
      .from('home-documents').upload(path, file)
    if (uploadErr) throw uploadErr

    // 2. Insert en DB
    const { data, error } = await supabase.from('brh_home_documents').insert({
      home_id: homeId,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size: file.size,
      category,
    }).select().single()
    if (error) throw error
    return HomeDocumentSchema.parse(data)
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['home-documents'] })
  },
  onError: (err) => logError(err, { context: 'uploadDocument' }),
})
```

## Sécurité

### RLS
- `brh_health_records` : `home_id IN (SELECT id FROM brh_homes WHERE user_id = auth.uid())`
- `brh_work_history` : idem
- `brh_home_documents` : idem + admin bypass (via `is_admin()`)

### Storage
- Upload : user authentifié, scope user_id
- Download : URL signée avec expiration (15 min)
- Suppression : DB + storage atomique (transaction côté app)

## Intégration partenaires

Quand un pro (partenaire) réalise des travaux sur le logement d'un client BRH :
1. Pro crée prospect → devis → quote signed
2. Après réalisation : insert `brh_work_history` (lien `quote_id` ?)
3. Upload facture + photos dans `brh_home_documents`
4. MAJ `brh_health_records[domain].score` (auto-recalcul ou manual)

**Prévu V2** : trigger auto-insert `brh_work_history` quand quote marquée "terminée".

## Statut d'implémentation

- ✅ Migration `20260326150000_health_carnet` appliquée
- ✅ Migration `20260326160000_storage_documents` (bucket home-documents)
- ✅ Migration `20260414200000_audit_v6_fixes` (storage scopé par user_id)
- ✅ API + hooks en place
- ✅ Composants `components/carnet/` opérationnels
- ✅ Page carnet par logement
- 🟡 Intégration auto avec `brh_quotes` (ajout work_history) : à implémenter
- 🟡 Export PDF carnet santé : prévu mais non implémenté

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy).
