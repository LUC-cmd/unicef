import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { aujourdhuiIso } from '../lib/format.js'
import ReceptionCles from '../components/ReceptionCles.jsx'
import Bandeau from '../components/Bandeau.jsx'

const SERVICES = [
  ['Site', 'Cette interface, servie à part.', null],
  ['API', 'Dossiers, rôles, rappels, synchronisation.', '/actuator/health'],
  ['Base', 'PostgreSQL. L’API ne démarre pas sans elle.', null],
  ['Assistant', 'Questions sur les contenus. Aucun accès aux dossiers.', '/assistant/health'],
]

async function joignable(url, accepte) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) return false
    const corps = await r.json().catch(() => null)
    return accepte(corps)
  } catch {
    return false
  }
}

/** Coulisses : l'état des quatre services, et l'horloge de démonstration. */
export default function Admin({ vue = 'services' }) {
  if (vue === 'cles') {
    return (
      <main className="page">
        <Bandeau surtitre="Administrateur" titre="Réception des clés USB">Les saisies faites sans réseau arrivent ici, puis partent dans la base.</Bandeau>
        <ReceptionCles />
      </main>
    )
  }
  const [etats, setEtats] = useState({})
  const [jours, setJours] = useState(5)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    async function lire() {
      const apiOk = await joignable('/api/public/sujets', Array.isArray)
      const assistantOk = await joignable('/assistant/health', (c) => c?.statut === 'ok')
      if (!annule) setEtats({ API: apiOk, Base: apiOk, Assistant: assistantOk, Site: true })
    }
    lire()
    return () => { annule = true }
  }, [])

  async function lancer() {
    setErreur('')
    const d = new Date()
    d.setDate(d.getDate() + Number(jours))
    try {
      const r = await api.post(`/api/admin/cycle?date=${aujourdhuiIso(d)}`)
      setResultat({ ...r, date: aujourdhuiIso(d) })
    } catch (e) { setErreur(e.message) }
  }

  if (vue === 'horloge') {
    return (
      <main className="page">
        <Bandeau surtitre="Administration" titre="Horloge de démonstration">Faites avancer le temps pour montrer les rappels et les rendez-vous manqués.</Bandeau>
        <section className="carte">
          <h2>Horloge de démonstration</h2>
          <p>Avance le cycle des rappels. Les rendez-vous non faits deviennent manqués, les familles silencieuses remontent dans la liste de l'agent.</p>
          <label>Avancer de (jours)
            <input type="number" min="0" max="30" value={jours} onChange={(e) => setJours(e.target.value)} />
          </label>
          <button className="bouton" onClick={lancer}>Lancer le cycle</button>
          <p className="petit">L'effet reste dans la base de démonstration.</p>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          {resultat && (
            <ul role="status">
              <li>Cycle du {resultat.date}</li>
              <li>{resultat.rendezVousManques} rendez-vous manqués</li>
              <li>{resultat.rappelsSansReponse} rappels sans réponse</li>
              <li>{resultat.rappelsCrees} rappels préparés</li>
              <li>{resultat.rappelsAuxProches} rappels aux proches</li>
              <li>{resultat.jeuxEnvoyes} jeux envoyés</li>
            </ul>
          )}
        </section>
      </main>
    )
  }

  if (vue === 'acces') {
    return (
      <main className="page">
        <Bandeau surtitre="Administration" titre="Espaces et comptes">Ouvrez chaque espace comme le ferait l'utilisateur concerné.</Bandeau>
        <section className="carte">
          <h2>Ce que le jury peut ouvrir</h2>
          <ul className="liste-points">
            <li>Téléphone <b>90000031</b>, puis l'onglet USSD <b>*789#</b></li>
            <li>Assistant : une question sur les vaccins, une sur les convulsions</li>
            <li><b>Agent de Vo</b> : liste priorisée, saisie hors ligne</li>
            <li><b>État civil</b> : valider, la famille reçoit un avis</li>
            <li><b>Responsable régional</b> : carte anonyme</li>
          </ul>
          <p className="petit">Les comptes de démonstration sont sur la page <Link to="/connexion">Se connecter</Link>.</p>
        </section>
        <div className="raccourcis">
          <Link className="bouton secondaire" to="/mairie">Espace état civil</Link>
          <Link className="bouton secondaire" to="/carte">Espace responsable régional</Link>
          <Link className="bouton secondaire" to="/agent">Espace agent de santé</Link>
        </div>
      </main>
    )
  }

  const enService = Object.values(etats).filter(Boolean).length
  return (
    <main className="page">
      <Bandeau surtitre="Administration" titre="Coulisses">
        Quatre services, séparés. L'assistant ne lit pas la base. La base ne sert que l'API. {enService} sur 4 en service.
      </Bandeau>
      <section className="services" aria-label="État des services">
        {SERVICES.map(([nom, detail]) => {
          const ok = etats[nom]
          return (
            <article className="service" key={nom}>
              <p className={`etat ${ok ? 'ok' : 'ko'}`}>{ok === undefined ? 'lecture…' : ok ? 'en service' : 'arrêté'}</p>
              <h2>{nom}</h2>
              <p className="petit">{detail}</p>
            </article>
          )
        })}
      </section>

    </main>
  )
}
