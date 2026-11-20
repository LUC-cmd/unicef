import { describe, it, expect, beforeEach } from 'vitest'
import { analyserCycles, risqueGrossesse, rappelsNaissance, lireMuac, orienter, signesDepuisTexte, ussd, ordreAlertes, distanceKm } from './parcours.js'

describe('cycles', () => {
  it('moyenne et prochaine date', () => {
    const a = analyserCycles(['2026-08-01', '2026-08-29', '2026-09-26'], '2026-10-01')
    expect(a.moyenne).toBe(28); expect(a.prochaine).toBe('2026-10-24'); expect(a.niveau).toBe('bon')
  })
  it('règles absentes depuis 3 mois', () => { expect(analyserCycles(['2026-06-01'], '2026-09-15').absentes3Mois).toBe(true) })
  it('cycles très variables', () => { expect(analyserCycles(['2026-05-01', '2026-05-22', '2026-07-05'], '2026-07-20').niveau).toBe('surveiller') })
})
describe('risque', () => {
  it('adolescente + facteur = élevé', () => { expect(risqueGrossesse({ age: 15, premiere: true, facteurs: ['tension'] }).niveau).toBe('urgent') })
  it('aucun facteur', () => { expect(risqueGrossesse({ age: 26, premiere: false, facteurs: [] }).niveau).toBe('bon') })
})
describe('naissance', () => {
  it('délai de 45 jours', () => {
    expect(rappelsNaissance('2026-10-01', '2026-10-10').restant).toBe(36)
    expect(rappelsNaissance('2026-09-01', '2026-11-01').niveau).toBe('urgent')
  })
})
describe('muac', () => {
  it('zones', () => {
    expect(lireMuac(110).zone).toBe('rouge'); expect(lireMuac(120).zone).toBe('jaune'); expect(lireMuac(130).zone).toBe('verte'); expect(lireMuac(130, true).niveau).toBe('urgent')
  })
})
describe('orientation', () => {
  it('urgence obstétricale vers l’hôpital', () => {
    const r = orienter({ cas: 'grossesse', signes: ['saigne'], village: 'agbele' })
    expect(r.niveau).toBe('urgent'); expect(r.centre.niveau).toBe(3)
  })
  it('signe simple vers le centre le plus proche', () => {
    expect(orienter({ cas: 'enfant', signes: ['toux'], village: 'agbele' }).centre.id).toBe('c1')
  })
  it('mots-clés', () => { expect(signesDepuisTexte('grossesse', 'elle saigne et a de la fièvre')).toEqual(['saigne', 'fievre']) })
  it('pas de faux positif sur « beaucoup »', () => { expect(signesDepuisTexte('grossesse', 'Elle saigne beaucoup')).toEqual(['saigne']); expect(signesDepuisTexte('grossesse', 'elle perd de l’eau')).toEqual(['liquide']) })
  it('distance', () => { expect(distanceKm('agbele', 'agbele')).toBe(0) })
  it('les urgences passent d’abord', () => {
    const l = ordreAlertes([{ niveau: 'surveiller', heure: '1', etat: 'en-route' }, { niveau: 'urgent', heure: '2', etat: 'en-route' }, { niveau: 'urgent', heure: '0', etat: 'pris' }])
    expect(l.map((a) => a.niveau + a.etat)).toEqual(['urgenten-route', 'surveilleren-route', 'urgentpris'])
  })
})
describe('ussd', () => {
  it('menu et grossesse', () => {
    expect(ussd([]).texte).toContain('Mes règles')
    expect(ussd(['2', '0107'], '2026-11-20').texte).toContain('semaines')
    expect(ussd(['2', '99'], '2026-11-20').fin).toBe(true)
  })
})

import { lireMesures, enregistrerControle, lireControles, POINTS_CONTROLE } from './parcours.js'
describe('mesures du poste', () => {
  it('tension grave chez la femme enceinte vers l’hôpital', () => {
    const r = lireMesures({ pour: 'grossesse', sys: 165, dia: 112, village: 'agbele' })
    expect(r.niveau).toBe('urgent'); expect(r.centre.niveau).toBe(3)
  })
  it('fièvre chez un bébé de moins de 3 mois est urgente', () => { expect(lireMesures({ pour: 'bebe', temp: 38 }).niveau).toBe('urgent') })
  it('fièvre simple chez l’enfant : centre le plus proche', () => {
    const r = lireMesures({ pour: 'enfant', temp: 38.4, village: 'agbele' }); expect(r.niveau).toBe('signaler'); expect(r.centre.id).toBe('c1')
  })
  it('tout est normal', () => { expect(lireMesures({ pour: 'ado', temp: 36.8, spo2: 98 }).niveau).toBe('bon') })
  it('oxygène très bas', () => { expect(lireMesures({ pour: 'enfant', spo2: 88 }).niveau).toBe('urgent') })
  it('la tension ne compte pas pour un enfant', () => { expect(lireMesures({ pour: 'enfant', sys: 170, dia: 120 }).niveau).toBe('bon') })
  it('mesure impossible', () => { expect(lireMesures({ pour: 'ado', temp: 50 }).niveau).toBe('surveiller') })
})
describe('contrôle des boutiques', () => {
  beforeEach(() => { globalThis.localStorage = { s: {}, getItem(k) { return this.s[k] ?? null }, setItem(k, v) { this.s[k] = v } } })
  it('conforme seulement si tout est coché', () => {
    expect(enregistrerControle({ pointId: 'n2', ok: POINTS_CONTROLE.map(([i]) => i) }).conforme).toBe(true)
    expect(enregistrerControle({ pointId: 'n2', ok: ['prix'] }).conforme).toBe(false)
    expect(lireControles().length).toBe(2)
  })
})

import { consulter } from './parcours.js'
describe('consultation anonyme à la borne', () => {
  it('règles douloureuses sans danger : conseils et antalgique possible', () => {
    const r = consulter({ motif: 'regles', reponses: [] }); expect(r.niveau).toBe('bon'); expect(r.produit).toBe('antalgique')
  })
  it('allergie : aucun produit', () => { expect(consulter({ motif: 'regles', reponses: ['allergie'] }).produit).toBeNull() })
  it('retard et douleur au ventre : hôpital', () => {
    const r = consulter({ motif: 'regles', reponses: ['retardDouleur'], village: 'agbele' }); expect(r.niveau).toBe('urgent'); expect(r.centre.niveau).toBe(3)
  })
  it('douleur chaque mois : bon de consultation, pas de produit', () => {
    const r = consulter({ motif: 'regles', reponses: ['chaque'] }); expect(r.niveau).toBe('signaler'); expect(r.bon).toBe(true); expect(r.produit).toBeNull()
  })
  it('pertes sans symptôme : rassurant, jamais de médicament', () => {
    const r = consulter({ motif: 'pertes', reponses: [] }); expect(r.niveau).toBe('bon'); expect(r.produit).toBeNull()
  })
  it('pertes avec mauvaise odeur : consultation', () => { expect(consulter({ motif: 'pertes', reponses: ['odeur'] }).bon).toBe(true) })
  it('pertes avec fièvre : hôpital', () => { expect(consulter({ motif: 'pertes', reponses: ['fievre'] }).niveau).toBe('urgent') })
})
