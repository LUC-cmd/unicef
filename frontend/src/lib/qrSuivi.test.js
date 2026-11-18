import { describe, expect, it } from 'vitest'
import { lireEntree, lireSuivi, PICTO_QR } from './qrSuivi.js'

describe('lireEntree', () => {
  it('sépare le type et la date d\'un rendez-vous fait', () => {
    const e = lireEntree('V@2026-09-01')
    expect(e.picto).toBe(PICTO_QR.V)
    expect(e.date).toBe('2026-09-01')
  })

  it('affiche tel quel un type inconnu', () => {
    const e = lireEntree('AUTRE@2026-01-02')
    expect(e.picto).toBe('📌 AUTRE')
    expect(e.date).toBe('2026-01-02')
  })

  it('tolère une entrée vide ou sans date', () => {
    expect(lireEntree('V').date).toBe('')
    expect(lireEntree('').picto).toBe('📌 ')
  })
})

describe('lireSuivi', () => {
  it('met en forme le contenu du QR', () => {
    const suivi = lireSuivi({
      v: 1, fam: 'F-0033', g: '2026-11-18',
      e: [{ c: 'T033A', s: 'ENFANT', n: '2026-05-02', ok: ['V@2026-05-04', 'P@2026-07-03'], p: 'V@2026-09-01' }],
    })
    expect(suivi.famille).toBe('F-0033')
    expect(suivi.enfants).toHaveLength(1)
    expect(suivi.enfants[0].code).toBe('T033A')
    expect(suivi.enfants[0].faits).toHaveLength(2)
    expect(suivi.enfants[0].prochain).toBe('V@2026-09-01')
  })

  it('gère une grossesse (naissance absente, terme présent) et les champs manquants', () => {
    const suivi = lireSuivi({ fam: 'F-0002', e: [{ c: 'T002Z', s: 'GROSSESSE', t: '2026-12-01' }] })
    expect(suivi.enfants[0].naissance).toBe('')
    expect(suivi.enfants[0].terme).toBe('2026-12-01')
    expect(suivi.enfants[0].faits).toEqual([])
  })

  it('renvoie null pour un contenu invalide', () => {
    expect(lireSuivi(null)).toBe(null)
    expect(lireSuivi('x')).toBe(null)
  })
})
