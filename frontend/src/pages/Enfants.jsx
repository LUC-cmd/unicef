import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { useDonnees } from './Suivi.jsx'

const maj = (t) => (t ? t[0].toUpperCase() + t.slice(1) : '')
const age = (m) => (m < 24 ? `${m} mois` : `${Math.floor(m / 12)} ans`)

/** Registre des enfants par code : on tape un code ou on filtre, on voit tout de suite qui a un soin à recevoir. */
export default function Enfants({ s }) {
  const [d, erreur] = useDonnees('enfants', s.jeton, 15000)
  const [q, setQ] = useState('')
  const [village, setVillage] = useState('')
  const [seulement, setSeulement] = useState(false)
  const liste = useMemo(() => (d?.enfants ?? []).filter((e) => (!q || e.code.includes(q.trim().toUpperCase())) && (!village || e.village === village) && (!seulement || e.soinsAFaire.length)), [d, q, village, seulement])
  if (!d) return <><Bandeau titre="Chercher un enfant">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const total = d.enfants.length
  const aFaire = d.enfants.filter((e) => e.soinsAFaire.length).length
  const max = Math.max(1, ...d.parVillage.map((v) => v.enfants))
  return (
    <>
      <Bandeau titre="Chercher un enfant">Tapez un code (par exemple AG-0001) : l’enfant sort avec son âge, son village et ce qui lui reste à recevoir. Un code, jamais un nom.</Bandeau>
      <div className="tuiles">
        <div className="tuile"><b>{total}</b><span>enfants suivis</span></div>
        <div className={`tuile ${aFaire ? 'alerte' : ''}`}><b>{aFaire}</b><span>avec un soin à recevoir</span></div>
        <div className="tuile"><b>{total - aFaire}</b><span>à jour</span></div>
        <div className="tuile"><b>{total ? Math.round((100 * (total - aFaire)) / total) : 0} %</b><span>couverture</span></div>
      </div>
      <section className="carte">
        <div className="ligne-code">
          <label>Code de l’enfant<input value={q} placeholder="AG-0001" maxLength={12} autoComplete="off" onChange={(e) => setQ(e.target.value.toUpperCase())} /></label>
          <label>Village<select value={village} onChange={(e) => setVillage(e.target.value)}><option value="">Tous</option>{d.parVillage.map((v) => <option key={v.village} value={v.village}>{maj(v.village)}</option>)}</select></label>
          <label className="case"><input type="checkbox" checked={seulement} onChange={(e) => setSeulement(e.target.checked)} /> Seulement ceux qui ont un soin à recevoir</label>
        </div>
        {liste.length === 0 ? <p className="petit">Aucun enfant ne correspond.</p> : (
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Code</th><th>Âge</th><th>Village</th><th>Reste à recevoir</th><th>Établissement</th>{s.role === 'agent' && <th><span className="sr-only">Action</span></th>}</tr></thead>
              <tbody>
                {liste.map((e) => (
                  <tr key={e.code}>
                    <th scope="row">{e.code}</th>
                    <td>{age(e.ageMois)}</td>
                    <td>{maj(e.village)}</td>
                    <td>{e.soinsAFaire.length ? <b className="pastille pastille-prioritaire">{e.soinsAFaire.join(', ')}</b> : 'Rien : à jour'}</td>
                    <td>{e.etablissements.length ? e.etablissements.join(', ') : '–'}</td>
                    {s.role === 'agent' && <td><Link className="bouton secondaire petit-bouton" to={`/reseau/campagne?foyer=${e.foyer}`}>Ouvrir la maison</Link></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="carte">
        <h2>Enfants par village, et ceux qui attendent un soin</h2>
        <ul className="barres" aria-label="Enfants par village">
          {d.parVillage.map((v) => (
            <li key={v.village}><span className="barre-nom">{maj(v.village)}</span><span className="barre-piste"><span className="barre-val" style={{ width: `${(100 * v.enfants) / max}%` }} /></span><span className="barre-pct">{v.enfants} · {v.aFaire} à soigner</span></li>
          ))}
        </ul>
      </section>
    </>
  )
}
