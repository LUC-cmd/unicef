import { describe, expect, it } from 'vitest'
import { anneau, delaiLisible, ETATS_REF, PRIORITES } from './suivi.js'

describe('suivi', () => {
  it('écrit les délais en clair', () => {
    expect(delaiLisible(12)).toBe('12 min')
    expect(delaiLisible(60)).toBe('1 h')
    expect(delaiLisible(135)).toBe('2 h 15')
    expect(delaiLisible(60 * 26)).toBe('1 j 2 h')
    expect(delaiLisible(null)).toBe('–')
  })
  it('calcule l’anneau de couverture', () => {
    expect(anneau(0).reste).toBe(anneau(0).c)
    expect(anneau(100).reste).toBe(0)
    expect(anneau(150).reste).toBe(0)
    expect(anneau(50).reste).toBeCloseTo(anneau(50).c / 2, 1)
  })
  it('nomme tous les états et priorités', () => {
    for (const e of ['envoyee', 'recue', 'arrivee', 'prise', 'suivie']) expect(ETATS_REF[e]).toBeTruthy()
    for (const p of ['prioritaire', 'renforcer', 'bonne']) expect(PRIORITES[p]).toBeTruthy()
  })
})
