# BRH Habitat — Site Vision

## Stitch Project ID
`6037063388122355367` — BRH Habitat — Portails Partenaires Premium

## Vision
Plateforme SaaS B2B premium pour les agences immobilières partenaires de Bretagne Rénovation Habitat ET les employés terrain BRH.

Style "startup américaine prospection MLM" combinant Stripe Dashboard, Linear Inbox, Pipedrive, Apollo, doTerra/Beachbody. Material Design 3 (Material You).

Ton : luxe sobre + design haut de gamme + simplicité. Pas dark mode obligatoire. Pas de tracking corporate. Vert BRH brand sparing + neutres dominants.

Métier : rénovation énergétique habitat (DPE F/G) en Bretagne. Commerciaux internes BRH font du terrain pour prospecter, vendre, suivre.

## Sitemap (état Stitch)
- [x] dashboard-agence — Inbox du jour Linear-style (2026-05-08)
- [x] leaderboard — Classement Bretagne MLM (2026-05-08)
- [x] arbre-mlm — Visualisation parrainage 5 niveaux (2026-05-08)
- [x] **fiche-client-brh** — Fiche client BRH individuelle (2026-05-19) — screen bcb51b08
- [x] **fiche-adresse-dpe** — Fiche adresse DPE (2026-05-19) — screen 3059fe1c
- [x] **liste-leads** — Liste leads "mes leads" (2026-05-19) — screen e8b951d3
- [ ] **fiche-entreprise** — Fiche entreprise/SCI

## Roadmap (P1 active 2026-05-19)
1. ⭐ Fiche client BRH (priorité 1) — refonte EmployeClientBrhDetail.tsx
2. Fiche adresse DPE (priorité 2) — refonte FicheAdresseView.tsx
3. Liste leads "mes leads" (priorité 3) — refonte ClientsBrhView.tsx + UnifiedLeadsView.tsx
4. Fiche entreprise/SCI (priorité 4) — refonte FicheEntrepriseView.tsx

## Contexte données (2026-05-19)
- 16 607 contacts BRH historiques (Bretagne) avec tier gold/silver/bronze/none
- 59 306 DPE F/G prioritaires
- 2 713 mutations DVF liées par adresse stricte (numéro+voie+CP exact)
- 1 355 profils psy IA strict BRH-only (re-générés sans hallucination)
- 0 OSINT externe affiché (purgé après faux positifs massifs)
- Édition employé terrain disponible : notes, intérêt commercial, travaux, créneau dispo

## Pages existantes React (à refondre avec Stitch)
- `src/components/leads/ClientsBrhView.tsx` (liste clients BRH)
- `src/pages/employe/EmployeClientBrhDetail.tsx` (fiche client individuelle)
- `src/components/leads/fiche/FicheAdresseView.tsx` (fiche adresse DPE)
- `src/components/leads/fiche/FicheEntrepriseView.tsx` (fiche SCI)
- `src/components/leads/UnifiedLeadsView.tsx` (liste unifiée)

## Creative Freedom (idées si roadmap vide)
- Vue carte des leads avec heatmap par tier
- Page "Tournée du jour" optimisée GPS pour commerciaux terrain
- Vue parcours client (timeline RDV + visites + factures)
