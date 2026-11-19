import { useState } from 'react'
import { MereEtEnfant } from './Illustrations.jsx'

/**
 * Photo d'une famille (public/photos/famille-accueil.jpg) : si le fichier est présent, il s'affiche ; sinon, l'illustration.
 * La photo doit être libre de droits ou fournie par l'équipe, avec l'accord écrit des personnes photographiées.
 */
export default function PhotoFamille() {
  const [absente, setAbsente] = useState(false)
  if (absente) return <MereEtEnfant />
  return <img className="photo-famille" style={{ objectPosition: "center 25%" }} src="/photos/famille-accueil.jpg" width="900" height="640" loading="lazy" alt="Un agent de santé sourit à un bébé pendant la consultation" onError={() => setAbsente(true)} />
}
