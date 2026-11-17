import { describe, expect, it } from 'vitest'
import { analyser, dateDepuisAge, joursDepuis } from './acte.js'

const AUJ = '2026-11-16'
describe('chemin vers l\'acte', () => {
  it('compte les jours', () => { expect(joursDepuis('2026-11-06', AUJ)).toBe(10) })
  it('grossesse : préparer', () => { expect(analyser({ etat: 'grossesse', aujourdhui: AUJ }).cas).toBe('grossesse') })
  it('dans le délai gratuit : jours restants', () => {
    const r = analyser({ etat: 'ne', precision: 'exacte', date: '2026-10-27', dejaDeclare: 'non', aujourdhui: AUJ })
    expect(r.cas).toBe('gratuit'); expect(r.resume).toContain('25 jours'); expect(r.cout).toBe('Gratuit')
  })
  it('hors délai : jugement supplétif', () => {
    const r = analyser({ etat: 'ne', precision: 'exacte', date: '2026-01-10', dejaDeclare: 'non', aujourdhui: AUJ })
    expect(r.cas).toBe('supletif'); expect(r.resume).toContain('moins de 5 ans')
  })
  it('naissance inconnue : jugement et estimation de date', () => {
    const r = analyser({ etat: 'ne', precision: 'inconnue', dejaDeclare: 'nsp', aujourdhui: AUJ })
    expect(r.cas).toBe('supletif'); expect(r.etapes.join(' ')).toContain('meilleure estimation')
  })
  it('déjà déclaré : retirer l\'acte', () => { expect(analyser({ etat: 'ne', precision: 'exacte', date: '2020-01-01', dejaDeclare: 'oui', aujourdhui: AUJ }).cas).toBe('declare') })
  it('mère sans nom et père inconnu : notes rassurantes', () => {
    const r = analyser({ etat: 'grossesse', merePrefereSansNom: true, pereInconnu: true, aujourdhui: AUJ })
    expect(r.notes).toHaveLength(2)
  })
  it('âge approximatif → date', () => {
    expect(dateDepuisAge(2, 'ans', AUJ)).toBe('2024-11-16'); expect(dateDepuisAge(8, 'mois', AUJ)).toBe('2026-03-16')
  })
})
