import { describe, expect, it } from 'vitest'
import { chiffrerFile, dechiffrerFile } from './synchro.js'

const items = [{ chemin: 'visites', corps: { idClient: 'e1', code: 'X' }, date: 1 }, { chemin: 'bornes/b1/releve', corps: { idClient: 'e2' }, date: 2 }]
describe('fichier de synchronisation', () => {
  it('chiffre puis déchiffre, et reste illisible sans le mot de passe', async () => {
    const f = await chiffrerFile(items, 'secret-fildor')
    expect(f).not.toMatch(/visites|bornes/)
    expect(await dechiffrerFile(f, 'secret-fildor')).toEqual(items)
    await expect(dechiffrerFile(f, 'mauvais-mdp')).rejects.toThrow(/Mot de passe/)
  })
  it('refuse un mot de passe trop court et un fichier étranger', async () => {
    await expect(chiffrerFile(items, '123')).rejects.toThrow()
    await expect(dechiffrerFile('{"a":1}', 'x')).rejects.toThrow(/synchronisation/)
  })
  it('écarte les chemins dangereux', async () => {
    const f = await chiffrerFile([{ chemin: '../admin', corps: {} }, { chemin: 'http://evil', corps: {} }, { chemin: 'foyers', corps: { a: 1 } }], 'secret-fildor')
    expect((await dechiffrerFile(f, 'secret-fildor')).map((x) => x.chemin)).toEqual(['foyers'])
  })
})
