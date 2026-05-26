import { describe, expect, it } from 'vitest'
import { profileBack, profileBasePath } from './nav'

describe('profileBack', () => {
  it("retourne /employe/leads pour le profil employe", () => {
    expect(profileBack('employe')).toBe('/employe/leads')
  })
  it("retourne /agence/leads pour le profil agence (et défaut)", () => {
    expect(profileBack('agence')).toBe('/agence/leads')
  })
  it("retourne /artisan/leads pour le profil artisan", () => {
    expect(profileBack('artisan')).toBe('/artisan/leads')
  })
  it("retourne /notaire/leads pour le profil notaire", () => {
    expect(profileBack('notaire')).toBe('/notaire/leads')
  })
})

describe('profileBasePath', () => {
  it("est identique à profileBack (même structure de routes)", () => {
    expect(profileBasePath('employe')).toBe(profileBack('employe'))
    expect(profileBasePath('agence')).toBe(profileBack('agence'))
    expect(profileBasePath('artisan')).toBe(profileBack('artisan'))
    expect(profileBasePath('notaire')).toBe(profileBack('notaire'))
  })
})
