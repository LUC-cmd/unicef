import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ageLisible, formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'
import { Squelette } from '../components/Chargement.jsx'
import { Anneau, Barres } from '../components/Graphiques.jsx'
import { Link } from 'react-router-dom'
import { Verification } from './Fonctionnement.jsx'
import ActesSuivi from '../components/ActesSuivi.jsx'

const STATUTS = [['ENVOYEE', 'À traiter'], ['VALIDEE', 'Validées'], ['REJETEE', 'Rejetées'], ['', 'Toutes']]
const LIBELLE = { ENVOYEE: 'À traiter', VALIDEE: 'Validée', REJETEE: 'Rejetée', BROUILLON: 'Brouillon' }

export default function Mairie({ vue = 'declarations' }) {
  const [statut, setStatut] = useState(vue === 'tableau' ? '' : 'ENVOYEE')
  const [liste, setListe] = useState([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [rejet, setRejet] = useState(null) // { id, motif }

  const charger = useCallback(async () => {
    try {
      setListe(await api.get(`/api/mairie/declarations${statut ? `?statut=${statut}` : ''}`))
      setErreur('')
    } catch (e) { setErreur(e.message) } finally { setPret(true) }
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

  const comptes = (st) => liste.filter((d) => d.statut === st).length
  const parZone = Object.entries(liste.reduce((m, d) => ({ ...m, [d.zone]: (m[d.zone] ?? 0) + 1 }), {})).map(([nom, valeur]) => ({ nom, valeur }))
  const maxZone = Math.max(1, ...parZone.map((z) => z.valeur))
  const horsDelai = liste.filter((d) => !d.dansDelaiGratuit).length

  if (vue === 'tableau') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Tableau de bord">
          Où en sont les déclarations de naissance de votre commune, et les actes que les familles doivent encore retirer.
        </Bandeau>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {info && <p className="succes" role="status">{info}</p>}
        {!pret ? <Squelette /> : (<>
        <div className="tableau-kpi">
          <div className={`tuile ${comptes('ENVOYEE') ? 'alerte' : ''}`}><b>{comptes('ENVOYEE')}</b><span>déclarations à traiter</span></div>
          <div className="tuile"><b>{comptes('VALIDEE')}</b><span>validées</span></div>
          <div className="tuile"><b>{comptes('REJETEE')}</b><span>rejetées</span></div>
          <div className="tuile"><b>{horsDelai}</b><span>hors du délai gratuit (45 jours)</span></div>
        </div>
        <div className="raccourcis">
          <Link className="bouton" to="/mairie/declarations">Traiter les déclarations</Link>
          <Link className="bouton secondaire" to="/mairie/actes">Suivre les actes à retirer</Link>
          <Link className="bouton secondaire" to="/mairie/preuve">Vérifier une preuve</Link>
        </div>
        <div className="grille-deux">
          <section className="carte">
            <Anneau titre="Déclarations par état" centre={liste.length}
                    parts={[{ nom: 'À traiter', valeur: comptes('ENVOYEE'), couleur: '#ffc20e' }, { nom: 'Validées', valeur: comptes('VALIDEE'), couleur: '#00833d' }, { nom: 'Rejetées', valeur: comptes('REJETEE'), couleur: '#e2231a' }]} />
          </section>
          <section className="carte">
            <Barres titre="Déclarations par zone" max={maxZone} items={parZone} />
          </section>
        </div>
        <section className="carte">
          <h2>À traiter maintenant</h2>
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Reçu</th><th>Enfant</th><th>Zone</th><th>Délai</th><th></th></tr></thead>
              <tbody>
                {liste.filter((d) => d.statut === 'ENVOYEE').slice(0, 5).map((d) => (
                  <tr key={d.id}>
                    <td>{d.numeroRecu}</td><td>{d.codeEnfant}</td><td>{d.zone}</td>
                    <td>{d.dansDelaiGratuit ? 'Gratuit' : 'Hors délai'}</td>
                    <td><button className="bouton petit-bouton" onClick={() => valider(d.id)}>Valider</button></td>
                  </tr>
                ))}
                {comptes('ENVOYEE') === 0 && <tr><td colSpan="5" className="petit">Rien à traiter : tout est à jour.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <ActesSuivi role="MAIRIE" resume />
        </>)}
      </main>
    )
  }

  if (vue === 'actes') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Actes à retirer">
          Une déclaration validée ne suffit pas : l'enfant n'a son acte que lorsque la famille l'a retiré.
        </Bandeau>
        <ActesSuivi role="MAIRIE" />
      </main>
    )
  }

  if (vue === 'preuve') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Vérifier une preuve de naissance">
          Un parent ou un enfant présente un numéro de reçu et un code reçu par SMS : vérifiez-les ici.
        </Bandeau>
        <Verification />
      </main>
    )
  }

  return (
    <>
    <main className="page">
      <Bandeau surtitre="État civil" titre="Déclarations de naissance">
        Dossiers pré-remplis envoyés par les agents de santé. Pas de nom, de photo ni d'adresse ici : un code enfant,
        la zone et les éléments du dossier. La famille est prévenue après validation.
      </Bandeau>
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
