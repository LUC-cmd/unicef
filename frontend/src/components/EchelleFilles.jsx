import { useState } from 'react'

/**
 * Scénario « filles libérées pour l'école » : une crèche fiable décharge les grandes sœurs qui gardent les petits.
 * Les trois hypothèses sont fictives et modifiables : elles seront remplacées par une question posée aux familles, avec leur accord.
 */
export default function EchelleFilles() {
  const [places, setPlaces] = useState(120)
  const [soeurs, setSoeurs] = useState(25)
  const [ecole, setEcole] = useState(60)
  const libres = Math.round((places * soeurs * ecole) / 10000)
  const champ = (nom, val, set, min, max, pas, unite, aide) => (
    <label className="echelle-champ">
      <span>{nom} : <b>{val}{unite}</b></span>
      <input type="range" min={min} max={max} step={pas} value={val} onChange={(e) => set(Number(e.target.value))} />
      <small>{aide}</small>
    </label>
  )
  return (
    <section className="carte echelle" aria-labelledby="t-echelle">
      <h2 id="t-echelle">Combien de filles retournent ou restent à l’école ?</h2>
      <p className="petit">Dans beaucoup de familles, une fille de 8 à 14 ans garde les petits frères et sœurs et manque l’école. Une crèche fiable lui rend ces heures. Voici un scénario, avec des hypothèses fictives que vous pouvez changer.</p>
      {champ('Places occupées dans les crèches suivies', places, setPlaces, 20, 500, 10, '', 'Le nombre réel vient des réservations de crèche.')}
      {champ('Enfants gardés par une grande sœur sans crèche', soeurs, setSoeurs, 5, 60, 5, ' %', 'Hypothèse : à remplacer par une question posée à l’inscription, avec l’accord de la famille.')}
      {champ('Part de ces filles qui vont à l’école grâce à la crèche', ecole, setEcole, 10, 100, 5, ' %', 'Hypothèse : à mesurer avec les écoles de la zone.')}
      <p className="echelle-resultat" role="status" aria-live="polite"><b>{libres}</b> fille{libres > 1 ? 's' : ''} {libres > 1 ? 'libérées' : 'libérée'} pour l’école</p>
      <p className="petit">Calcul : {places} places × {soeurs} % × {ecole} %. Chiffres fictifs pour la démonstration : le prototype n’a pas été évalué sur le terrain.</p>
    </section>
  )
}
