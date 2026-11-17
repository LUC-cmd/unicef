import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ageLisible, formaterDate, LIBELLE_PORTE } from '../lib/format.js'

const ORDRE = { URGENT: 0, PRIORITAIRE: 1, NORMAL: 2 }
const LIBELLE = { URGENT: 'Urgent', PRIORITAIRE: 'Prioritaire', NORMAL: 'Normal' }
const FILTRES = [['tous', 'Toutes'], ['URGENT', 'Urgentes'], ['PRIORITAIRE', 'Prioritaires'], ['GROSSESSE', 'Avec une grossesse']]

/** Les familles que l'agent suit : une ligne par famille, ses enfants et sa situation. */
export default function FamillesEnregistrees({ liste }) {
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState('tous')

  const familles = useMemo(() => {
    const m = new Map()
    for (const l of liste) {
      const f = m.get(l.codeFamille) ?? { code: l.codeFamille, zone: l.zone, porte: l.porte, membres: [], niveau: 'NORMAL', score: 0, prochain: null }
      f.membres.push(l)
      if ((ORDRE[l.priorite?.niveau] ?? 2) < (ORDRE[f.niveau] ?? 2)) f.niveau = l.priorite.niveau
      f.score = Math.max(f.score, l.priorite?.score ?? 0)
      if (l.prochainRdv && (!f.prochain || l.prochainRdv < f.prochain)) f.prochain = l.prochainRdv
      m.set(l.codeFamille, f)
    }
    return [...m.values()].sort((a, b) => b.score - a.score)
  }, [liste])

  const visibles = familles.filter((f) => {
    if (recherche && !(f.code + ' ' + f.membres.map((x) => x.codeEnfant).join(' ')).toLowerCase().includes(recherche.toLowerCase())) return false
    if (filtre === 'GROSSESSE') return f.membres.some((x) => x.statut === 'GROSSESSE')
    return filtre === 'tous' || f.niveau === filtre
  })
  const nbEnfants = liste.filter((l) => l.statut !== 'GROSSESSE').length
  const nbGrossesses = liste.length - nbEnfants

  return (
    <>
      <div className="tableau-kpi">
        <div className="tuile"><b>{familles.length}</b><span>familles suivies</span></div>
        <div className="tuile"><b>{nbEnfants}</b><span>enfants de moins de 5 ans</span></div>
        <div className="tuile"><b>{nbGrossesses}</b><span>grossesses suivies</span></div>
        <div className="tuile"><b>{familles.filter((f) => f.niveau === 'URGENT').length}</b><span>familles à visiter en urgence</span></div>
      </div>
      <section className="carte">
        <div className="barre-outils">
          <input className="recherche" placeholder="Chercher un code famille ou enfant" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Chercher une famille" />
          <div className="filtres" role="group" aria-label="Filtrer">
            {FILTRES.map(([v, t]) => <button key={v} type="button" className={`puce ${filtre === v ? 'active' : ''}`} aria-pressed={filtre === v} onClick={() => setFiltre(v)}>{t}</button>)}
          </div>
        </div>
        <div className="tableau-conteneur">
          <table className="table-familles">
            <thead><tr><th>Famille</th><th>Membres suivis</th><th>Situation</th><th>Prochain rendez-vous</th><th>Rappels par</th><th><span className="sr-seul">Action</span></th></tr></thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.code}>
                  <td><b>{f.code}</b><br /><span className="petit">{f.zone}</span></td>
                  <td>
                    {f.membres.map((x) => (
                      <div key={x.codeEnfant}><Link to={`/agent/visites?enfant=${x.codeEnfant}`}><b>{x.codeEnfant}</b></Link> <span className="petit">{x.statut === 'GROSSESSE' ? 'grossesse' : ageLisible(x.dateNaissance)}</span></div>
                    ))}
                  </td>
                  <td><span className={`badge badge-${f.niveau.toLowerCase()}`}>{LIBELLE[f.niveau]}</span>{f.membres.find((x) => x.priorite?.raisons?.length)?.priorite.raisons[0] && <div className="petit">{f.membres.find((x) => x.priorite?.raisons?.length).priorite.raisons[0]}</div>}</td>
                  <td>{f.prochain ? formaterDate(f.prochain) : '—'}</td>
                  <td>{LIBELLE_PORTE[f.porte]}</td>
                  <td><Link className="bouton secondaire petit-bouton" to={`/agent/visites?enfant=${f.membres[0].codeEnfant}`}>Ouvrir</Link></td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><td colSpan="6" className="vide">Aucune famille ne correspond. <button type="button" className="lien" onClick={() => { setRecherche(''); setFiltre('tous') }}>Tout afficher</button></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
