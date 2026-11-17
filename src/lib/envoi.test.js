import { describe, expect, it, vi } from 'vitest'
import { envoyerOuMettreEnFile } from './envoi.js'

describe('envoyerOuMettreEnFile', () => {
  it('envoie directement quand le réseau est là', async () => {
    const mettreEnFile = vi.fn()
    const r = await envoyerOuMettreEnFile({ enLigne: true, envoyer: async () => 'ok', mettreEnFile })
    expect(r).toEqual({ envoye: true, resultat: 'ok' })
    expect(mettreEnFile).not.toHaveBeenCalled()
  })

  it('met en file quand on est hors ligne, sans appeler le serveur', async () => {
    const envoyer = vi.fn()
    const mettreEnFile = vi.fn()
    const r = await envoyerOuMettreEnFile({ enLigne: false, envoyer, mettreEnFile })
    expect(r.envoye).toBe(false)
    expect(envoyer).not.toHaveBeenCalled()
    expect(mettreEnFile).toHaveBeenCalledOnce()
  })

  it('met en file si le réseau tombe en route (statut 0)', async () => {
    const mettreEnFile = vi.fn()
    const r = await envoyerOuMettreEnFile({
      enLigne: true,
      envoyer: async () => { throw Object.assign(new Error('pas de réseau'), { statut: 0 }) },
      mettreEnFile,
    })
    expect(r.envoye).toBe(false)
    expect(mettreEnFile).toHaveBeenCalledOnce()
  })

  it("renvoie l'erreur quand le serveur refuse la donnée, sans la mettre en file", async () => {
    const mettreEnFile = vi.fn()
    await expect(envoyerOuMettreEnFile({
      enLigne: true,
      envoyer: async () => { throw Object.assign(new Error('Ce numéro est déjà enregistré'), { statut: 409 }) },
      mettreEnFile,
    })).rejects.toThrow('déjà enregistré')
    expect(mettreEnFile).not.toHaveBeenCalled()
  })
})
