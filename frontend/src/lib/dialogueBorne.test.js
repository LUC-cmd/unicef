import { describe, expect, it } from 'vitest'
import { QUESTIONS, choixDepuis } from './dialogueBorne.js'
import { chargerCartes, etatVide, noterSondage, rechargerCarte, resumeSondage, utiliserCode, codeDepuis } from './borne.js'

describe('dialogue de la borne', () => {
  const ch = QUESTIONS[2].choix
  it('comprend un chiffre ou un mot', () => {
    expect(choixDepuis('2', ch, 'Français')).toBe(1)
    expect(choixDepuis('deux', ch, 'Français')).toBe(1)
    expect(choixDepuis('un peu', ch, 'Français')).toBe(1)
    expect(choixDepuis('', ch, 'Français')).toBe(-1)
  })
  it('résume les réponses sans aucune identité', () => {
    let e = etatVide()
    e = noterSondage(e, 'Éwé', { probleme: 'regles', utile: 'oui' })
    e = noterSondage(e, 'Français', { probleme: 'regles', utile: 'peu' })
    const r = resumeSondage(e)
    expect(r.total).toBe(2); expect(r.probleme.regles).toBe(2); expect(r.langues['Éwé']).toBe(1)
    expect(JSON.stringify(e.sondage)).not.toMatch(/carte|code/)
  })
  it('une carte utilisée puis rechargée est toujours acceptée', () => {
    const code = codeDepuis('1234567')
    let e = chargerCartes(etatVide(), [{ code, quota: { serviettes: 1, preservatifs: 0, bon: 0, antalgique: 0 } }])
    let r = utiliserCode(e, code, { serviettes: 5 }); expect(r.ok).toBe(true); e = r.etat
    r = utiliserCode(e, code, { serviettes: 1 }); expect(r.raison).toBe('carte-vide')
    const rc = rechargerCarte(e, code, { serviettes: 3 }); expect(rc.ok).toBe(true)
    r = utiliserCode(rc.etat, code, { serviettes: 2 }); expect(r.ok).toBe(true); expect(r.remis.serviettes).toBe(2)
    expect(rechargerCarte(e, codeDepuis('7654321'), { serviettes: 1 }).raison).toBe('inconnu')
  })
})
