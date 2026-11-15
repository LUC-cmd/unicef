import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth, useReseau } from '../lib/contexte.jsx'
import { LIBELLE_PORTE, ageLisible } from '../lib/format.js'
import { lireFile, nombreEnAttente } from '../lib/offline.js'

const LIBELLE = {
  AGENT: 'Agent de santé',
  MAIRIE: 'État civil',
  DECIDEUR: 'Responsable régional',
  STRUCTURE: 'Structure',
  ADMIN: 'Administrateur',
}

export default function Tableau() {
  const { session } = useAuth()
  if (session.role === 'AGENT' || session.role === 'ADMIN') return <BureauAgent session={session} />
  return <BureauSimple session={session} />
}

function BureauAgent({ session }) {
  const { enLigne, simuleHorsLigne, setSimuleHorsLigne } = useReseau()
  const [liste, setListe] = useState([])
  const [erreur, setErreur] = useState('')
  const [attente] = useState(() => nombreEnAttente(lireFile()))
  const prenom = (session.nomComplet || 'Bonjour').split(' ')[0]

  const charger = useCallback(async () => {
    if (!enLigne) { setErreur('hors'); return }
    try {
      setListe(await api.get('/api/agent/visites'))
      setErreur('')
    } catch (e) {
      setErreur(e.message)
    }
  }, [enLigne])

  useEffect(() => { charger() }, [charger])

  const urgents = liste.filter((l) => l.priorite.niveau === 'URGENT')
  const grossesses = liste.filter((l) => l.statut === 'GROSSESSE')
  const apercu = (urgents.length ? urgents : liste).slice(0, 6)

  return (
    <main className="page bureau">
      <header className="bureau-tete">
        <div>
          <span className="bandeau-sur">{LIBELLE[session.role]}</span>
          <h1>Bonjour {prenom}</h1>
          <p>Inscrivez une famille, ou ouvrez celles qui n'ont pas répondu. Sans réseau, la saisie reste sur ce téléphone.</p>
        </div>
        <Link className="bouton" to="/agent/inscription">Inscrire une famille</Link>
      </header>

      <div className="tuiles">
        <div className="tuile"><b>{liste.length || '—'}</b><span>familles et grossesses</span></div>
        <div className={`tuile ${urgents.length ? 'alerte' : ''}`}><b>{liste.length ? urgents.length : '—'}</b><span>à voir en urgence</span></div>
        <div className="tuile"><b>{liste.length ? grossesses.length : '—'}</b><span>grossesses suivies</span></div>
        <div className="tuile"><b>{attente}</b><span>en attente d'envoi</span></div>
      </div>

      <div className="bureau-corps">
        <section className="carte bureau-liste">
          <div className="barre-titre">
            <h2>À voir maintenant</h2>
            <Link to="/agent">Toute la liste</Link>
          </div>
          {erreur && (
            <p>Le serveur ne répond pas, ou le village est sans réseau. L'inscription fonctionne quand même : elle partira au retour du réseau.</p>
          )}
          <ul className="liste-visites">
            {apercu.map((l) => (
              <li key={l.codeEnfant}>
                <Link className="ligne" to={`/agent?enfant=${encodeURIComponent(l.codeEnfant)}`}>
                  <span>
                    <b>{l.codeEnfant}</b> <span className="petit">{l.codeFamille} · {l.zone}</span><br />
                    <span className="petit">
                      {l.statut === 'GROSSESSE' ? 'Grossesse' : ageLisible(l.dateNaissance)} · {LIBELLE_PORTE[l.porte]}
                    </span>
                    {l.priorite.raisons[0] && <span className="raisons">{l.priorite.raisons[0]}</span>}
                  </span>
                  <span className={`pastille ${l.priorite.niveau.toLowerCase()}`}>
                    {l.priorite.niveau === 'URGENT' ? 'Urgent' : l.priorite.niveau === 'PRIORITAIRE' ? 'Prioritaire' : 'Normal'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="village">
          <h2>Village sans réseau</h2>
          <p>La famille n'a pas de compte. Sur un téléphone simple elle compose <b>*789#</b>.</p>
          <ol>
            <li>Elle écoute un conseil, ou elle signale un problème.</li>
            <li>C'est vous qui l'inscrivez, chez elle, avec un code.</li>
            <li>Votre téléphone garde la fiche. Au centre, elle part toute seule.</li>
          </ol>
          <Link className="bouton clair" to="/telephone?porte=ussd">Ouvrir la simulation *789#</Link>
          <label className="interrupteur">
            <input type="checkbox" checked={simuleHorsLigne} onChange={(e) => setSimuleHorsLigne(e.target.checked)} />
            Simuler ce village sans réseau
          </label>
          <p className="petit village-note">{enLigne ? 'En ligne : les saisies partent tout de suite.' : 'Hors ligne : rien n\'est perdu.'}</p>
        </aside>
      </div>
    </main>
  )
}

const AUTRES = {
  MAIRIE: {
    phrase: 'Les dossiers de naissance arrivent déjà remplis. Vous validez, ou vous dites ce qui manque.',
    action: { to: '/mairie', titre: 'Ouvrir les déclarations' },
  },
  STRUCTURE: {
    phrase: 'Une famille demande un rappel. Vous répondez avec son code. Son numéro ne s\'affiche pas.',
    action: { to: '/structure', titre: 'Voir les demandes' },
  },
  DECIDEUR: {
    phrase: 'La carte montre des zones, jamais un enfant. En dessous de cinq familles, le détail est masqué.',
    action: { to: '/carte', titre: 'Ouvrir la carte' },
  },
}

function BureauSimple({ session }) {
  const bloc = AUTRES[session.role] ?? AUTRES.DECIDEUR
  const prenom = (session.nomComplet || 'Bonjour').split(' ')[0]
  return (
    <main className="page bureau">
      <header className="bureau-tete">
        <div>
          <span className="bandeau-sur">{LIBELLE[session.role] ?? 'Espace'}</span>
          <h1>Bonjour {prenom}</h1>
          <p>{bloc.phrase}</p>
        </div>
        <Link className="bouton" to={bloc.action.to}>{bloc.action.titre}</Link>
      </header>
      <aside className="village">
        <h2>Sans internet</h2>
        <p>Dans un village sans réseau, la famille compose <b>*789#</b> sur un téléphone simple. L'agent inscrit sur place. Rien ne dépend d'une application.</p>
        <Link className="bouton clair" to="/telephone?porte=ussd">Voir le *789#</Link>
      </aside>
    </main>
  )
}
