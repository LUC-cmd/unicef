import { describe, it, expect } from 'vitest'
import { lireCycle, lireGrossesse, niveauAgeMere, lireNouveauNe, lireEnfantMalade, lireSignesGrossesse, ajouterJours, ecartJours } from './adolescente.js'

describe('cycle', () => {
  it('prévoit les prochaines règles et la période fertile', () => {
    const c = lireCycle({ debut: '2026-11-01', duree: 28 })
    expect(c.prochaines[0]).toBe('2026-11-29')
    expect(c.ovulation).toBe('2026-11-15')
    expect(c.fertileDu).toBe('2026-11-10')
    expect(c.fertileAu).toBe('2026-11-16')
  })
  it('renvoie vers un agent si le cycle est hors norme', () => {
    expect(lireCycle({ debut: '2026-11-01', duree: 12 }).fiable).toBe(false)
    expect(lireCycle({ debut: '2026-11-01', duree: 60 }).fiable).toBe(false)
  })
  it('gère les dates', () => {
    expect(ajouterJours('2026-12-30', 3)).toBe('2027-01-02')
    expect(ecartJours('2026-11-01', '2026-11-29')).toBe(28)
  })
})
describe('grossesse', () => {
  it('calcule les semaines et le terme', () => {
    const g = lireGrossesse({ dernieresRegles: '2026-06-01', auJour: '2026-11-20', age: 21 })
    expect(g.termePrevu).toBe('2027-03-08')
    expect(g.semaines).toBe(24)
    expect(g.trimestre).toBe(2)
    expect(g.rendezVous.length).toBe(8)
  })
  it('renforce le suivi avant 18 ans', () => {
    const g = lireGrossesse({ dernieresRegles: '2026-06-01', auJour: '2026-11-20', age: 16 })
    expect(g.suivi.niveau).toBe('orange')
    expect(g.rendezVous.length).toBeGreaterThan(8)
  })
  it('refuse une date incohérente', () => {
    expect(lireGrossesse({ dernieresRegles: '2027-01-01', auJour: '2026-11-20' })).toBeNull()
  })
  it('classe les âges', () => {
    expect(niveauAgeMere(13).niveau).toBe('rouge')
    expect(niveauAgeMere(17).niveau).toBe('orange')
    expect(niveauAgeMere(19).niveau).toBe('jaune')
    expect(niveauAgeMere(25).niveau).toBe('bon')
    expect(niveauAgeMere(NaN)).toBeNull()
  })
})
describe('signes de danger', () => {
  it('urgence dès un signe', () => {
    expect(lireSignesGrossesse(['sang']).niveau).toBe('urgent')
    expect(lireNouveauNe(['tete']).niveau).toBe('urgent')
    expect(lireNouveauNe([]).niveau).toBe('bon')
  })
  it('enfant malade : rouge, orange, vert', () => {
    expect(lireEnfantMalade(['vomit']).niveau).toBe('urgent')
    expect(lireEnfantMalade(['fievre']).niveau).toBe('signaler')
    expect(lireEnfantMalade([]).niveau).toBe('bon')
  })
})
