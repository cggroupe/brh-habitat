/**
 * Cas test fumée : maison Brest 100 m² Phase 1
 *
 * Inputs minimaux pour valider que le pipeline computeDpe tourne sans crash.
 * Les valeurs sont approximatives — la précision viendra en Phase 2.
 */

import type { AuditInputs } from '../../types'

export const brest100m2: AuditInputs = {
  geo: {
    codeInsee: '29019', // Brest
    altitude: 50,
  },
  bati: {
    surfaceHabitable: 100,
    volume: 250,
    hauteurSousPlafond: 2.5,
    nombreNiveaux: 1,
    periodeConstruction: '1948-1974',
    inertie: 'moyenne',
    typeBatiment: 'maison',
    parois: [
      {
        type: 'mur',
        surface: 80,
        orientation: 'sud',
        adjacence: 'exterieur',
        materiau: 'pierre',
        isolation: { type: 'iti', epaisseur: 60, lambda: 0.040, annee: 1985 },
      },
      {
        type: 'plancher_bas',
        surface: 100,
        adjacence: 'sous_sol_non_chauffe',
        isolation: { type: 'sans' },
      },
      {
        type: 'plancher_haut',
        surface: 100,
        adjacence: 'combles_perdus',
        isolation: { type: 'iti', epaisseur: 200, lambda: 0.040 },
      },
    ],
    ouvertures: [
      {
        type: 'fenetre',
        surface: 8,
        orientation: 'sud',
        menuiserie: 'pvc',
        vitrage: 'double',
      },
      {
        type: 'fenetre',
        surface: 4,
        orientation: 'nord',
        menuiserie: 'pvc',
        vitrage: 'double',
      },
      {
        type: 'porte',
        surface: 2,
        orientation: 'est',
        menuiserie: 'bois',
      },
    ],
    pontsThermiques: [],
  },
  equipements: {
    chauffage: {
      generateur: 'chaudiere_fioul',
      emetteur: 'radiateur_eau',
      energie: 'fioul',
      anneeInstallation: 2005,
      regulation: true,
    },
    ecs: {
      generateur: 'electrique',
      stockageL: 200,
      energie: 'electricite',
      anneeInstallation: 2010,
    },
    ventilation: 'naturelle',
  },
  comportement: 'conventionnel',
  foyer: {
    nbAdultes: 2,
    nbEnfants: 2,
  },
}
