import Picto from './Picto.jsx'
import { saisonDuMois } from '../lib/saisons.js'

/** Ce qu'il faut faire en cette saison pour protéger les enfants. */
export default function ConseilSaison() {
  const s = saisonDuMois()
  return (
    <section className="carte conseil-saison" aria-labelledby="t-saison">
      <h2 id="t-saison"><Picto nom={s.picto} /> En ce moment : {s.nom.toLowerCase()}</h2>
      <ul>{s.conseils.map((c) => <li key={c}>{c}</li>)}</ul>
      <p className="petit">Périodes indicatives. Conseils à faire valider par un professionnel de santé.</p>
    </section>
  )
}
