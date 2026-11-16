import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ageLisible, formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'
import GuideRole from '../components/GuideRole.jsx'
import ActesSuivi from '../components/ActesSuivi.jsx'

const STATUTS = [['ENVOYEE', 'À traiter'], ['VALIDEE', 'Validées'], ['REJETEE', 'Rejetées'], ['', 'Toutes']]
const LIBELLE = { ENVOYEE: 'À traiter', VALIDEE: 'Validée', REJETEE: 'Rejetée', BROUILLON: 'Brouillon' }

export default function Mairie() {
  const [statut, setStatut] = useState('ENVOYEE')
  const [liste, setListe] = useState([])
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [rejet, setRejet] = useState(null) // { id, motif }

  const charger = useCallback(async () => {
    try {
      setListe(await api.get(`/api/mairie/declarations${statut ? `?statut=${statut}` : ''}`))
      setErreur('')
    } catch (e) { setErreur(e.message) }
  }, [statut])

  useEffect(() => { charger() }, [charger])

  async function valider(id) {
    try { const r = await api.post(`/api/mairie/declarations/${id}/valider`); setInfo(r.message); await charger() }
    catch (e) { setErreur(e.message) }
  }
  async function voirPreuve(id) {
    try {
      const r = await api.get(`/api/mairie/declarations/${id}/preuve`)
      setInfo(`Preuve de naissance : reçu ${r.numero}, code ${r.code}. À lire à la famille ou à écrire sur son carnet.`)
      setErreur('')
    } catch (e) { setErreur(e.message) }
  }
  async function rejeter() {
    try {
      const r = await api.post(`/api/mairie/declarations/${rejet.id}/rejeter`, { motif: rejet.motif })
      setInfo(r.message); setRejet(null); await charger()
    } catch (e) { setErreur(e.message) }
  }

  return (
    <>
    <Bandeau surtitre="État civil" titre="Déclarations de naissance">
      Dossiers pré-remplis envoyés par les agents de santé. Pas de nom, de photo ni d'adresse ici : un code enfant,
      la zone et les éléments du dossier. La famille est prévenue après validation.
    </Bandeau>
    <main className="page">
      <GuideRole role="MAIRIE" />

      <div className="onglets large" role="tablist">
        {STATUTS.map(([v, nom]) => (
          <button key={v} role="tab" aria-selected={statut === v} className={statut === v ? 'actif' : ''} onClick={() => { setStatut(v); setInfo('') }}>{nom}</button>
        ))}
      </div>

      {info && <p className="succes" role="status">{info}</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr><th>Reçu</th><th>Enfant</th><th>Zone</th><th>Né(e)</th><th>Lieu</th><th>Certificat</th><th>Délai</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {liste.map((d) => (
              <tr key={d.id}>
                <td>{d.numeroRecu}<br /><span className="petit">{formaterDate(d.envoyeeLe)}</span></td>
                <td>{d.codeEnfant}</td>
                <td>{d.zone}</td>
                <td>{formaterDate(d.dateNaissance)}<br /><span className="petit">{ageLisible(d.dateNaissance)}</span></td>
                <td>{d.lieuNaissance === 'CENTRE_SANTE' ? 'Centre de santé' : 'Domicile'}</td>
                <td>{d.certificatAccouchement ? 'Oui' : 'Non'}</td>
                <td>{d.dansDelaiGratuit ? 'Gratuit (≤ 45 j)' : 'Hors délai : 6 000 FCFA'}</td>
                <td><span className={`pastille ${d.statut.toLowerCase()}`}>{LIBELLE[d.statut]}</span>{d.motifRejet && <><br /><span className="petit">{d.motifRejet}</span></>}</td>
                <td>
                  {d.statut === 'ENVOYEE' && (
                    <div className="actions">
                      <button className="bouton petit-bouton" onClick={() => valider(d.id)}>Valider</button>
                      <button className="bouton secondaire petit-bouton" onClick={() => setRejet({ id: d.id, motif: '' })}>Rejeter</button>
                    </div>
                  )}
                  {d.statut === 'VALIDEE' && (
                    <button className="bouton secondaire petit-bouton" onClick={() => voirPreuve(d.id)}>Voir la preuve</button>
                  )}
                </td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan="9" className="petit">Aucune déclaration.</td></tr>}
          </tbody>
        </table>
      </div>

      <ActesSuivi role="MAIRIE" />

      {rejet && (
        <div className="modale" role="dialog" aria-modal="true" aria-label="Motif du rejet">
          <div className="carte">
            <h2>Motif du rejet</h2>
            <p className="petit">Le motif est obligatoire : l'agent doit savoir quoi corriger.</p>
            <textarea value={rejet.motif} onChange={(e) => setRejet({ ...rejet, motif: e.target.value })} rows="3" maxLength="200" autoFocus />
            <div className="actions">
              <button className="bouton" disabled={!rejet.motif.trim()} onClick={rejeter}>Rejeter</button>
              <button className="bouton secondaire" onClick={() => setRejet(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  )
}
