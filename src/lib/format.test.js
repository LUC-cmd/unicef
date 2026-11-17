import { describe, expect, it } from 'vitest'
import { ageLisible, aujourdhuiIso, classerPB, couleurIndice, formaterDate } from './format.js'

describe('format', () => {
  it('formate une date ISO en jj/mm/aaaa', () => {
    expect(formaterDate('2026-11-14')).toBe('14/11/2026')
    expect(formaterDate(null)).toBe('—')
  })

  it("donne la date du jour au format ISO", () => {
    expect(aujourdhuiIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it("exprime l'âge de façon lisible", () => {
    const ref = new Date('2026-11-14T12:00:00')
    expect(ageLisible('2026-11-02', ref)).toBe('12 jours')
    expect(ageLisible('2026-03-14', ref)).toBe('8 mois')
    expect(ageLisible('2024-08-14', ref)).toBe('2 ans 3 mois')
    expect(ageLisible('2024-11-14', ref)).toBe('2 ans')
  })

  it('classe le périmètre brachial comme le serveur', () => {
    expect(classerPB('')).toBe('NON_MESURE')
    expect(classerPB(114)).toBe('SEVERE')
    expect(classerPB(115)).toBe('MODEREE')
    expect(classerPB('124')).toBe('MODEREE')
    expect(classerPB(125)).toBe('NORMALE')
  })

  it("colore l'indice d'oubli", () => {
    expect(couleurIndice(80)).toBe('#e2231a')
    expect(couleurIndice(40)).toBe('#f26a21')
    expect(couleurIndice(10)).toBe('#00833d')
    expect(couleurIndice(null)).toBe('#777779')
  })
})
