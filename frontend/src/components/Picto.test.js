import { describe, expect, it } from 'vitest'
import { NOMS_PICTOS } from './Picto.jsx'
import { CORPS, CHANSONS } from '../lib/chansons.js'
import { MOIS_GROSSESSE, POSITIONS_BEBE, SIGNES_ALERTE_GROSSESSE } from '../lib/grossesse.js'

const existe = (n) => NOMS_PICTOS.includes(n)

describe('pictogrammes', () => {
  it('chaque icône utilisée par les chansons existe', () => {
    for (const [, p] of CORPS) expect(existe(p), p).toBe(true)
    for (const c of CHANSONS) expect(existe(c.icone), c.icone).toBe(true)
  })
  it('chaque icône utilisée par la grossesse existe', () => {
    for (const m of MOIS_GROSSESSE) for (const e of m.exercices) expect(existe(e.picto), e.picto).toBe(true)
    for (const p of POSITIONS_BEBE) expect(existe(p.picto), p.picto).toBe(true)
    for (const [p] of SIGNES_ALERTE_GROSSESSE) expect(existe(p), p).toBe(true)
  })
  it("aucun emoji système n'est resté dans les données", () => {
    const texte = JSON.stringify([CORPS, CHANSONS, MOIS_GROSSESSE, POSITIONS_BEBE, SIGNES_ALERTE_GROSSESSE])
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(texte.replace(/[✓✗★]/g, ''))).toBe(false)
  })
})
