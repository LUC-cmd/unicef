import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ETAPES_PARCOURS, etapeParCode } from '../lib/etapes.js'
import { DOMAINES, MATRICE } from './Parcours.jsx'
import IconeEtape from '../components/IconeEtape.jsx'

const FL = <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function EtapeParcours() {
  const { etape } = useParams()
  const e = etapeParCode(etape)
  useEffect(() => { document.querySelector('.rail-etapes a.actif')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [etape])
  if (!e) return <Navigate to="/parcours" replace />
  const i = ETAPES_PARCOURS.indexOf(e)
  const prec = ETAPES_PARCOURS[i - 1]
  const suiv = ETAPES_PARCOURS[i + 1]
  return (
    <div className="etape-page" style={{ '--c': e.couleur }} key={e.code}>
      <header className="etape-hero">
        <div className="interieur">
          <Link to="/parcours" className="etape-fil">Un enfant, un parcours</Link>
          <div className="etape-hero-corps">
            <span className="etape-hero-icone"><IconeEtape nom={e.icone} taille={54} /></span>
            <div>
              <p className="etape-hero-age">Étape {i + 1} sur 6 · {e.age}</p>
              <h1>{e.nom}</h1>
              <p className="etape-hero-accroche">{e.accroche}</p>
            </div>
          </div>
          <nav className="rail-etapes" aria-label="Les six étapes">
            {ETAPES_PARCOURS.map((x, k) => (
              <Link key={x.code} to={`/parcours/${x.code}`} className={x.code === e.code ? 'actif' : k < i ? 'fait' : ''} aria-current={x.code === e.code ? 'step' : undefined}>
                <span>{k + 1}</span><b>{x.nom}</b>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="interieur etape-corps">
        <section aria-labelledby="t-qui">
          <h2 id="t-qui" className="titre-section">Qui voit quoi</h2>
          <div className="trois-cartes">
            {[['La famille', e.famille], ["L'agent de santé", e.agent], ['Le responsable régional', e.decideur]].map(([t, d]) => (
              <article className="carte-etape" key={t}><h3>{t}</h3><p>{d}</p></article>
            ))}
          </div>
        </section>

        <section aria-labelledby="t-moments">
          <h2 id="t-moments" className="titre-section">Les moments clés</h2>
          <ol className="moments">
            {e.moments.map((m, k) => <li key={m} style={{ '--i': k }}><span>{k + 1}</span>{m}</li>)}
          </ol>
        </section>

        <section aria-labelledby="t-domaines">
          <h2 id="t-domaines" className="titre-section">Cinq domaines, un seul carnet</h2>
          <ul className="domaines-boutons">
            {DOMAINES.map((d, k) => (
              <li key={d} style={{ '--i': k }}>
                <Link to={MATRICE[e.code][d][1]} className="domaine-bouton">
                  <b>{d}</b><span>{MATRICE[e.code][d][0]}</span><em>Voir {FL}</em>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="t-essai">
          <h2 id="t-essai" className="titre-section">Essayer maintenant</h2>
          <div className="trois-cartes">
            {e.actions.map(([t, to, d]) => (
              <Link key={to + t} to={to} className="action-grande"><b>{t}</b><span>{d}</span><i>{FL}</i></Link>
            ))}
          </div>
        </section>

        <nav className="etape-suite" aria-label="Étape précédente et suivante">
          {prec ? <Link to={`/parcours/${prec.code}`} className="suite prec"><small>Étape précédente</small><b>{prec.nom}</b></Link> : <Link to="/parcours" className="suite prec"><small>Retour</small><b>Toutes les étapes</b></Link>}
          {suiv ? <Link to={`/parcours/${suiv.code}`} className="suite suiv"><small>Étape suivante</small><b>{suiv.nom}</b></Link> : <Link to="/" className="suite suiv"><small>Terminé</small><b>Retour à l'accueil</b></Link>}
        </nav>
      </main>
    </div>
  )
}
