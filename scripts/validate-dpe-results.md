# Validation P2.5 — Moteur BRH vs Open Data ADEME

> Comparaison sur **99 DPE 3CL réels** (zone H2a, données ADEME).
> Date : 2026-05-01 | Cible : ±5% | Acceptable V1 : ±30%

---

## Résumé exécutif

| Métrique | Moyenne | Médiane | Min | Max | P90 |
|---|---|---|---|---|---|
| **Écart CEP** (%) | 338.44 | 283.21 | 36.81 | 1104 | 687.25 |
| **Écart GES** (%) | 240.19 | 206.02 | 1.4 | 874.99 | 509.37 |
| **Écart étiquette DPE** (classes) | 2.72 | 3 | 0 | 5 | 4 |

## Tolérances atteintes

| Tolérance | CEP | % |
|---|---|---|
| ±5% | 0/99 | 0% |
| ±15% | 0/99 | 0% |
| ±30% | 0/99 | 0% |

| Étiquette finale | Cas | % |
|---|---|---|
| **Identique** (Δ=0) | 4/99 | 4% |
| **±1 classe** | 14/99 | 14% |

## Distribution des écarts d'étiquette

| Δ classe | Cas | Interprétation |
|---|---|---|
| 0 | 4 | ✅ Identique |
| +1 | 10 | BRH plus pessimiste de 1 classe(s) |
| +2 | 25 | BRH plus pessimiste de 2 classe(s) |
| +3 | 37 | BRH plus pessimiste de 3 classe(s) |
| +4 | 17 | BRH plus pessimiste de 4 classe(s) |
| +5 | 6 | BRH plus pessimiste de 5 classe(s) |

## Top 10 cas les plus précis (CEP)

| # | Type | Surface | Énergie | ADEME CEP | BRH CEP | Δ% | Étiq ADEME→BRH |
|---|---|---|---|---|---|---|---|
| 1 | maison | 65.8m² | Gaz naturel | 162 | 222 | 36.8% | D→D |
| 2 | maison | 77.3m² | Électricité | 88 | 131 | 48.8% | B→C |
| 3 | maison | 73.8m² | Gaz naturel | 169 | 264 | 56.1% | D→E |
| 4 | maison | 67.5m² | Électricité | 92 | 147 | 59.4% | B→C |
| 5 | maison | 109.9m² | Gaz naturel | 113 | 191 | 68.8% | C→D |
| 6 | maison | 92m² | Gaz naturel | 142.3 | 243 | 71.1% | C→E |
| 7 | maison | 92m² | Fioul domestiqu | 376 | 710 | 88.8% | G→G |
| 8 | maison | 72.4m² | Gaz naturel | 196 | 381 | 94.2% | D→F |
| 9 | maison | 53.9m² | Électricité | 183.8 | 370 | 101.5% | D→F |
| 10 | maison | 48m² | Électricité | 101.6 | 205 | 102.2% | B→D |

## Top 10 cas les plus déviants (CEP)

| # | Type | Surface | Énergie | ADEME CEP | BRH CEP | Δ% | Étiq ADEME→BRH |
|---|---|---|---|---|---|---|---|
| 1 | maison | 70m² | Gaz naturel | 132 | 1589 | 1104.0% | C→G |
| 2 | maison | 65.1m² | Électricité | 110.1 | 1132 | 928.4% | C→G |
| 3 | maison | 67.1m² | Électricité | 241 | 2412 | 900.7% | D→G |
| 4 | maison | 90.7m² | Gaz naturel | 209.2 | 1954 | 833.8% | D→G |
| 5 | maison | 72.8m² | Électricité | 253 | 2179 | 761.2% | E→G |
| 6 | maison | 65.9m² | Électricité | 214 | 1842 | 761.0% | D→G |
| 7 | maison | 169.4m² | Gaz naturel | 123 | 1054 | 757.3% | C→G |
| 8 | maison | 79.1m² | Gaz naturel | 96.1 | 811 | 744.1% | C→G |
| 9 | maison | 94m² | GPL | 150 | 1226 | 717.1% | D→G |
| 10 | maison | 53m² | Électricité | 127 | 1000 | 687.3% | C→G |

## Verdict V1

🟠 **Précision V1 limitée** (heuristiques de mapping inputs incomplètes). Étiquettes correctes à ±1 classe sur 14% des cas, ce qui est exploitable pour un classement DPE indicatif.

### Sources d'écart identifiées (à corriger Phase 3+)

1. **Surfaces parois calculées par heuristique** : 4 × √Sh × Hsp × 0.85 — surestime/sous-estime selon géométrie réelle
2. **Matériau gros œuvre = parpaing par défaut** : R(gros œuvre) imprécis, surtout pour pierre/brique pleine/bois
3. **Année installation chauffage = 2010 forfait** : SCOP/Rg dépendent de l'année exacte
4. **Ponts thermiques en forfait 5-12%** vs lookup ψ × L détaillé CapRénov+ (écart typique ±5%)
5. **Tables ψ menuiseries non implémentées** (V1 forfait dans ponts thermiques)
6. **Pertes générateur (Qp0/Qp30/Qp50/Qp100)** non détaillées en V1
7. **DH et ECh** : utilisés depuis JSON 3CL, mais influence forte sur résultat final
