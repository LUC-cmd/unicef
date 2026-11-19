import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MOMENTS } from '../lib/momentsFil.js'
import { etapeParCode } from '../lib/etapes.js'

/** Le fil d'or, à manipuler : on fait avancer l'enfant, de la grossesse à cinq ans, et on voit ce que chacun reçoit. */
export default function FilInteractif() {
  const [i, setI] = useState(0)
  const m = MOMENTS[i]
  const etape = etapeParCode(m.etape)
  const n = MOMENTS.length - 1
  const pct = (i / n) * 100
  return (
    <section className="fil-vivant" aria-labelledby="t-fil-vivant">
      <div className="interieur">
        <h2 id="t-fil-vivant" className="titre-section">Faites avancer l'enfant</h2>
        <p className="chapeau-fil">Glissez le curseur : voyez ce que Fil d'Or déclenche pour la famille, l'agent de santé et le responsable régional à chaque moment, de la grossesse à cinq ans.</p>

        <div className="fil-piste" style={{ '--p': `${pct}%`, '--c': etape?.couleur ?? '#e0a100' }}>
          <div className="fil-rail" aria-hidden="true"><i /></div>
          <ol className="fil-reperes">
            {MOMENTS.map((x, k) => (
              <li key={x.cle} className={k < i ? 'fait' : k === i ? 'ici' : ''} style={{ left: `${(k / n) * 100}%` }}>
                <button type="button" onClick={() => setI(k)} aria-label={x.titre}><span /></button>
              </li>
            ))}
          </ol>
          <input type="range" min="0" max={n} step="1" value={i} onChange={(e) => setI(Number(e.target.value))}
                 aria-label="Moment de la vie de l'enfant" aria-valuetext={m.titre} />
        </div>

        <div className="fil-titre" key={m.cle}>
          <b>{m.titre}</b>
          {etape && <span>Étape : {etape.nom}</span>}
        </div>

        <div className="fil-trois" key={`c-${m.cle}`}>
          <article><h3>La famille reçoit</h3><p>{m.famille}</p></article>
          <article><h3>L'agent de santé fait</h3><p>{m.agent}</p></article>
          <article><h3>Le responsable régional voit</h3><p>{m.decideur}</p></article>
        </div>
        <p className="fil-evite"><b>Ce que ça évite :</b> {m.evite}</p>
        <p><Link className="bouton secondaire" to="/impact">Voir l'innovation et l'impact, étape par étape</Link></p>
      </div>
    </section>
  )
}
