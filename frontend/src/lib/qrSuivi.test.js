import { describe, expect, it } from 'vitest'
import { lireEntree, lireSuivi, PICTO_QR, verifierJeton } from './qrSuivi.js'
import { CLE_QR_PUBLIQUE } from './cleQr.js'

describe('lireEntree', () => {
  it('sépare le type et la date d\'un rendez-vous fait', () => {
    const e = lireEntree('V@2026-09-01')
    expect(e.picto).toBe(PICTO_QR.V)
    expect(e.date).toBe('2026-09-01')
  })

  it('affiche tel quel un type inconnu', () => {
    const e = lireEntree('AUTRE@2026-01-02')
    expect(e.picto).toBe('AUTRE')
    expect(e.date).toBe('2026-01-02')
  })

  it('tolère une entrée vide ou sans date', () => {
    expect(lireEntree('V').date).toBe('')
    expect(lireEntree('').picto).toBe('')
  })
})

describe('lireSuivi', () => {
  it('met en forme le contenu du QR', () => {
    const suivi = lireSuivi({
      v: 1, fam: 'F-0033', g: '2026-11-18',
      e: [{ c: 'T033A', s: 'ENFANT', n: '2026-05-02', ok: ['V@2026-05-04', 'P@2026-07-03'], p: 'V@2026-09-01' }],
    })
    expect(suivi.famille).toBe('F-0033')
    expect(suivi.enfants).toHaveLength(1)
    expect(suivi.enfants[0].code).toBe('T033A')
    expect(suivi.enfants[0].faits).toHaveLength(2)
    expect(suivi.enfants[0].prochain).toBe('V@2026-09-01')
  })

  it('gère une grossesse (naissance absente, terme présent) et les champs manquants', () => {
    const suivi = lireSuivi({ fam: 'F-0002', e: [{ c: 'T002Z', s: 'GROSSESSE', t: '2026-12-01' }] })
    expect(suivi.enfants[0].naissance).toBe('')
    expect(suivi.enfants[0].terme).toBe('2026-12-01')
    expect(suivi.enfants[0].faits).toEqual([])
  })

  it('renvoie null pour un contenu invalide', () => {
    expect(lireSuivi(null)).toBe(null)
    expect(lireSuivi('x')).toBe(null)
  })
})

// Jeton produit par le vrai CarnetQrService (Ed25519 de la JVM) avec la clé privée du serveur :
// la vérification hors réseau avec la clé publique embarquée doit l'accepter.
const JETON = 'fildor1.eyJ2IjoxLCJmYW0iOiJGLTAwMDEiLCJlIjpbeyJjIjoiVDAxMkEiLCJzIjoiRU5GQU5UIiwibiI6IjIwMjYtMDMtMDQiLCJvayI6WyJWQDIwMjYtMDQtMDEiXSwicCI6IlZAMjAyNi0xMi0xMCJ9XSwiZyI6IjIwMjYtMTEtMTkifQ.L13TJPR5Q4KdvcqnCqoftuKaLBoQ_c3yLANkIYUHDDdYLO0umDQVdVV3fXswbuIQXaV-n-YsYQQCwRBU-3zhDg'

const b64u = (t) => btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deb64u = (t) => atob(t.replace(/-/g, '+').replace(/_/g, '/'))

describe('verifierJeton (sans réseau)', () => {
  it('accepte un code signé par le serveur et rend son contenu', () => {
    const r = verifierJeton(JETON)
    expect(r.valide).toBe(true)
    expect(r.contenu.fam).toBe('F-0001')
    expect(lireSuivi(r.contenu).enfants[0].prochain).toBe('V@2026-12-10')
  })

  it('refuse un code dont le contenu a été modifié', () => {
    const [p, c, s] = JETON.split('.')
    const faux = JSON.parse(deb64u(c))
    faux.e[0].ok.push('V@2026-11-01')
    const r = verifierJeton([p, b64u(JSON.stringify(faux)), s].join('.'))
    expect(r.valide).toBe(false)
    expect(r.signatureFausse).toBe(true)
  })

  it('refuse un code signé avec une autre clé', () => {
    expect(verifierJeton(JETON, btoa('x'.repeat(32))).valide).toBe(false)
  })

  it("refuse ce qui n'est pas un code Fil d'Or", () => {
    expect(verifierJeton('https://exemple.org').valide).toBe(false)
    expect(verifierJeton('').valide).toBe(false)
    expect(verifierJeton('fildor1.!!!.???').valide).toBe(false)
  })

  it('embarque une clé publique de 32 octets', () => {
    expect(atob(CLE_QR_PUBLIQUE).length).toBe(32)
  })
})
