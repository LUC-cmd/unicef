import { describe, it, expect } from 'vitest'
import { chiffreControle, codeValide, creerCode, genererLot, etatVide, chargerCartes, utiliserCode, resumeJournal, empreinte, NB_ESSAIS } from './borne.js'

describe('codes', () => {
  it('crée des codes valides et uniques', () => {
    const lot = genererLot({ nombre: 50, quota: { serviettes: 3 } })
    expect(new Set(lot.map((c) => c.code)).size).toBe(50)
    expect(lot.every((c) => codeValide(c.code))).toBe(true)
  })
  it('détecte une faute de frappe', () => {
    const c = creerCode()
    const faux = c.slice(0, 3) + String((Number(c[3]) + 1) % 10) + c.slice(4)
    expect(codeValide(faux)).toBe(false)
    expect(chiffreControle('1234567')).toMatch(/^\d$/)
  })
})
describe('borne', () => {
  const lot = genererLot({ nombre: 2, quota: { serviettes: 3, preservatifs: 2, bon: 1 } })
  const base = chargerCartes(etatVide(), lot)
  it('ne garde jamais le code', () => {
    expect(JSON.stringify(base)).not.toContain(lot[0].code)
    expect(Object.keys(base.cartes)).toContain(empreinte(lot[0].code))
  })
  it('remet les produits dans la limite de la carte et décompte', () => {
    const r = utiliserCode(base, lot[0].code, { serviettes: 5, preservatifs: 1 })
    expect(r.ok).toBe(true)
    expect(r.remis).toEqual({ serviettes: 3, preservatifs: 1 })
    expect(r.reste.serviettes).toBe(0)
    const r2 = utiliserCode(r.etat, lot[0].code, { serviettes: 1 })
    expect(r2.ok).toBe(false)
    expect(r2.raison).toBe('rien')
    expect(r.etat.stock.serviettes).toBe(57)
  })
  it('limite la quantité par le stock de la borne', () => {
    const e = { ...base, stock: { ...base.stock, serviettes: 1 } }
    expect(utiliserCode(e, lot[1].code, { serviettes: 3 }).remis).toEqual({ serviettes: 1 })
  })
  it('bloque après trop d’essais', () => {
    let e = base
    for (let i = 0; i < NB_ESSAIS; i++) {
      let c; do { c = creerCode() } while (lot.some((l) => l.code === c))
      e = utiliserCode(e, c, { serviettes: 1 }, 1000).etat
    }
    const r = utiliserCode(e, lot[0].code, { serviettes: 1 }, 2000)
    expect(r.raison).toBe('bloque')
    expect(utiliserCode(e, lot[0].code, { serviettes: 1 }, 1000 + 16 * 60 * 1000).ok).toBe(true)
  })
  it('le journal ne contient aucune identité', () => {
    const r = utiliserCode(base, lot[0].code, { serviettes: 2 }, Date.parse('2026-11-20T10:00:00Z'))
    expect(resumeJournal(r.etat)).toEqual({ '2026-11-20': { serviettes: 2 } })
    expect(JSON.stringify(r.etat.journal)).not.toContain(lot[0].code)
  })
  it('refuse un format incorrect sans compter d’essai', () => {
    const r = utiliserCode(base, '12', { serviettes: 1 })
    expect(r.raison).toBe('format')
    expect(r.etat.essais.n).toBe(0)
  })
})
