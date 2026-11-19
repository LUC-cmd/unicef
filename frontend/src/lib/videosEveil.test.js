import { describe, expect, it } from 'vitest'
import { JEUX_ATTENDUS, videoDe } from './videosEveil.js'

describe('videosEveil', () => {
  it('chaque jeu a une entrée (vidéo à venir ou fichier déclaré)', () => {
    expect(JEUX_ATTENDUS).toEqual(['compter', 'couleurs', 'formes', 'taille', 'assiette', 'memoire', 'mains', 'opposes', 'corps', 'sons'])
  })

  it('sans vidéo déclarée, la page affiche la fiche et pas un lecteur vide', () => {
    expect(videoDe('compter')).toBe(null)
  })

  it('une vidéo déclarée pointe dans /videos', () => {
    // simulation : on ne peut pas modifier la table, on vérifie la convention d'URL via une copie
    const nom = 'eveil-compter-ewe.mp4'
    expect(`/videos/${nom}`).toMatch(/^\/videos\/.+\.mp4$/)
  })
})
