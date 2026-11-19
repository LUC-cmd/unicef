import { describe, expect, it } from 'vitest'
import {
  ALPHABET, CHANSONS, COULEURS, CORPS, JOURS, LANGUES_FILMS, MOIS, NOMBRES, filmDe,
} from './chansons.js'

describe('CHANSONS (petits films de 1 à 2 minutes)', () => {
  it('couvre l’alphabet, les nombres, les jours et les mois', () => {
    const ids = CHANSONS.map((c) => c.id)
    expect(ids).toEqual(expect.arrayContaining(['alphabet', 'nombres', 'jours', 'mois']))
  })

  it('chaque film dure 1 à 2 minutes et a un emplacement vidéo', () => {
    for (const c of CHANSONS) {
      expect(c.titre, c.id).toBeTruthy()
      expect(c.paroles.length, c.id).toBeGreaterThan(2)
      const minutes = Number.parseFloat(c.duree)
      expect(minutes, c.id).toBeGreaterThanOrEqual(1)
      expect(minutes, c.id).toBeLessThanOrEqual(2)
      expect(c.video, `${c.id} : emplacement vidéo`).toBe(null)
    }
  })

  it('le français est prêt, les langues locales attendent un enregistrement', () => {
    const langues = Object.fromEntries(LANGUES_FILMS.map(([code, nom, dispo]) => [code, dispo]))
    expect(langues.fr).toBe(true)
    expect(langues.ee).toBe(false)
    expect(langues.kbp).toBe(false)
    expect(langues.tem).toBe(false)
  })
})

describe('contenus des interactions', () => {
  it('les 26 lettres ont un mot simple', () => {
    expect(ALPHABET).toHaveLength(26)
    for (const [lettre, mot] of ALPHABET) {
      expect(lettre).toMatch(/^[A-Z]$/)
      expect(mot.length).toBeGreaterThan(1)
    }
  })

  it('on compte de 1 à 10', () => {
    expect(NOMBRES).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('sept jours et douze mois', () => {
    expect(JOURS).toHaveLength(7)
    expect(MOIS).toHaveLength(12)
  })

  it('les couleurs et le corps sont simples à montrer', () => {
    expect(COULEURS.length).toBeGreaterThanOrEqual(5)
    expect(CORPS.length).toBeGreaterThanOrEqual(4)
  })
})

describe('filmDe', () => {
  it('sans fichier déclaré : pas de lecteur vide', () => {
    expect(filmDe({ video: null })).toBe(null)
  })

  it('un fichier déclaré pointe dans /videos', () => {
    expect(filmDe({ video: 'chanson-alphabet-ewe.mp4' })).toBe('/videos/chanson-alphabet-ewe.mp4')
  })
})
