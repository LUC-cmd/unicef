import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ageLisible } from '../lib/format.js'
import { Squelette } from './Chargement.jsx'
import { ETAPES_NATIONALITE, VOIES, complet, piecesFaites } from '../lib/nationalite.js'

function Fiche({ d, fermer, apres }) {
  const voie = VOIES[d.voie] ?? VOIES.A_PRECISER
  const faites = piecesFaites(d)
  const [note, setNote] = useState(d.note ?? '')
  const [erreur, setErreur] = useState('')
  async function envoyer(etape, pieces = faites, nouvelleVoie = null) {
    setErreur('')
    try { await api.post(`/api/mairie/nationalite/${d.declarationId}`, { etape, piecesOk: pieces.join(','), voie: nouvelleVoie, note }); apres() } catch (e) { setErreur(e.message) }
  }
  const basculer = (k) => envoyer(d.etape, faites.includes(k) ? faites.filter((x) => x !== k) : [...faites, k])
  return (
    <aside className="fiche-nat carte" aria-label={`Dossier ${d.codeEnfant}`}>
      <div className="editeur-tete"><h3>{d.codeEnfant}{d.enfantPrenom ? ` · ${d.enfantPrenom}` : ''}</h3><button type="button" className="bouton secondaire petit-bouton" onClick={fermer}>Fermer</button></div>
      <label>Situation des parents
        <select value={d.voie} onChange={(e) => envoyer(d.etape, faites, e.target.value)}>
          {Object.entries(VOIES).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}
        </select>
      </label>
      <p className="petit">{voie.aide}</p>
      <ul className="pieces-nat">
        {voie.pieces.map(([k, t]) => (
          <li key={k}><label className="case"><input type="checkbox" checked={faites.includes(k)} onChange={() => basculer(k)} /> {t}</label></li>
        ))}
      </ul>
      <label>Note <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} onBlur={() => envoyer(d.etape)} placeholder="Ex. rendez-vous au tribunal le…" /></label>
      <div className="actions">
        {d.etape > 1 && <button type="button" className="bouton secondaire" onClick={() => envoyer(d.etape - 1)}>Étape précédente</button>}
        {d.etape < 4 && <button type="button" className="bouton" disabled={d.etape === 1 && !complet(d)} onClick={() => envoyer(d.etape + 1)}>
          {d.etape === 1 ? 'Pièces réunies' : d.etape === 2 ? 'Dossier déposé' : 'Nationalité reconnue'}</button>}
      </div>
      {d.etape === 1 && !complet(d) && <p className="petit">Cochez les pièces pour passer à l’étape suivante.</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </aside>
  )
}

/** Après la validation de la naissance : suivi du dossier de nationalité, étape par étape. */
export default function ProcedureNationalite() {
  const [liste, setListe] = useState(null)
  const [choisi, setChoisi] = useState(null)
  const charger = useCallback(() => api.get('/api/mairie/nationalite').then(setListe).catch(() => setListe([])), [])
  useEffect(() => { charger() }, [charger])
  if (!liste) return <Squelette tuiles={4} cartes={1} />
  const courant = liste.find((d) => d.declarationId === choisi)
  const parEtape = (n) => liste.filter((d) => d.etape === n)
  return (
    <>
      <div className="grille-tuiles quatre">
        {ETAPES_NATIONALITE.map(([t], i) => (
          <div key={t} className="tuile-chiffre"><div className="tuile-texte"><span className="tuile-libelle">{t}</span><b className="tuile-valeur">{parEtape(i + 1).length}</b></div></div>
        ))}
      </div>
      <div className={`nat-plan ${courant ? 'avec-fiche' : ''}`}>
        <div className="nat-colonnes">
          {ETAPES_NATIONALITE.map(([t, aide], i) => (
            <section key={t} className="nat-colonne" aria-label={t}>
              <h3>{t}<small>{aide}</small></h3>
              {parEtape(i + 1).length === 0 && <p className="petit">Aucun dossier.</p>}
              {parEtape(i + 1).map((d) => (
                <button key={d.declarationId} type="button" className={`nat-carte ${choisi === d.declarationId ? 'actif' : ''}`} onClick={() => setChoisi(d.declarationId)}>
                  <b>{d.codeEnfant}</b>
                  <span>{(VOIES[d.voie] ?? VOIES.A_PRECISER).nom}</span>
                  <span className="petit">{d.zone}{d.dateNaissance ? ` · ${ageLisible(d.dateNaissance)}` : ''}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
        {courant && <Fiche key={courant.declarationId + courant.etape + courant.voie} d={courant} fermer={() => setChoisi(null)} apres={charger} />}
      </div>
    </>
  )
}
