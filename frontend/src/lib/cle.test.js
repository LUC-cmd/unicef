import { describe, expect, it } from 'vitest'
import { construireFichier, fusionner, lireFichier } from './cle.js'

const file = {
  visites: [{ clientUuid: 'u1', codeEnfant: 'T001A' }],
  declarations: [{ codeEnfant: 'T002A', lieuNaissance: 'DOMICILE' }],
  inscriptions: [], accouchements: [],
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
    const vide = { visites: [], declarations: [], inscriptions: [], accouchements: [] }
    const un = fusionner(vide, file)
    expect(un.ajoutes).toBe(2)
    expect(fusionner(un.file, file).ajoutes).toBe(0)
  })
})
