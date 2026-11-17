import { useState } from 'react'
import { api } from '../lib/api.js'
import Bandeau from '../components/Bandeau.jsx'
import { ageLisible, formaterDate } from '../lib/format.js'

const RDV = { REALISE: ['Fait', 'ok'], PREVU: ['À venir', 'info'], MANQUE: ['Manqué', 'alerte'], EN_RETARD: ['En retard', 'alerte'] }
const DECL = { ENVOYEE: 'Déclaration envoyée', VALIDEE: 'Naissance déclarée', REJETEE: 'Déclaration à corriger' }

function Poids({ visites }) {
  const pts = [...visites].reverse().filter((v) => v.poidsG)
  if (pts.length < 2) return <p className="petit">Pas assez de pesées pour tracer la courbe.</p>
  const max = Math.max(...pts.map((v) => v.poidsG)); const min = Math.min(...pts.map((v) => v.poidsG))
  const W = 300; const H = 80
  const x = (i) => 8 + (i * (W - 16)) / (pts.length - 1)
  const y = (g) => H - 10 - ((g - min) / Math.max(1, max - min)) * (H - 24)
  return (
    <figure className="mini-courbe">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Poids de ${(min / 1000).toFixed(1)} à ${(max / 1000).toFixed(1)} kg`}>
        <polyline fill="none" stroke="#1CABE2" strokeWidth="2.5" points={pts.map((v, i) => `${x(i)},${y(v.poidsG)}`).join(' ')} />
        {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v.poidsG)} r="3.5" fill="#374EA2" stroke="#fff" strokeWidth="2" />)}
      </svg>
      <figcaption className="petit">Poids : {(pts[0].poidsG / 1000).toFixed(1).replace('.', ',')} kg → {(pts.at(-1).poidsG / 1000).toFixed(1).replace('.', ',')} kg</figcaption>
    </figure>
  )
}

function Enfant({ e }) {
  const faits = e.rendezVous.filter((r) => r.statut === 'REALISE').length
  const aVenir = e.rendezVous.filter((r) => r.statut !== 'REALISE').slice(0, 4)
  return (
    <article className="carte dossier-enfant">
      <div className="editeur-tete">
        <h3>{e.codeEnfant} <span className="petit">{e.statut === 'GROSSESSE' ? `Grossesse · terme ${formaterDate(e.dateTermePrevue)}` : ageLisible(e.dateNaissance)}</span></h3>
        {e.signeDangerRecent ? <span className="badge alerte">Signe de danger récent</span> : <span className="badge ok">Aucun signe de danger</span>}
      </div>
      <div className="deux-colonnes">
        <div>
          <h4>Suivi</h4>
          <p><b>{faits}</b> rendez-vous faits sur {e.rendezVous.length}.{e.declaration ? ` ${DECL[e.declaration] ?? ''}.` : ''}</p>
          <ul className="liste-rdv">
            {aVenir.map((r) => <li key={r.id}><span className={`pastille ${RDV[r.statut]?.[1] ?? 'info'}`} /> {r.libelle} <span className="petit">{formaterDate(r.datePrevue)} · {RDV[r.statut]?.[0] ?? r.statut}</span></li>)}
          </ul>
        </div>
        <div>
          <h4>Croissance</h4>
          <Poids visites={e.visites} />
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Date</th><th>Poids</th><th>Bras</th><th>Danger</th></tr></thead>
              <tbody>{e.visites.slice(0, 5).map((v, i) => (
                <tr key={i}><td>{formaterDate(v.dateVisite)}</td><td>{v.poidsG ? `${(v.poidsG / 1000).toFixed(1).replace('.', ',')} kg` : '—'}</td><td>{v.muacMm ? `${v.muacMm} mm` : '—'}</td><td>{v.signesDanger ? 'Oui' : 'Non'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </article>
  )
}

/** La famille change de région : son dossier de santé la suit. Il suffit du numéro de famille et du code de la carte. */
export default function CarteFamille() {
  const [code, setCode] = useState('')
  const [carte, setCarte] = useState('')
  const [dossier, setDossier] = useState(null)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function ouvrir(e) {
    e?.preventDefault()
    setErreur(''); setMessage(''); setEnCours(true)
    try { setDossier(await api.post('/api/agent/carte/ouvrir', { codeFamille: code, codeCarte: carte })) } catch (err) { setDossier(null); setErreur(err.message) } finally { setEnCours(false) }
  }
  async function suivreIci() {
    setErreur('')
    try { const r = await api.post('/api/agent/carte/transferer', { codeFamille: code, codeCarte: carte }); setMessage(r.message); await ouvrir() } catch (err) { setErreur(err.message) }
  }

  return (
    <main className="page">
      <Bandeau surtitre="Agent de santé" titre="Carte de famille">Une famille arrive d'une autre région : retrouvez tout son suivi.</Bandeau>
      <form className="carte carte-formulaire" onSubmit={ouvrir}>
        <label>Numéro de famille<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="F-0012" autoComplete="off" required /></label>
        <label>Code de la carte<input value={carte} onChange={(e) => setCarte(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 chiffres" autoComplete="off" required /></label>
        <button className="bouton" disabled={enCours || code.trim().length < 3 || carte.length !== 6}>{enCours ? 'Recherche…' : 'Ouvrir le dossier'}</button>
      </form>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {message && <p className="succes" role="status">{message}</p>}
      {dossier && (
        <>
          <section className="carte entete-dossier">
            <div><span className="petit">Famille</span><b>{dossier.codeFamille}</b></div>
            <div><span className="petit">Suivie à</span><b>{dossier.zone}</b><span className="petit">{dossier.region}</span></div>
            <div><span className="petit">Enfants</span><b>{dossier.enfants.length}</b></div>
            {dossier.transferts.length > 0 && <div><span className="petit">Déjà passée par</span><b>{dossier.transferts.map((t) => t.de).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</b></div>}
            {!dossier.dansMaZone && <button type="button" className="bouton" onClick={suivreIci}>Suivre cette famille dans ma zone</button>}
          </section>
          {dossier.enfants.map((e) => <Enfant key={e.codeEnfant} e={e} />)}
        </>
      )}
    </main>
  )
}
