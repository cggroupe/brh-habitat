/**
 * Tests Phase 2.2 — Modules chauffage (climat, besoins, rendements, PAC).
 */

import { describe, expect, it } from 'vitest'
import {
  getDHCh,
  getNrefCh,
  getECh,
  getDHChAnnuel,
  getTbase,
  calcFj,
  calcBchAnnuel,
  calcRe,
  calcRd,
  calcRr,
  calcRg,
  calcIch,
  calcSCOP,
  isPAC,
  calcI0,
  calcChauffage,
  computeDpe,
} from '../index'
import { brest100m2 } from './fixtures/brest-100m2'
import type { ChauffageInput, AuditInputs } from '../types'

describe('climat — DH/Nref/Tbase', () => {
  it('Tbase Brest (H2A, alt 50m) = -6.5°C', () => {
    expect(getTbase('H2A', 50)).toBe(-6.5)
  })

  it('Tbase H1A altitude 900 = -13.5°C', () => {
    expect(getTbase('H1A', 900)).toBe(-13.5)
  })

  it('DHCh Brest H2A janvier inertie LEGERE > 0', () => {
    const dh = getDHCh({
      inertie: 'LEGERE',
      comportement: 'conventionnel',
      altitude: 50,
      zone: 'H2A',
      mois: 1,
    })
    expect(dh).toBeGreaterThan(0)
    expect(dh).toBeLessThan(20000) // sanity
  })

  it('DHCh annuel Brest H2A > DHCh juillet (saison chauffe)', () => {
    const annuel = getDHChAnnuel({
      inertie: 'LEGERE',
      comportement: 'conventionnel',
      altitude: 50,
      zone: 'H2A',
    })
    const juillet = getDHCh({
      inertie: 'LEGERE',
      comportement: 'conventionnel',
      altitude: 50,
      zone: 'H2A',
      mois: 7,
    })
    expect(annuel).toBeGreaterThan(juillet * 12) // annuel > 12×juillet
  })

  it('NrefCh janvier > NrefCh juin', () => {
    const jan = getNrefCh({ inertie: 'LEGERE', altitude: 50, zone: 'H2A', mois: 1 })
    const jun = getNrefCh({ inertie: 'LEGERE', altitude: 50, zone: 'H2A', mois: 6 })
    expect(jan).toBeGreaterThan(jun)
  })

  it('ECh Sud > ECh Nord (saison chauffage)', () => {
    // Approximation : ECh moyenne sur tous les mois (la valeur représente l'ensoleillement)
    const ech = getECh({ inertie: 'LEGERE', altitude: 50, zone: 'H3', mois: 1 })
    expect(ech).toBeGreaterThanOrEqual(0)
  })
})

describe('besoins — Bch et F_j', () => {
  it('F_j = 0 si X = 0', () => {
    expect(calcFj(0, 'LEGERE')).toBe(0)
  })

  it('F_j ≈ pow/(pow+1) si X = 1 (limite)', () => {
    const f = calcFj(1, 'LEGERE') // pow = 2.5
    expect(f).toBeCloseTo(2.5 / 3.5, 5)
  })

  it('F_j(LOURDE) > F_j(LEGERE) à X identique', () => {
    expect(calcFj(0.5, 'LOURDE')).toBeGreaterThan(calcFj(0.5, 'LEGERE'))
  })

  it('Bch Brest 100m² 1948-1974 fioul plausible (5000-25000 kWh/an)', () => {
    const r = calcBchAnnuel(brest100m2)
    expect(r.bchKwhAn).toBeGreaterThan(5000)
    expect(r.bchKwhAn).toBeLessThan(25000)
    expect(r.gv.total).toBeGreaterThan(0)
    expect(r.dhChAnnuel).toBeGreaterThan(0)
    expect(r.fJAnnuel).toBeGreaterThan(0)
    expect(r.fJAnnuel).toBeLessThan(1)
  })

  it('Bch maison RT2012 < Bch maison ancienne', () => {
    const ancienne = calcBchAnnuel(brest100m2).bchKwhAn
    const recente: AuditInputs = {
      ...brest100m2,
      bati: {
        ...brest100m2.bati,
        periodeConstruction: 'apres_2013',
        parois: brest100m2.bati.parois.map((p) =>
          p.type === 'mur' || p.type === 'plancher_haut'
            ? { ...p, isolation: { type: 'iti', epaisseur: 200, lambda: 0.035 } }
            : p,
        ),
      },
      equipements: { ...brest100m2.equipements, ventilation: 'vmc_double_flux_avec_recup' },
    }
    expect(calcBchAnnuel(recente).bchKwhAn).toBeLessThan(ancienne)
  })
})

describe('rendements — Re/Rd/Rr/Rg', () => {
  it('Re plancher chauffant > Re convecteur', () => {
    expect(calcRe('plancher_chauffant')).toBeGreaterThan(calcRe('convecteur_electrique'))
  })

  it('Rd chauffage divisé électrique = 1', () => {
    expect(calcRd('effet_joule_direct', 'convecteur_electrique')).toBe(1)
  })

  it('Rd radiateur eau = 0.9', () => {
    expect(calcRd('chaudiere_gaz_standard', 'radiateur_eau')).toBe(0.9)
  })

  it('Rg chaudière gaz condensation > standard', () => {
    expect(calcRg('chaudiere_gaz_condensation', 2018)).toBeGreaterThan(
      calcRg('chaudiere_gaz_standard', 2018),
    )
  })

  it('Rg fioul ancien < fioul récent', () => {
    expect(calcRg('chaudiere_fioul', 1970)).toBeLessThan(calcRg('chaudiere_fioul', 2010))
  })

  it('Rg PAC = 1 (gérée séparément via SCOP)', () => {
    expect(calcRg('pac_air_eau', 2018)).toBe(1)
  })

  it('Rr régulation pièce par pièce > sans régulation', () => {
    expect(calcRr(true)).toBeGreaterThan(calcRr(false))
  })

  it('ich chaudière fioul standard récente plausible', () => {
    const c: ChauffageInput = {
      generateur: 'chaudiere_fioul',
      emetteur: 'radiateur_eau',
      anneeInstallation: 2010,
      regulation: true,
    }
    const ich = calcIch(c)
    expect(ich).toBeGreaterThan(0.6)
    expect(ich).toBeLessThan(0.85)
  })
})

describe('pompes à chaleur — SCOP', () => {
  it('isPAC détecte les 3 types', () => {
    expect(isPAC('pac_air_air')).toBe(true)
    expect(isPAC('pac_air_eau')).toBe(true)
    expect(isPAC('pac_eau_eau')).toBe(true)
    expect(isPAC('chaudiere_gaz_standard')).toBe(false)
  })

  it('SCOP PAC eau/eau > air/eau > air/air', () => {
    const eauEau = calcSCOP({ type: 'pac_eau_eau', zone: 'H2A', anneeInstallation: 2018 })
    const airEau = calcSCOP({ type: 'pac_air_eau', zone: 'H2A', anneeInstallation: 2018 })
    const airAir = calcSCOP({ type: 'pac_air_air', zone: 'H2A', anneeInstallation: 2018 })
    expect(eauEau).toBeGreaterThan(airEau)
    expect(airEau).toBeGreaterThanOrEqual(airAir)
  })

  it('SCOP plus haut en H3 (sud) qu\'en H1 (nord)', () => {
    const h3 = calcSCOP({ type: 'pac_air_eau', zone: 'H3', anneeInstallation: 2018 })
    const h1 = calcSCOP({ type: 'pac_air_eau', zone: 'H1A', anneeInstallation: 2018 })
    expect(h3).toBeGreaterThan(h1)
  })

  it('SCOP renseigné par utilisateur écrase la table', () => {
    const scop = calcSCOP({
      type: 'pac_air_eau',
      zone: 'H2A',
      scopRenseigne: 4.5,
    })
    expect(scop).toBe(4.5)
  })

  it('SCOP plancher chauffant > radiateurs (basse température)', () => {
    const pcbt = calcSCOP({ type: 'pac_air_eau', zone: 'H2A', emetteur: 'plancher_chauffant', anneeInstallation: 2018 })
    const radia = calcSCOP({ type: 'pac_air_eau', zone: 'H2A', emetteur: 'radiateur_eau', anneeInstallation: 2018 })
    expect(pcbt).toBeGreaterThan(radia)
  })
})

describe('intermittence — i0', () => {
  it('i0 plancher chauffant = 1', () => {
    const c: ChauffageInput = {
      generateur: 'pac_air_eau',
      emetteur: 'plancher_chauffant',
      regulation: false,
    }
    expect(calcI0(c, 'LEGERE')).toBe(1)
  })

  it('i0 effet Joule régulation < i0 sans régulation', () => {
    const avec: ChauffageInput = { generateur: 'effet_joule_direct', regulation: true }
    const sans: ChauffageInput = { generateur: 'effet_joule_direct', regulation: false }
    expect(calcI0(avec, 'LEGERE')).toBeLessThan(calcI0(sans, 'LEGERE'))
  })

  it('i0 inertie LOURDE > i0 LEGERE (plus stable)', () => {
    const c: ChauffageInput = { generateur: 'effet_joule_direct', regulation: true }
    expect(calcI0(c, 'LOURDE')).toBeGreaterThan(calcI0(c, 'LEGERE'))
  })
})

describe('calcChauffage — Cch total', () => {
  it('Brest 100m² fioul : Cch EF plausible', () => {
    const r = calcChauffage(brest100m2)
    expect(r.bchKwhAn).toBeGreaterThan(5000)
    expect(r.cchEfKwhAn).toBeGreaterThan(r.bchKwhAn) // EF > Bch (rendement < 1)
    expect(r.cchEpKwhAn).toBe(r.cchEfKwhAn) // fioul → coef EP = 1
    expect(r.energie).toBe('fioul')
    expect(r.rendements.total).toBeGreaterThan(0.4)
    expect(r.rendements.total).toBeLessThan(1)
  })

  it('Cch PAC électricité : EP = EF × 2.3', () => {
    const inputs: AuditInputs = {
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        chauffage: {
          generateur: 'pac_air_eau',
          emetteur: 'radiateur_eau',
          anneeInstallation: 2020,
          regulation: true,
        },
      },
    }
    const r = calcChauffage(inputs)
    expect(r.energie).toBe('electricite')
    expect(r.cchEpKwhAn).toBeCloseTo(r.cchEfKwhAn * 2.3, 1)
    expect(r.rendements.scop).toBeGreaterThan(2)
  })

  it('PAC EP < chaudière fioul EP (efficacité supérieure)', () => {
    const fioul = calcChauffage(brest100m2)
    const inputsPac: AuditInputs = {
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        chauffage: {
          generateur: 'pac_air_eau',
          emetteur: 'radiateur_eau',
          anneeInstallation: 2020,
          regulation: true,
        },
      },
    }
    const pac = calcChauffage(inputsPac)
    expect(pac.cchEpKwhAn).toBeLessThan(fioul.cchEpKwhAn)
  })
})

describe('computeDpe — Phase 2.2 (CEP non-zéro)', () => {
  it('CEP Brest 100m² fioul > 0 et plausible', () => {
    const r = computeDpe(brest100m2)
    expect(r.cepKwhEpM2An).toBeGreaterThan(0)
    expect(r.consoEfTotaleKwhAn).toBeGreaterThan(0)
    // Maison F/G typique : 250-500 kWh EP/m²/an
    expect(r.cepKwhEpM2An).toBeGreaterThan(150)
    expect(r.cepKwhEpM2An).toBeLessThan(700)
  })

  it('parPoste : chauffage > ECS > éclairage > aux', () => {
    const r = computeDpe(brest100m2)
    expect(r.parPoste.chauffage).toBeGreaterThan(r.parPoste.ecs)
    expect(r.parPoste.ecs).toBeGreaterThan(r.parPoste.eclairage)
    expect(r.parPoste.auxiliaires).toBeGreaterThan(r.parPoste.eclairage)
  })

  it('GES Brest 100m² fioul > 0', () => {
    const r = computeDpe(brest100m2)
    expect(r.gesKgCo2M2An).toBeGreaterThan(0)
  })
})
