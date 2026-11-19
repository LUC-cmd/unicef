import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'

/** Nouveau-nés de petit poids : la première semaine à la maison, jour 1, jour 3, jour 7. */
export default function Fragiles() {
  const [l, setL] = useState(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => { api.get('/api/agent/fragiles').then(setL).catch((e) => setErreur(e.message)) }, [])
  const pastille = (fait, du) => <span className={`jour-p ${fait ? 'ok' : du ? 'manque' : ''}`}>{fait ? '✓' : du ? '!' : '·'}</span>
  return (
    <>
      <Bandeau surtitre="Nouveau-nés fragiles" titre="La première semaine à la maison">
        Un bébé de moins de 2 500 g est visité à J1, J3 et J7. Ce qui manque s'affiche en rouge.
      </Bandeau>
      <main className="page">
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {l && l.length === 0 && <section className="carte"><p>Aucun nouveau-né de petit poids dans les 15 derniers jours. Notez le poids à la naissance sur la fiche de l'enfant pour l'ajouter ici.</p></section>}
        <div className="grille">
          {(l || []).map((b) => (
            <article key={b.codeEnfant} className={`carte${b.aFaire.includes('à faire') ? ' attention' : ''}`}>
              <h3><Link to={`/agent/visites?enfant=${b.codeEnfant}`}>{b.codeEnfant}</Link></h3>
              <p className="petit">Né(e) le {formaterDate(b.dateNaissance)} · jour {b.jour} · {b.poidsG} g · {b.zone}</p>
              <div className="jours-p">
                <div>{pastille(b.j1, b.jour >= 2)}<small>J1</small></div>
                <div>{pastille(b.j3, b.jour >= 4)}<small>J3</small></div>
                <div>{pastille(b.j7, b.jour >= 9)}<small>J7</small></div>
              </div>
              <p><b>{b.aFaire}</b></p>
            </article>
          ))}
        </div>
        <section className="carte">
          <h3>Et les bracelets connectés ?</h3>
          <p>Au centre de santé, des bracelets peuvent suivre les nouveau-nés fragiles. Fil d'Or n'a pas besoin du bracelet pour fonctionner : l'agent note la visite, le poids et le signe de danger. Sur la fiche d'un nouveau-né de moins d'un mois, l'agent note la température et le pouls lus sur le bracelet. Si une valeur sort des repères, Fil d'Or dit d'orienter le bébé vers le centre de santé le jour même. Plus tard, le bracelet pourra envoyer ses mesures lui-même, par le même chemin.</p>
        </section>
      </main>
    </>
  )
}
