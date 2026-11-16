import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

const MDP_DEMO = import.meta.env.VITE_MDP_DEMO || 'FilDor2026!demo'

// Chaque étape ouvre une vraie page, déjà connectée avec le bon rôle : le jury manipule, il ne lit pas.
const ETAPES = [
  { titre: 'Une famille appelle depuis un téléphone simple', role: null, cible: '/telephone',
    faire: 'Composez le 90000031, choisissez « Vaccins », puis « Signes de danger ».', voir: 'Un message court, dans la langue de la famille.' },
  { titre: "L'agent de santé voit qui visiter en premier", role: 'agent.vo', cible: '/agent',
    faire: 'Ouvrez une famille en haut de la liste, saisissez un périmètre brachial, puis cochez « Simuler un village sans réseau ».',
    voir: "La saisie reste en attente. « Copier sur une clé » crée le fichier à porter là où il y a du réseau." },
  { titre: "La naissance est déclarée, puis l'acte est retiré", role: 'mairie', cible: '/mairie',
    faire: 'Validez une déclaration, cliquez « Voir la preuve », puis marquez un acte « prêt » et « retiré ».', voir: 'Un reçu et un code de preuve, et le suivi des actes non retirés.' },
  { titre: 'Le responsable régional décide où envoyer une équipe', role: 'decideur', cible: '/carte',
    faire: 'Cliquez sur une zone de la carte.', voir: "L'indice d'oubli, les graphiques par zone, jamais un enfant." },
  { titre: 'Les enfants jouent', role: null, cible: '/jeux',
    faire: 'Lancez « Compter » ou « Mains propres ».', voir: 'Des jeux avec voix et étoiles, sans compte.' },
]

export default function Visite() {
  const { connexion, deconnexion } = useAuth()
  const navigate = useNavigate()
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')

  async function aller(e, i) {
    setErreur('')
    setEnCours(i)
    try {
      if (e.role) await connexion(e.role, MDP_DEMO)
      else deconnexion()
      navigate(e.cible)
    } catch (err) { setErreur(err.message) } finally { setEnCours(null) }
  }

  return (
    <>
      <Bandeau surtitre="Pour le jury" titre="Essayer Fil d'Or en 5 minutes">
        Cinq étapes, cinq boutons. Chacun vous connecte avec le bon rôle et ouvre la page à manipuler. Toutes les données sont fictives.
      </Bandeau>
      <main className="page">
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <ol className="visite">
          {ETAPES.map((e, i) => (
            <li className="carte" key={e.titre}>
              <h2>{e.titre}</h2>
              <p><b>À faire :</b> {e.faire}</p>
              <p className="petit"><b>Ce que vous verrez :</b> {e.voir}</p>
              <button className="bouton" type="button" disabled={enCours !== null} onClick={() => aller(e, i)}>
                {enCours === i ? 'Ouverture…' : e.role ? `Ouvrir comme ${e.role.split('.')[0]}` : 'Ouvrir'}
              </button>
            </li>
          ))}
        </ol>
      </main>
    </>
  )
}
