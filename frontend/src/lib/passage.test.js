import { describe, expect, it } from 'vitest'
import { creerPassage, enfantsEnAttente, estPassage, lirePassage } from './passage.js'

const file = { visites: [
  { clientUuid: 'aaaaaaaa-1', codeEnfant: 'E-1', dateVisite: '2026-11-18', poidsG: 9800, muacMm: 128, signesDanger: false },
  { clientUuid: 'bbbbbbbb-2', codeEnfant: 'E-1', dateVisite: '2026-11-19', poidsG: null, muacMm: 112, signesDanger: true },
  { clientUuid: 'cccccccc-3', codeEnfant: 'E-2', dateVisite: '2026-11-19', poidsG: 7000, muacMm: null, signesDanger: false },
] }

describe('QR de passage', () => {
  it('relit les visites d’un enfant, signature valide', () => {
    const t = creerPassage('E-1', file, { centre: 'Centre de santé de Zio', agent: 'Agent Ama', region: 'Maritime' })
    expect(estPassage(t)).toBe(true)
    const r = lirePassage(t)
    expect(r.valide).toBe(true)
    expect(r.enfant).toBe('E-1')
    expect(r.visites).toHaveLength(2)
    expect(r.visites[1]).toMatchObject({ date: '2026-11-19', muacMm: 112, danger: true })
    expect(r.appareil).toMatch(/^[A-Z0-9]{6}$/)
    expect(r).toMatchObject({ centre: 'Centre de santé de Zio', agent: 'Agent Ama', region: 'Maritime' })
  })
  it('refuse un contenu modifié', () => {
    const [p, charge, sig] = creerPassage('E-1', file).split('.')
    const altere = charge.slice(0, 20) + (charge[20] === 'A' ? 'B' : 'A') + charge.slice(21)
    expect(lirePassage([p, altere, sig].join('.')).valide).toBe(false)
  })
  it('refuse un texte qui n’est pas un passage', () => {
    expect(lirePassage('fildor1.xxx.yyy').valide).toBe(false)
    expect(creerPassage('E-9', file)).toBeNull()
  })
  it('compte les enfants en attente', () => {
    expect(enfantsEnAttente(file)).toEqual([{ code: 'E-1', nombre: 2 }, { code: 'E-2', nombre: 1 }])
  })
})

import { ecrireSoins } from './passage.js'
describe('soins donnés', () => {
  it('voyagent avec la visite', () => {
    const store = {}
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }
    ecrireSoins('bbbbbbbb-2', ['V', 'M'], 'fièvre')
    const r = lirePassage(creerPassage('E-1', file, { centre: 'C' }))
    expect(r.visites[1].soins).toEqual(['V', 'M'])
    expect(r.visites[1].note).toBe('fièvre')
  })
})
