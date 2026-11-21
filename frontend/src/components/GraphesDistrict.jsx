import { useState } from 'react'


/* Graphiques en SVG simple : fins, lisibles, avec une vue « tableau » pour les lecteurs d'écran et l'impression. */

const jourCourt = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).replace('.', '')

function Cadre({ titre, aide, colonnes, lignes, children }) {
  const [tableau, setTableau] = useState(false)
  return (
    <figure className="graphe">
      <figcaption>
        <b>{titre}</b>
        {aide && <span className="petit"> {aide}</span>}
        <button type="button" className="bouton secondaire petit-bouton" aria-pressed={tableau} onClick={() => setTableau((t) => !t)}>{tableau ? 'Voir le graphique' : 'Voir en tableau'}</button>
      </figcaption>
      {tableau ? (
        <div className="table-defile">
          <table className="table-references">
            <thead><tr>{colonnes.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{lignes.map((l, i) => <tr key={i}>{l.map((x, j) => <td key={j}>{x}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </figure>
  )
}

/** Deux courbes sur 7 jours : références envoyées (pointillé) et prises en charge (trait plein). */
export function Tendance({ donnees }) {
  const W = 560, H = 220, g = 34, d = 18
  const max = Math.max(4, ...donnees.flatMap((x) => [x.envoyees, x.prises]))
  const haut = Math.ceil(max / 2) * 2
  const x = (i) => g + (i * (W - g - d)) / Math.max(1, donnees.length - 1)
  const y = (v) => H - 30 - (v * (H - 30 - d)) / haut
  const trace = (cle) => donnees.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[cle]).toFixed(1)}`).join(' ')
  const graduations = [0, haut / 2, haut]
  return (
    <Cadre titre="Références sur 7 jours" aide="Envoyées et prises en charge, par jour." colonnes={['Jour', 'Envoyées', 'Prises en charge']} lignes={donnees.map((p) => [jourCourt(p.jour), p.envoyees, p.prises])}>
      <svg viewBox={`0 0 ${W} ${H}`} className="svg-graphe" role="img" aria-label="Références envoyées et prises en charge sur les sept derniers jours">
        {graduations.map((v) => <g key={v}><line x1={g} x2={W - d} y1={y(v)} y2={y(v)} className="g-grille" /><text x={g - 8} y={y(v) + 4} textAnchor="end" className="g-texte">{v}</text></g>)}
        <path d={trace('envoyees')} className="g-ligne g-envoyees" />
        <path d={trace('prises')} className="g-ligne g-prises" />
        {donnees.map((p, i) => <g key={p.jour}>
          <circle cx={x(i)} cy={y(p.prises)} r="4" className="g-point" ><title>{`${jourCourt(p.jour)} : ${p.envoyees} envoyées, ${p.prises} prises en charge`}</title></circle>
          <text x={x(i)} y={H - 10} textAnchor="middle" className="g-texte">{jourCourt(p.jour)}</text>
        </g>)}
      </svg>
      <p className="legende"><span className="trait trait-prises" /> Prises en charge <span className="trait trait-envoyees" /> Envoyées</p>
    </Cadre>
  )
}

/** Couverture par village, avec le repère de 60 %. */
export function Couverture({ villages, objectif = 60 }) {
  const ordre = [...villages].sort((a, b) => b.couverture - a.couverture)
  return (
    <Cadre titre="Enfants vus par village" aide={`Le trait marque l’objectif de ${objectif} %.`} colonnes={['Village', 'Enfants vus', 'Inscrits', 'Couverture']} lignes={ordre.map((v) => [v.nom, v.vus, v.enfants, `${v.couverture} %`])}>
      <ul className="barres" aria-label="Couverture par village">
        {ordre.map((v) => (
          <li key={v.id}>
            <span className="barre-nom">{v.nom}</span>
            <span className="barre-piste" style={{ '--obj': `${objectif}%` }}><span className={`barre-val barre-${v.priorite}`} style={{ width: `${v.couverture}%` }} /></span>
            <span className="barre-pct">{v.couverture} %</span>
          </li>
        ))}
      </ul>
    </Cadre>
  )
}

/** Délai médian de prise en charge par centre. */
export function DelaiCentres({ centres, delaiLisible }) {
  const avec = centres.filter((c) => c.delaiMedianMin != null)
  const max = Math.max(60, ...avec.map((c) => c.delaiMedianMin))
  return (
    <Cadre titre="Délai jusqu’à la prise en charge" aide="Médiane par centre : le plus court est le plus rapide." colonnes={['Centre', 'Références', 'Prises en charge', 'Délai médian']} lignes={centres.map((c) => [c.nom, c.total, c.prises, delaiLisible(c.delaiMedianMin)])}>
      <ul className="barres" aria-label="Délai par centre">
        {centres.map((c) => (
          <li key={c.id}>
            <span className="barre-nom barre-nom-long">{c.nom.replace(' (fictif)', '')}</span>
            <span className="barre-piste">{c.delaiMedianMin != null && <span className="barre-val barre-delai" style={{ width: `${Math.max(3, (100 * c.delaiMedianMin) / max)}%` }} />}</span>
            <span className="barre-pct">{delaiLisible(c.delaiMedianMin)}</span>
          </li>
        ))}
      </ul>
    </Cadre>
  )
}

/** Répartition par type de cas : une barre empilée avec ses étiquettes, sans camembert. */
export function ParCas({ donnees }) {
  const total = donnees.reduce((a, x) => a + x.total, 0) || 1
  return (
    <Cadre titre="Type de cas référés" colonnes={['Type de cas', 'Références', 'Part']} lignes={donnees.map((x) => [x.libelle, x.total, `${Math.round((100 * x.total) / total)} %`])}>
      <div className="empile" role="img" aria-label="Répartition des références par type de cas">
        {donnees.filter((x) => x.total).map((x, i) => <span key={x.cas} className={`empile-${i}`} style={{ flexGrow: x.total }} title={`${x.libelle} : ${x.total}`} />)}
      </div>
      <ul className="legende-liste">{donnees.map((x, i) => <li key={x.cas}><span className={`pcas empile-${i}`} /> {x.libelle} <b>{x.total}</b></li>)}</ul>
    </Cadre>
  )
}

/** Anneaux de pourcentage, un par domaine : on voit tout de suite le plus faible. */
export function Anneaux({ titre, aide, items }) {
  const R = 26, C = 2 * Math.PI * R
  return (
    <Cadre titre={titre} aide={aide} colonnes={['Domaine', 'Acquis']} lignes={items.map((i) => [i.nom, `${i.pct} %`])}>
      <ul className="anneaux">
        {items.map((i) => (
          <li key={i.id} className={i.pct < 50 ? 'anneau-bas' : ''}>
            <svg viewBox="0 0 64 64" className="anneau" role="img" aria-label={`${i.nom} : ${i.pct} %`}>
              <circle cx="32" cy="32" r={R} className="anneau-fond" />
              <circle cx="32" cy="32" r={R} className="anneau-val" strokeDasharray={C} strokeDashoffset={C * (1 - i.pct / 100)} transform="rotate(-90 32 32)" />
              <text x="32" y="37" textAnchor="middle">{i.pct} %</text>
            </svg>
            <span>{i.nom}</span>
          </li>
        ))}
      </ul>
    </Cadre>
  )
}

/** Une courbe simple : évolution d'un pourcentage au fil des mois. */
export function Evolution({ titre, donnees, aide }) {
  const W = 560, H = 200, g = 34, d = 18
  const x = (i) => g + (i * (W - g - d)) / Math.max(1, donnees.length - 1)
  const y = (v) => H - 30 - (v * (H - 30 - d)) / 100
  const trace = donnees.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(' ')
  return (
    <Cadre titre={titre} aide={aide} colonnes={['Mois', 'Indice']} lignes={donnees.map((p) => [p.etiquette, `${p.pct} %`])}>
      <svg viewBox={`0 0 ${W} ${H}`} className="svg-graphe" role="img" aria-label={titre}>
        {[0, 50, 100].map((v) => <g key={v}><line x1={g} x2={W - d} y1={y(v)} y2={y(v)} className="g-grille" /><text x={g - 8} y={y(v) + 4} textAnchor="end" className="g-texte">{v}</text></g>)}
        <path d={trace} className="g-ligne g-prises" />
        {donnees.map((p, i) => <g key={p.etiquette}><circle cx={x(i)} cy={y(p.pct)} r="4" className="g-point"><title>{`${p.etiquette} : ${p.pct} %`}</title></circle><text x={x(i)} y={H - 10} textAnchor="middle" className="g-texte">{p.etiquette}</text></g>)}
      </svg>
    </Cadre>
  )
}
