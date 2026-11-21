import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { useDonnees } from './Suivi.jsx'

const FLECHE = { hausse: ['▲', 'tendance-hausse', 'en hausse'], baisse: ['▼', 'tendance-baisse', 'en baisse'], stable: ['■', 'tendance-stable', 'stable'] }

function Mini({ serie, couleur }) {
  const W = 120, H = 36, max = Math.max(...serie, 1), min = Math.min(...serie, 0)
  const p = serie.map((v, i) => `${i ? 'L' : 'M'}${(i * (W - 6)) / (serie.length - 1) + 3} ${H - 4 - ((v - min) / Math.max(1, max - min)) * (H - 8)}`).join(' ')
  return <svg viewBox={`0 0 ${W} ${H}`} className="mini" aria-hidden="true"><path d={p} fill="none" stroke={couleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

/** Tableau national : l'évolution de chaque domaine, région par région, pour décider où renforcer. */
export default function National({ s }) {
  const [d, erreur] = useDonnees('national', s.jeton, 60000)
  const [dom, setDom] = useState('vaccination')
  if (!d) return <><Bandeau titre="Tableau national">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const lib = d.domaines.find((x) => x.id === dom)?.libelle
  const lignes = [...d.regions].sort((a, b) => b.valeurs[dom].dernier - a.valeurs[dom].dernier)
  const baisses = d.regions.flatMap((r) => r.alertes.map((a) => ({ region: r.nom, domaine: a })))
  const serie = d.pays.series[dom]
  const mois = d.mois.map((m) => m.slice(5) + '/' + m.slice(2, 4))
  return (
    <>
      <Bandeau titre={`Tableau national : ${d.pays.nom}`}>Où la santé, la nutrition, l’éveil et l’usage des services par les jeunes filles progressent, et où ils reculent. Pour décider où envoyer les moyens.</Bandeau>
      <div className="tuiles">
        <div className="tuile"><b>{serie[5]} %</b><span>{lib}, moyenne du pays</span></div>
        <div className="tuile"><b>{serie[5] - serie[2] >= 0 ? '+' : ''}{serie[5] - serie[2]} pts</b><span>sur 3 mois</span></div>
        <div className={`tuile ${baisses.length ? 'alerte' : ''}`}><b>{baisses.length}</b><span>recul{baisses.length > 1 ? 's' : ''} à examiner</span></div>
      </div>
      <div className="filtres" role="tablist" aria-label="Domaine">{d.domaines.map((x) => <button key={x.id} type="button" role="tab" aria-selected={dom === x.id} className={`filtre${dom === x.id ? ' actif' : ''}`} onClick={() => setDom(x.id)}>{x.libelle}</button>)}</div>
      <section className="carte">
        <h2>{lib} : région par région</h2>
        <div className="table-defile">
          <table className="table-references">
            <thead><tr><th>Région</th><th>Maintenant</th><th>Sur 3 mois</th><th>Évolution sur 6 mois ({mois[0]} à {mois[5]})</th></tr></thead>
            <tbody>
              {lignes.map((r) => {
                const v = r.valeurs[dom], [fl, cl, tx] = FLECHE[v.tendance]
                return (
                  <tr key={r.id}>
                    <td><b>{r.nom}</b>{v.reel && <span className="pastille pastille-bonne"> en direct</span>}</td>
                    <td>
                      <span className="barre-piste barre-courte"><span className={`barre-val ${v.dernier < 50 ? 'barre-prioritaire' : v.dernier < 65 ? 'barre-renforcer' : 'barre-bonne'}`} style={{ width: `${v.dernier}%` }} /></span> <b>{v.dernier} %</b>
                    </td>
                    <td className={cl}><span aria-hidden="true">{fl}</span> {v.variation > 0 ? '+' : ''}{v.variation} pts <small>({tx})</small></td>
                    <td><Mini serie={v.serie} couleur={v.tendance === 'baisse' ? '#c8372b' : '#0e7c86'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="carte">
        <h2>Régions à examiner en priorité</h2>
        {baisses.length === 0 ? <p>Aucun recul net sur 3 mois.</p> : <ul className="liste-coches">{baisses.map((b, i) => <li key={i}><b>{b.region}</b> : {b.domaine.toLowerCase()} en baisse.</li>)}</ul>}
      </section>
      <p className="petit">{d.avertissement}</p>
    </>
  )
}
