import { useSearchParams } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import CarteItineraire from '../components/CarteItineraire.jsx'

/** Carte et itinéraires dans l'espace professionnel : on arrive avec le village de départ et la destination si on vient d'un cas. */
export default function CarteReseau({ s }) {
  const [q] = useSearchParams()
  const defaut = s.role === 'centre' ? { de: q.get('de') || 'agbele', vers: q.get('vers') || s.ref } : { de: q.get('de') || 'agbele', vers: q.get('vers') || '' }
  return (
    <>
      <Bandeau titre="Carte et itinéraires">Voyez les hôpitaux, centres, crèches, jardins d’enfants et écoles, la route à prendre (moto, voiture, à pied) et les obstacles signalés.</Bandeau>
      <CarteItineraire key={defaut.de + defaut.vers} jeton={s.jeton} role={s.role} departDefaut={defaut.de} versDefaut={defaut.vers} />
    </>
  )
}
