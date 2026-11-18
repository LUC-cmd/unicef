import { describe, expect, it } from 'vitest'
import { distanceKm, formaterKm, lienCarte, lienItineraire } from './geo.js'

describe('distanceKm', () => {
  it('Lomé → Vogan ≈ 33 km (ordre de grandeur réel)', () => {
    const km = distanceKm(6.137, 1.222, 6.337, 1.532)
    expect(km).toBeGreaterThan(30)
    expect(km).toBeLessThan(50)
  })

  it('le même point vaut zéro', () => {
    expect(distanceKm(6.137, 1.222, 6.137, 1.222)).toBeCloseTo(0, 5)
  })

  it('donnée manquante : pas de distance inventée', () => {
    expect(distanceKm(6.137, 1.222, null, 1.532)).toBe(null)
  })
})

describe('formaterKm', () => {
  it('moins d un kilomètre : en mètres', () => {
    expect(formaterKm(0.4)).toBe('à 400 m')
  })

  it('au-delà : en kilomètres', () => {
    expect(formaterKm(3.42)).toBe('à environ 3,4 km'.replace(',', '.'))
    expect(formaterKm(12)).toContain('12 km')
  })

  it('sans distance : vide', () => {
    expect(formaterKm(null)).toBe('')
  })
})

describe('liens de guidage', () => {
  it('l itinéraire pointe vers la destination', () => {
    expect(lienItineraire(6.337, 1.532)).toBe('https://www.google.com/maps/dir/?api=1&destination=6.337,1.532')
  })

  it('la carte ouvre OpenStreetMap centré sur la structure', () => {
    expect(lienCarte(6.337, 1.532)).toMatch(/^https:\/\/www\.openstreetmap\.org\/#map=15\/6\.337\/1\.532$/)
  })

  it('sans coordonnée : pas de lien cassé', () => {
    expect(lienItineraire(null, null)).toBe(null)
    expect(lienCarte(null, null)).toBe(null)
  })
})
