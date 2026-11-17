import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'

const ETAT = {
  FAIT: ['Fait', 'ok'], EN_COURS: ['En cours', 'cours'], A_FAIRE: ['À faire', 'afaire'],
  RUPTURE: ['Perdu de vue', 'rupture'], A_VENIR: ['Plus tard', 'venir'], SANS_OBJET: ['Sans objet', 'venir'],
}
const BESOINS = [
  ['EAU', 'Eau potable', 'Orienter vers le centre social ou le comité de l’eau du village.'],
  ['HYGIENE', 'Hygiène (mains, latrines)', 'Montrer le lavage des mains au savon ; signaler le besoin de latrines.'],
  ['PROTECTION_SOCIALE', 'Protection sociale', 'Orienter vers le centre social pour les aides et le transfert monétaire.'],
  ['PARENTALITE', 'Accompagnement parental', 'Proposer une causerie de parents au centre ou à la crèche solidaire.'],
]

/** Le fil d'un enfant, de l'adolescence de sa mère au préscolaire : où il en est, où il risque de se perdre. */
export default function ParcoursEnfant({ code, enLigne }) {
  const [p, setP] = useState(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    if (!enLigne) return
    api.get(`/api/agent/enfants/${code}/parcours`).then(setP).catch((e) => setErreur(e.message))
  }, [code, enLigne])

  async function orienter() {
    try { setP(await api.post(`/api/agent/enfants/${code}/prescolaire`)); setErreur('') } catch (e) { setErreur(e.message) }
  }
  async function basculer(type) {
    const types = p.besoinsSociaux.includes(type) ? p.besoinsSociaux.filter((t) => t !== type) : [...p.besoinsSociaux, type]
    try { setP(await api.post(`/api/agent/enfants/${code}/besoins-sociaux`, { types })); setErreur('') } catch (e) { setErreur(e.message) }
  }
  if (!enLigne) return null
  if (!p) return erreur ? <p className="erreur" role="alert">{erreur}</p> : null

  return (
    <section className="carte parcours-enfant" aria-labelledby="titre-parcours">
      <h3 id="titre-parcours">Un enfant, un parcours</h3>
      <p className="parcours-pas"><b>Prochain pas :</b> {p.prochainPas}</p>
      <ol className="parcours-frise">
        {p.etapes.map((e, i) => {
          const [libelle, classe] = ETAT[e.etat] || ETAT.A_VENIR
          return (
            <li key={e.code} className={`etape-p ${classe}`}>
              <span className="pastille-p">{i + 1}</span>
              <div>
                <b>{e.titre}</b> <span className={`etat-p ${classe}`}>{libelle}</span>
                <p>{e.detail}</p>
                {e.action === 'PRESCOLAIRE' && <button type="button" className="bouton petit-bouton" onClick={orienter}>Noter l'orientation vers le préscolaire</button>}
                {e.action === 'EVEIL' && <Link className="bouton secondaire petit-bouton" to="/jeux">Voir le jeu du jour</Link>}
                {e.action === 'ADOS' && <Link className="bouton secondaire petit-bouton" to="/adolescents">Informations pour les adolescentes</Link>}
                {e.action === 'DECLARER' && <Link className="bouton secondaire petit-bouton" to="/agent/acte">Actes de naissance</Link>}
              </div>
            </li>
          )
        })}
      </ol>
      <h4>Besoins sociaux de la famille</h4>
      <p className="petit">Cochez ce que la famille signale : un seul clic, l'orientation s'affiche.</p>
      <div className="besoins">
        {BESOINS.map(([t, nom, aide]) => (
          <label key={t} className="case"><input type="checkbox" checked={p.besoinsSociaux.includes(t)} onChange={() => basculer(t)} />
            <span><b>{nom}</b>{p.besoinsSociaux.includes(t) && <small>{aide}</small>}</span></label>
        ))}
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </section>
  )
}
