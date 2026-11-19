import { useEffect, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { api } from '../lib/api.js'
import { lireCompte } from '../lib/famille.js'
import { lireDeveloppement, trancheDe } from '../lib/petiteEnfance.js'

const CLE = 'fildor.famille.developpement'
const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || [] } catch { return [] } }

/** Petit bilan de développement par tranche d'âge : la famille répond, l'agent est prévenu si besoin. */
export default function DeveloppementFamille() {
  const compte = lireCompte()
  const [enfants, setEnfants] = useState([])
  const [code, setCode] = useState('')
  const [mois, setMois] = useState(12)
  const [reponses, setReponses] = useState({})
  const [envoyes, setEnvoyes] = useState(lire)
  const [fait, setFait] = useState(false)

  useEffect(() => {
    if (!compte) return
    api.post('/api/public/famille/connexion', { telephone: compte.telephone, codeFamille: compte.codeFamille })
      .then((p) => { const l = (Array.isArray(p?.enfants) ? p.enfants : []).filter((e) => e.statut === 'ENFANT' && e.ageMois != null); setEnfants(l); if (l[0]) { setCode(l[0].codeEnfant); setMois(l[0].ageMois) } })
      .catch(() => {})
  }, [])

  const tranche = trancheDe(mois)
  const repondu = tranche.questions.every((_, i) => reponses[i] !== undefined)
  const pasEncore = tranche.questions.filter((_, i) => reponses[i] === false).length
  const res = lireDeveloppement(pasEncore)
  const choisir = (e) => { const c = enfants.find((x) => x.codeEnfant === e.target.value); setCode(e.target.value); if (c) setMois(c.ageMois); setReponses({}); setFait(false) }
  const prevenir = () => {
    const n = [{ code: code || 'enfant', mois, tranche: tranche.titre, pasEncore, le: new Date().toISOString() }, ...envoyes].slice(0, 20)
    setEnvoyes(n); try { localStorage.setItem(CLE, JSON.stringify(n)) } catch { /* sans stockage */ } setFait(true)
  }

  return (
    <>
      <Bandeau surtitre="Pour mon enfant" titre="Mon enfant avance-t-il bien ?">Quatre questions simples, adaptées à son âge. Ce n’est pas un diagnostic : cela aide à savoir quand en parler à l’agent de santé.</Bandeau>
      <main className="page soins">
        <section className="carte">
          {enfants.length > 0
            ? <label>Quel enfant ?<select value={code} onChange={choisir}>{enfants.map((e) => <option key={e.codeEnfant} value={e.codeEnfant}>{e.codeEnfant} · {e.ageMois} mois</option>)}</select></label>
            : <label>Âge de l’enfant en mois<input type="number" min="0" max="60" value={mois} onChange={(e) => { setMois(Math.max(0, Math.min(60, Number(e.target.value) || 0))); setReponses({}); setFait(false) }} /></label>}
          <h2>{tranche.titre}</h2>
          <ul className="soin-questions">
            {tranche.questions.map((q, i) => (
              <li key={q}>
                <p>{q}</p>
                <div className="soin-choix" role="group" aria-label={q}>
                  <button type="button" className={reponses[i] === true ? 'actif' : ''} aria-pressed={reponses[i] === true} onClick={() => { setReponses({ ...reponses, [i]: true }); setFait(false) }}>Oui</button>
                  <button type="button" className={reponses[i] === false ? 'actif' : ''} aria-pressed={reponses[i] === false} onClick={() => { setReponses({ ...reponses, [i]: false }); setFait(false) }}>Pas encore</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="petit"><b>Un jeu pour l’aider :</b> {tranche.jeu}</p>
        </section>
        {repondu && (
          <ResultatSoins {...res}>
            {res.niveau === 'signaler' && !fait && <button className="bouton" type="button" onClick={prevenir}>Prévenir mon agent de santé</button>}
            {fait && <p className="petit"><b>C’est noté.</b> Votre agent de santé verra ce signalement à sa prochaine visite (démonstration : gardé sur cet appareil).</p>}
          </ResultatSoins>
        )}
        {envoyes.length > 0 && <p className="petit">Signalements envoyés : {envoyes.length}. Dernier : {envoyes[0].code}, {envoyes[0].tranche}.</p>}
        <p className="petit">Repères généraux, à faire valider par un professionnel de santé. Chaque enfant avance à son rythme.</p>
      </main>
    </>
  )
}
