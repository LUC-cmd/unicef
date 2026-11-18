import { describe, expect, it } from 'vitest'
import { KIT_ACCOUCHEMENT, MOIS_GROSSESSE, SIGNES_ALERTE_GROSSESSE, moisActuel } from './grossesse.js'

describe('MOIS_GROSSESSE', () => {
  it('couvre les 9 mois dans l\'ordre', () => {
    expect(MOIS_GROSSESSE.map((m) => m.mois)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('chaque mois a au moins 2 exercices avec picto, titre, consigne et un emplacement vidéo', () => {
    for (const m of MOIS_GROSSESSE) {
      expect(m.exercices.length, `mois ${m.mois}`).toBeGreaterThanOrEqual(2)
      for (const e of m.exercices) {
        expect(e.picto, `mois ${m.mois}`).toBeTruthy()
        expect(e.titre, `mois ${m.mois}`).toBeTruthy()
        expect(e.consigne, `mois ${m.mois}`).toBeTruthy()
      }
      expect(m.video, `mois ${m.mois} : emplacement vidéo`).toBe(null)
    }
  })

  it('chaque mois a un rendez-vous CPN et un conseil', () => {
    for (const m of MOIS_GROSSESSE) {
      expect(m.rdv, `mois ${m.mois}`).toContain('CPN')
      expect(m.conseil, `mois ${m.mois}`).toBeTruthy()
    }
  })
})

describe('signes d\'alerte et kit', () => {
  it('les signes d\'alerte demandent d\'aller au centre sans attendre', () => {
    expect(SIGNES_ALERTE_GROSSESSE.length).toBeGreaterThanOrEqual(5)
    expect(SIGNES_ALERTE_GROSSESSE.some(([, t]) => t.includes('Convulsions'))).toBe(true)
  })

  it('le kit d\'accouchement contient l\'essentiel propre', () => {
    const texte = KIT_ACCOUCHEMENT.join(' ')
    expect(texte).toContain('savon')
    expect(texte).toContain('gants')
    expect(texte).toContain('carnet de CPN')
  })
})

describe('moisActuel', () => {
  const aujourdhui = new Date('2026-11-18T12:00:00')
  const dans = (jours) => new Date(aujourdhui.getTime() + jours * 86400000)

  it('terme dans 140 jours = 5 mois restants = 5ᵉ mois de grossesse', () => {
    expect(moisActuel(dans(140), aujourdhui)).toBe(5)
  })

  it('terme proche ou dépassé = 9ᵉ mois', () => {
    expect(moisActuel(dans(10), aujourdhui)).toBe(9)
    expect(moisActuel(dans(-3), aujourdhui)).toBe(9)
  })

  it('pas de terme prévu : pas de mois', () => {
    expect(moisActuel(null, aujourdhui)).toBe(null)
  })
})
