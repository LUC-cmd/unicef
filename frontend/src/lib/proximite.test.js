import { describe, expect, it } from 'vitest'
import { trierParDistance, itineraireVers } from './proximite.js'
describe('proximité', () => {
  it('trie du plus proche au plus loin', () => {
    const l = trierParDistance({ lat: 6.24, lng: 1.47 }, [{ id: 'loin', lat: 6.5, lng: 1.9 }, { id: 'pres', lat: 6.25, lng: 1.47 }])
    expect(l.map((x) => x.id)).toEqual(['pres', 'loin'])
    expect(l[0].km).toBeLessThan(2)
  })
  it('lien d’itinéraire vers le lieu', () => { expect(itineraireVers({ lat: 3, lng: 4 })).toContain('3,4') })
})
