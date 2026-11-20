import { describe, it, expect, beforeEach, vi } from 'vitest'

function faux() {
  const s = {}
  globalThis.localStorage = { getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = String(v) } }
  globalThis.window = globalThis.window ?? { addEventListener() {} }
}

describe('envoi avec reprise hors ligne', () => {
  beforeEach(() => { faux(); vi.resetModules() })

  it('garde ce qui ne part pas, puis le renvoie quand le réseau revient', async () => {
    const m = await import('./reseauClient.js')
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('réseau coupé'))
    const r = await m.envoyerOuGarder('alertes', { centreId: 'c4' })
    expect(r).toEqual({ ok: false, gardee: true })
    expect(m.nombreEnAttente()).toBe(1)
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'x' }) })
    expect(await m.synchroniser()).toBe(1)
    expect(m.nombreEnAttente()).toBe(0)
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/assistant/reseau/alertes')
  })

  it('un refus du serveur n’est pas gardé', async () => {
    const m = await import('./reseauClient.js')
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ detail: 'Centre attendu.' }) })
    const r = await m.envoyerOuGarder('alertes', {})
    expect(r.refuse).toBe(true)
    expect(m.nombreEnAttente()).toBe(0)
  })

  it('le code de question a 8 caractères valides', async () => {
    const m = await import('./reseauClient.js')
    const c = m.codeAleatoire()
    expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
  })

  it('l’orientation retombe sur les règles locales sans réseau', async () => {
    const m = await import('./reseauClient.js')
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('coupé'))
    const r = await m.orienterAvecAssistant({ cas: 'grossesse', signes: ['saigne'], village: 'agbele' })
    expect(r.source).toBe('appareil')
    expect(r.centre.niveau).toBe(3)
  })
})
