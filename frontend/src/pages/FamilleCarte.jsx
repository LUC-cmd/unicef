import Bandeau from '../components/Bandeau.jsx'
import CarteItineraire from '../components/CarteItineraire.jsx'
import { lireCompte } from '../lib/famille.js'

/** Pour une famille : trouver le centre, la crèche ou l'école le plus utile, et savoir comment s'y rendre aujourd'hui. */
export default function FamilleCarte() {
  const compte = lireCompte()
  return (
    <>
      <Bandeau titre="Centres, crèches et écoles près de moi">Choisissez votre village et le lieu où aller : la carte montre la route, le temps en moto, en voiture ou à pied, et les obstacles signalés aujourd’hui.</Bandeau>
      <CarteItineraire departDefaut={compte?.codeZone && ['agbele', 'kpadape', 'zogbedji', 'davie', 'tovegan'].includes(compte.codeZone) ? compte.codeZone : 'agbele'} titreDestination="Je veux aller à" />
      <p className="petit">En cas de danger pour un enfant ou une femme enceinte, ne cherchez pas l’itinéraire : appelez le centre ou partez tout de suite.</p>
    </>
  )
}
