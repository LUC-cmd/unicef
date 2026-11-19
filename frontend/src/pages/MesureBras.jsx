import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { lireBras } from '../lib/petiteEnfance.js'

/** Mesure du bras avec un ruban de couleur : un repérage rapide de la malnutrition, pour les enfants de 6 mois à 5 ans. */
export default function MesureBras() {
  const [mm, setMm] = useState('')
  const [oedeme, setOedeme] = useState(false)
  const valeur = Number(mm)
  const valide = mm !== '' && valeur >= 60 && valeur <= 250
  const res = valide || oedeme ? lireBras(valide ? valeur : 200, oedeme) : null
  return (
    <>
      <Bandeau surtitre="Pour mon enfant" titre="Mesure du bras">Un ruban autour du bras gauche, au milieu entre l’épaule et le coude, dit en quelques secondes si l’enfant a assez à manger. Pour les enfants de 6 mois à 5 ans.</Bandeau>
      <main className="page soins">
        <section className="carte">
          <label>Mesure du bras, en millimètres
            <input type="number" inputMode="numeric" min="60" max="250" placeholder="par exemple 130" value={mm} onChange={(e) => setMm(e.target.value)} />
          </label>
          <p className="petit">Sur le ruban : vert à partir de 125 mm, jaune de 115 à 124 mm, rouge sous 115 mm.</p>
          <label className="soin-case"><input type="checkbox" checked={oedeme} onChange={(e) => setOedeme(e.target.checked)} /> Les deux pieds de l’enfant sont gonflés</label>
        </section>
        {mm !== '' && !valide && !oedeme && <p className="petit" role="alert">Entrez une mesure entre 60 et 250 millimètres.</p>}
        {res && <ResultatSoins {...res} />}
        <p className="petit">Seuils habituels de dépistage, à faire valider par un professionnel de santé. Ce n’est pas un diagnostic.</p>
      </main>
    </>
  )
}
