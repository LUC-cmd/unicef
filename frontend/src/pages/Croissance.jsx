import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { lireBras } from '../lib/petiteEnfance.js'

const CLE = 'fildor.agent.croissance'
const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || [] } catch { return [] } }
const SUITE = { rouge: 'Orienter aujourd’hui vers le centre de santé', jaune: 'Revoir cette semaine, conseils de repas enrichis', vert: 'Aucune action, refaire à la prochaine visite' }

/** Suivi de la croissance par l'agent : mesure du bras à chaque visite, les enfants à surveiller en tête de liste. */
export default function Croissance() {
  const [code, setCode] = useState('')
  const [mois, setMois] = useState('')
  const [mm, setMm] = useState('')
  const [oedeme, setOedeme] = useState(false)
  const [liste, setListe] = useState(lire)
  const [erreur, setErreur] = useState('')

  const valeur = Number(mm)
  const enregistrer = (e) => {
    e.preventDefault()
    const age = Number(mois)
    if (!code.trim()) { setErreur('Indiquez le code de l’enfant.'); return }
    if (!(age >= 6 && age <= 59)) { setErreur('La mesure du bras vaut pour les enfants de 6 à 59 mois.'); return }
    if (!(valeur >= 60 && valeur <= 250)) { setErreur('Entrez une mesure entre 60 et 250 millimètres.'); return }
    const r = lireBras(valeur, oedeme)
    const n = [{ code: code.trim().toUpperCase(), mois: age, mm: valeur, oedeme, niveau: r.niveau, le: new Date().toISOString() }, ...liste].slice(0, 50)
    setListe(n); try { localStorage.setItem(CLE, JSON.stringify(n)) } catch { /* sans stockage */ }
    setErreur(''); setCode(''); setMois(''); setMm(''); setOedeme(false)
  }
  const rang = { rouge: 0, jaune: 1, vert: 2 }
  const triee = [...liste].sort((a, b) => rang[a.niveau] - rang[b.niveau])
  const apercu = mm !== '' && valeur >= 60 && valeur <= 250 ? lireBras(valeur, oedeme) : null
  return (
    <>
      <Bandeau surtitre="Agent de santé" titre="Croissance des enfants">Mesurez le bras à chaque visite : les enfants à risque remontent en tête de liste, avec le prochain pas.</Bandeau>
      <div className="page soins">
        <form className="carte" onSubmit={enregistrer} noValidate>
          <label>Code de l’enfant<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="par exemple T012A" /></label>
          <label>Âge en mois (6 à 59)<input type="number" inputMode="numeric" value={mois} onChange={(e) => setMois(e.target.value)} /></label>
          <label>Mesure du bras en millimètres<input type="number" inputMode="numeric" value={mm} onChange={(e) => setMm(e.target.value)} /></label>
          <label className="soin-case"><input type="checkbox" checked={oedeme} onChange={(e) => setOedeme(e.target.checked)} /> Œdème des deux pieds</label>
          {apercu && <ResultatSoins {...apercu} />}
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button className="bouton" type="submit">Enregistrer la mesure</button>
        </form>
        <section className="carte" aria-labelledby="t-surv">
          <h2 id="t-surv">Enfants à surveiller</h2>
          {triee.length === 0 && <p className="petit">Aucune mesure pour l’instant.</p>}
          <ul className="croissance-liste">
            {triee.map((x, i) => (
              <li key={`${x.code}-${x.le}-${i}`} className={`soin-${x.niveau}`}>
                <b>{x.code}</b> · {x.mois} mois · {x.oedeme ? 'œdème' : `${x.mm} mm`}
                <span>{SUITE[x.niveau]}</span>
              </li>
            ))}
          </ul>
          <p className="petit">Démonstration : les mesures restent sur cet appareil. Courbes poids-pour-âge : à ajouter avec les tables officielles validées par le ministère.</p>
        </section>
      </div>
    </>
  )
}
