import { Link } from 'react-router-dom'
import Picto from './Picto.jsx'

/** Emplacement d'une vidéo éducative. Si le fichier existe (déclaré dans lib/videosEveil.js),
 *  on affiche un lecteur ; sinon une fiche « vidéo à venir » avec la consigne de tournage.
 *  Aucune vidéo n'est chargée d'Internet : elles seront enregistrées localement, avec les voix
 *  éwé, kabyè et tem, puis envoyées hors ligne avec la PWA. */
export default function VideoFiche({ titre, video, consigne, materiel }) {
  if (video) {
    return (
      <figure className="video-fiche">
        <video src={video} controls preload="metadata" playsInline />
        <figcaption className="petit">{titre} — vidéo à regarder avec un adulte, à côté de l'enfant.</figcaption>
      </figure>
    )
  }
  return (
    <figure className="video-fiche a-venir">
      <span className="video-cadre" aria-hidden="true"><Picto nom="video" /></span>
      <figcaption>
        <b>{titre}</b>
        {consigne && <p className="petit">{consigne}</p>}
        {materiel && <p className="petit">Matériel : {materiel}.</p>}
        <p className="petit source">Vidéo à venir : elle sera tournée avec des locuteurs natifs (éwé, kabyè, tem, français) et enregistrée dans l'application pour marcher sans réseau.</p>
      </figcaption>
    </figure>
  )
}

/** Lien discret vers la page de démonstration vidéo (utilisé par les pages espaces). */
export function LienEveil() {
  return <Link to="/jeux">Voir les jeux d'éveil</Link>
}
