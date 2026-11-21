import Bandeau from '../components/Bandeau.jsx'
import { useDonnees } from './Suivi.jsx'

const GRAVITE = { haute: 'pastille-prioritaire', moyenne: 'pastille-renforcer' }
const km = (v) => (v == null ? '–' : `${v} km`)

/** Où il manque quelque chose : un centre, un hôpital, une crèche ou un jardin d'enfants à portée des enfants. */
export default function Manques({ s }) {
  const [d, erreur] = useDonnees('manques', s.jeton, 30000)
  const liste = d?.manques ?? []
  const avec = liste.filter((v) => v.manques.length > 0)
  return (
    <>
      <Bandeau titre="Où il manque quelque chose">Pour chaque village : la distance au centre de santé, à l’hôpital et à la crèche ou au jardin d’enfants le plus proche. Les villages sans accès à portée sont en tête : c’est là qu’une aide change le plus de choses.</Bandeau>
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      {d && <p className="resume-villages" role="status">{avec.length === 0 ? 'Aucun manque repéré.' : `${avec.length} village${avec.length > 1 ? 's' : ''} avec au moins un manque.`}</p>}
      <ul className="villages-grille">
        {liste.map((v) => (
          <li key={v.id} className={`village ${v.manques.length ? 'village-prioritaire' : 'village-bonne'}`}>
            <div />
            <div>
              <h3>{v.nom} {v.manques.length > 0 && <span className="pastille pastille-prioritaire">{v.manques.length} manque{v.manques.length > 1 ? 's' : ''}</span>}</h3>
              <p className="petit">{v.enfants} enfants de 0 à 5 ans</p>
              <dl className="chiffres">
                <div><dt>Centre de santé</dt><dd>{km(v.plusProcheCentre)}</dd></div>
                <div><dt>Hôpital</dt><dd>{km(v.plusProcheHopital)}</dd></div>
                <div><dt>Crèche ou jardin</dt><dd>{v.plusProchePrescolaire === 0 ? 'Dans le village' : km(v.plusProchePrescolaire)}</dd></div>
              </dl>
              {v.manques.length > 0 && <ul className="liste-coches">{v.manques.map((m) => <li key={m.code}><span className={`pastille ${GRAVITE[m.gravite]}`}>{m.gravite === 'haute' ? 'Important' : 'À voir'}</span> {m.texte}.<br /><small>{m.conseil}</small></li>)}</ul>}
            </div>
          </li>
        ))}
      </ul>
      <p className="petit">Distances à vol d’oiseau sur la carte de démonstration. L’itinéraire réel (moto, voiture) est dans « Carte et itinéraires ».</p>
    </>
  )
}
