import { beforeEach, describe, expect, it } from 'vitest'
import {
  ajouterAccouchement, ajouterDeclaration, ajouterInscription, ajouterVisite, lireFile, nombreEnAttente, vider,
} from './offline.js'

class StockageMemoire {
  constructor() { this.d = {} }
  getItem(k) { return k in this.d ? this.d[k] : null }
  setItem(k, v) { this.d[k] = String(v) }
  removeItem(k) { delete this.d[k] }
}

beforeEach(() => { globalThis.localStorage = new StockageMemoire() })

describe('file hors ligne', () => {
  it('commence vide', () => {
    expect(nombreEnAttente()).toBe(0)
  })

  it('garde les visites avec un identifiant unique chacune', () => {
    ajouterVisite({ codeEnfant: 'T001A', dateVisite: '2026-11-14', muacMm: 120 })
    ajouterVisite({ codeEnfant: 'T001A', dateVisite: '2026-11-14', muacMm: 121 })
    const f = lireFile()
    expect(f.visites).toHaveLength(2)
    expect(f.visites[0].clientUuid).not.toBe(f.visites[1].clientUuid)
    expect(f.visites[0].rendezVousRealises).toEqual([])
  })

  it('ne garde qu\'une déclaration en attente par enfant', () => {
    ajouterDeclaration({ codeEnfant: 'T001A', lieuNaissance: 'DOMICILE', certificatAccouchement: false })
    ajouterDeclaration({ codeEnfant: 'T001A', lieuNaissance: 'CENTRE_SANTE', certificatAccouchement: true })
    expect(lireFile().declarations).toHaveLength(1)
    expect(nombreEnAttente()).toBe(1)
  })

  it('se vide après synchronisation', () => {
    ajouterVisite({ codeEnfant: 'T001A', dateVisite: '2026-11-14' })
    vider()
    expect(nombreEnAttente()).toBe(0)
  })

  it('survit à un stockage corrompu', () => {
    localStorage.setItem('fildor.file', '{pas du json')
    expect(lireFile()).toEqual({ visites: [], declarations: [], inscriptions: [], accouchements: [] })
  })

  it('garde une inscription hors ligne avec son identifiant, sans doublon', () => {
    const id = ajouterInscription({ langue: 'ewe', porte: 'AGENT', consentement: true, enfants: [] })
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    ajouterInscription({ clientUuid: id, langue: 'ewe', porte: 'AGENT', consentement: true, enfants: [] })
    expect(lireFile().inscriptions).toHaveLength(1)
    expect(nombreEnAttente()).toBe(1)
  })

  it("ne garde qu'une naissance en attente par enfant", () => {
    ajouterAccouchement({ codeEnfant: 'T007G', dateNaissance: '2026-11-10', etapesFaites: [] })
    ajouterAccouchement({ codeEnfant: 'T007G', dateNaissance: '2026-11-11', etapesFaites: [0] })
    expect(lireFile().accouchements).toHaveLength(1)
    expect(lireFile().accouchements[0].dateNaissance).toBe('2026-11-10')
  })

  it("lit une ancienne file sans inscriptions (mise à jour de l'appli)", () => {
    localStorage.setItem('fildor.file', JSON.stringify({ visites: [{ codeEnfant: 'T001A' }], declarations: [] }))
    const f = lireFile()
    expect(f.inscriptions).toEqual([])
    expect(f.accouchements).toEqual([])
    expect(nombreEnAttente(f)).toBe(1)
  })
})
