import Bandeau from '../components/Bandeau.jsx'
import { INDICATEURS, PERIODE, versDhis2 } from '../lib/indicateurs.js'

function telecharger(nom, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }))
  const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

/** Les résultats en huit chiffres, et l'export vers le système de santé national. Valeurs fictives. */
export default function Indicateurs() {
  const csv = () => telecharger('fildor-indicateurs.csv', ['indicateur;periode;valeur;cible', ...INDICATEURS.map((i) => `${i.id};${PERIODE};${i.valeur};${i.cible}`)].join('\n'), 'text/csv;charset=utf-8')
  const dhis2 = () => telecharger('fildor-dhis2.json', JSON.stringify(versDhis2(), null, 2), 'application/json')
  return (
    <>
      <Bandeau surtitre="Responsable régional" titre="Indicateurs de résultats">Huit chiffres pour savoir si les enfants sont mieux suivis, et un export prêt pour le système de santé national. Données fictives de démonstration.</Bandeau>
      <div className="page indic">
        <ul className="indic-liste">
          {INDICATEURS.map((i) => {
            const part = Math.min(100, Math.round((i.valeur / i.cible) * 100))
            return (
              <li key={i.id} className="carte">
                <div><b>{i.nom}</b><span>{i.valeur}{i.unite} sur une cible de {i.cible}{i.unite}</span></div>
                <div className="indic-barre" role="img" aria-label={`${part} % de la cible`}><i style={{ width: `${part}%` }} /></div>
              </li>
            )
          })}
        </ul>
        <section className="carte" aria-labelledby="t-exp">
          <h2 id="t-exp">Export pour le système de santé national</h2>
          <p className="petit">Les mêmes chiffres, sans aucun nom d’enfant, au format d’échange DHIS2 (valeurs agrégées par période et par région). Les codes sont fictifs : il faudra les faire correspondre avec ceux du ministère de la Santé.</p>
          <div className="voix-actions">
            <button className="bouton" type="button" onClick={dhis2}>Télécharger au format DHIS2</button>
            <button className="bouton secondaire" type="button" onClick={csv}>Télécharger en tableur (CSV)</button>
          </div>
        </section>
      </div>
    </>
  )
}
