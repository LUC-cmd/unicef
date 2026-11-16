// Graphiques simples en HTML et SVG, sans bibliothèque : légers, lisibles hors ligne, accessibles au lecteur d'écran.

/** Barres horizontales. items : { nom, valeur, couleur?, texte? }. Les valeurs vont de 0 à max. */
export function Barres({ titre, items, max = 100, unite = '' }) {
  return (
    <figure className="graphe" aria-label={titre}>
      {titre && <figcaption className="graphe-titre">{titre}</figcaption>}
      <ul className="barres">
        {items.map((it) => (
          <li key={it.nom}>
            <span className="barre-nom">{it.nom}</span>
            <span className="barre-piste" aria-hidden="true">
              <span className="barre-rempli" style={{ width: `${Math.max(0, Math.min(100, ((it.valeur ?? 0) / max) * 100))}%`, background: it.couleur || 'var(--cyan)' }} />
            </span>
            <span className="barre-valeur">{it.valeur === null || it.valeur === undefined ? '—' : `${it.texte ?? it.valeur}${unite}`}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Anneau. parts : { nom, valeur, couleur }. Le total au centre est celui des parts. */
export function Anneau({ titre, parts, centre }) {
  const total = parts.reduce((n, p) => n + p.valeur, 0)
  const R = 52
  const C = 2 * Math.PI * R
  let decalage = 0
  return (
    <figure className="graphe anneau" aria-label={titre}>
      {titre && <figcaption className="graphe-titre">{titre}</figcaption>}
      <div className="anneau-corps">
        <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={parts.map((p) => `${p.nom} : ${p.valeur}`).join(', ')}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="#e6eef2" strokeWidth="16" />
          {total > 0 && parts.map((p) => {
            const longueur = (p.valeur / total) * C
            const cercle = (
              <circle key={p.nom} cx="70" cy="70" r={R} fill="none" stroke={p.couleur} strokeWidth="16"
                      strokeDasharray={`${longueur} ${C - longueur}`} strokeDashoffset={-decalage} transform="rotate(-90 70 70)" />
            )
            decalage += longueur
            return cercle
          })}
          <text x="70" y="76" textAnchor="middle" fontSize="24" fontWeight="700" fill="#2d2926" style={{ fontFamily: 'var(--police-titre)' }}>{centre ?? total}</text>
        </svg>
        <ul className="anneau-legende">
          {parts.map((p) => <li key={p.nom}><i style={{ background: p.couleur }} />{p.nom} <b>{p.valeur}</b></li>)}
        </ul>
      </div>
    </figure>
  )
}
