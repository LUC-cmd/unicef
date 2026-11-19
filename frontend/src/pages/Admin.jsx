import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { aujourdhuiIso } from '../lib/format.js'
import ModelesMessages from '../components/ModelesMessages.jsx'
import GestionComptes from '../components/GestionComptes.jsx'
import TableauAdmin from '../components/TableauAdmin.jsx'
import ReceptionCles from '../components/ReceptionCles.jsx'
import JournalAcces from '../components/JournalAcces.jsx'
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
function AdminAutres({ vue }) {
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

/** Un écran par vue : chaque vue est son propre composant, pour que React ne mélange pas leurs états. */
export default function Admin({ vue = 'services' }) {
  if (vue === 'services') return <TableauAdmin />
  if (vue === 'langues') {
    return (
      <main className="page">
        <Bandeau surtitre="Administrateur" titre="Messages et langues">
          Chaque famille reçoit ses messages dans sa langue. Une traduction ne part qu'une fois relue et validée.
        </Bandeau>
        <ModelesMessages />
      </main>
    )
  }
  if (vue === 'acces') {
    return (
      <main className="page">
        <Bandeau surtitre="Administrateur" titre="Comptes et structures">
          L'administrateur crée les responsables régionaux, un par région. Chaque responsable régional crée ensuite les agents, états civils, centres de santé et crèches de sa région.
        </Bandeau>
        <GestionComptes />
      </main>
    )
  }
  if (vue === 'cles') {
    return (
      <main className="page">
        <Bandeau surtitre="Administrateur" titre="Réception des clés USB">Les saisies faites sans réseau arrivent ici, puis partent dans la base.</Bandeau>
        <ReceptionCles />
      </main>
    )
  }
  if (vue === 'securite') {
    return (
      <main className="page">
        <Bandeau surtitre="Administrateur" titre="Cybersécurité">
          Journal des accès, détection d'anomalies et métriques de sécurité. Chaque consultation est tracée.
        </Bandeau>
        <JournalAcces />
      </main>
    )
  }
  return <AdminAutres vue={vue} />
}
