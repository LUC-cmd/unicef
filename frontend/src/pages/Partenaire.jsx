import Bandeau from '../components/Bandeau.jsx'
import { useDonnees } from './Suivi.jsx'
import National from './National.jsx'

const csv = (lignes) => lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')

/** Compte partenaire (UNICEF) : tout voir, rien modifier. Des totaux et des tendances, jamais une personne. */
export default function Partenaire({ s }) {
  const [nat] = useDonnees('national', s.jeton, 60000)
  const [bor] = useDonnees('bornes', s.jeton, 60000)
  const rapport = () => {
    if (!nat) return
    const l = [['Région', 'Domaine', 'Valeur actuelle (%)', 'Évolution sur 3 mois (pts)', 'Tendance']]
    for (const r of nat.regions) for (const d of nat.domaines) { const v = r.valeurs[d.id]; l.push([r.nom, d.libelle, v.dernier, v.dernier - (v.serie?.[2] ?? v.dernier), v.tendance]) }
    l.push([], ['Données fictives de démonstration. Aucune donnée personnelle.'])
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv(l)], { type: 'text/csv;charset=utf-8' })); a.download = 'fildor-rapport-national.csv'; a.click(); URL.revokeObjectURL(a.href)
  }
  const bornes = bor?.bornes ?? []
  return (
    <>
      <section className="partenaire-entete">
        <div><p className="petit">Partenaire en lecture seule</p><h1>UNICEF Togo</h1><p>Suivre où les enfants de 0 à 5 ans, les mères et les jeunes filles progressent, et où ils reculent, pour orienter les moyens. Vous ne pouvez rien modifier ici.</p></div>
        <div className="partenaire-actions">
          <button type="button" className="bouton" onClick={rapport} disabled={!nat}>Télécharger le rapport (CSV)</button>
          <button type="button" className="bouton secondaire" onClick={() => window.print()}>Imprimer cette page</button>
        </div>
      </section>
      <div className="tuiles">
        <div className="tuile"><b>{nat ? nat.regions.length : '…'}</b><span>régions suivies</span></div>
        <div className="tuile"><b>{bornes.length || '…'}</b><span>bornes ({bornes.filter((b) => b.reseau === 'aucun').length} sans réseau)</span></div>
        <div className="tuile"><b>{bornes.reduce((a, b) => a + b.retraits, 0)}</b><span>retraits de produits aux bornes</span></div>
        <div className={`tuile ${bornes.some((b) => b.etat !== 'ok') ? 'alerte' : ''}`}><b>{bornes.filter((b) => b.etat !== 'ok').length}</b><span>bornes à surveiller</span></div>
      </div>
      <National s={s} />
      <section className="carte">
        <h2>Ce que ce compte permet</h2>
        <ul className="liste-coches">
          <li>Voir le tableau national, région par région et par domaine, avec l’évolution sur 6 mois.</li>
          <li>Voir l’état des bornes en totaux et ce que disent les utilisatrices (anonymes).</li>
          <li>Télécharger un rapport ou l’imprimer.</li>
          <li>Ne peut ni créer de compte, ni modifier une donnée, ni voir un nom, une adresse ou un enfant.</li>
        </ul>
        <p className="petit">Compte de démonstration d’un partenaire fictif. Ce n’est pas un service officiel de l’UNICEF ; le projet candidat à Hack4Children Togo 2026 n’est pas affilié à l’UNICEF.</p>
      </section>
    </>
  )
}
