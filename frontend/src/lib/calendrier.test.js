import { describe, expect, it } from 'vitest'
import { ETAPES, etapesPassees } from './calendrier.js'

describe('calendrier vaccinal', () => {
  it('a les mêmes cinq étapes et délais que le serveur', () => {
    expect(ETAPES.map((e) => e.jours)).toEqual([0, 42, 70, 98, 274])
  })

  it('ne propose que les vaccins déjà passés', () => {
    expect(etapesPassees('2026-11-14', '2026-11-14').map((e) => e.index)).toEqual([0])
    expect(etapesPassees('2026-03-14', '2026-11-14').map((e) => e.index)).toEqual([0, 1, 2, 3])
    expect(etapesPassees('2025-01-01', '2026-11-14').map((e) => e.index)).toEqual([0, 1, 2, 3, 4])
  })

  it('calcule les dates sans décalage de fuseau', () => {
    expect(etapesPassees('2026-01-01', '2026-12-31')[1].date).toBe('2026-02-12')
  })

  it('ne propose rien sans date de naissance', () => {
    expect(etapesPassees('', '2026-11-14')).toEqual([])
  })
})
