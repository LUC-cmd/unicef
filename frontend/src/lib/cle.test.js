import { describe, expect, it } from 'vitest'
import { construireFichier, fusionner, lireFichier } from './cle.js'

const file = {
  visites: [{ clientUuid: 'u1', codeEnfant: 'T001A' }],
  declarations: [{ codeEnfant: 'T002A', lieuNaissance: 'DOMICILE' }],
  inscriptions: [], accouchements: [], prenoms: [{ codeEnfant: 'T001A', prenom: 'Ama' }],
}

describe('clé USB', () => {
  it('écrit puis relit sans perte', async () => {
    const texte = await construireFichier('agent.vo', file)
    const lu = await lireFichier(texte)
    expect(lu.file.visites).toEqual(file.visites)
    expect(lu.agent).toBe('agent.vo')
  })
  it('refuse un fichier abîmé', async () => {
    const abime = (await construireFichier('a', file)).replace('T001A', 'T009A')
    await expect(lireFichier(abime)).rejects.toThrow(/abîmé/)
  })
  it('refuse un fichier étranger', async () => {
    await expect(lireFichier('{"a":1}')).rejects.toThrow(/pas un fichier/)
    await expect(lireFichier('pas du json')).rejects.toThrow(/pas un fichier/)
  })
  it('ne crée pas de doublon en rechargeant le même fichier', () => {
    const vide = { visites: [], declarations: [], inscriptions: [], accouchements: [], prenoms: [] }
    const un = fusionner(vide, file)
    expect(un.ajoutes).toBe(3)
    expect(fusionner(un.file, file).ajoutes).toBe(0)
  })
})

import { aBesoinDeZone, appliquerZone, compter } from './cle.js'
describe('zone et comptage', () => {
  it('applique la zone aux inscriptions qui n\'en ont pas', () => {
    const f = { visites: [], declarations: [], accouchements: [], inscriptions: [{ clientUuid: 'a' }, { clientUuid: 'b', codeZone: 'VO' }] }
    expect(aBesoinDeZone(f)).toBe(true)
    const g = appliquerZone(f, 'GOLFE')
    expect(g.inscriptions.map((i) => i.codeZone)).toEqual(['GOLFE', 'VO']); expect(aBesoinDeZone(g)).toBe(false)
    expect(compter(g).inscriptions).toBe(2)
  })
})
