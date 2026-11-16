import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Anneau, Barres } from './Graphiques.jsx'

/** Suivi de l'acte de naissance, de la validation jusqu'au retrait par la famille. */
export default function ActesSuivi({ role }) {
  const mairie = role === 'MAIRIE'
  const [actes, setActes] = useState(null)
  const [info, setInfo] = useState('')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    try { setActes(await api.get(mairie ? '/api/mairie/actes' : '/api/decideur/actes')); setErreur('') }
    catch (e) { setErreur(e.message) }
  }, [mairie])
  useEffect(() => { charger() }, [charger])

  async function agir(id, action) {
    try { const r = await api.post(`/api/mairie/declarations/${id}/${action}`); setInfo(r.message); await charger() }
    catch (e) { setErreur(e.message); }
  }

  if (!actes) return erreur ? <p className="erreur" role="alert">{erreur}</p> : null
  const aRelancer = actes.lignes.filter((l) => !l.acteRetireLe)

  return (
    <section className="carte" aria-labelledby="titre-actes">
      <h2 id="titre-actes">Les actes sont-ils retirés ?</h2>
      <p className="petit">Une déclaration validée ne suffit pas : l'enfant n'a son acte que lorsque la famille l'a retiré.</p>
      <div className="graphes-ligne">
        <Anneau titre="Où en sont les actes validés" centre={`${100 - actes.tauxNonRetires} %`}
                parts={[
                  { nom: 'Retirés par la famille', valeur: actes.retires, couleur: '#00833d' },
                  { nom: 'Prêts, à retirer', valeur: actes.prets, couleur: '#ffc20e' },
                  { nom: 'En préparation', valeur: Math.max(0, actes.nonRetires - actes.prets), couleur: '#e2231a' },
                ]} />
        <Barres titre="Actes non retirés, par zone" unite=" %"
                items={actes.zones.map((z) => ({ nom: z.zone, valeur: z.masquee ? null : z.tauxNonRetires,
                  couleur: (z.tauxNonRetires ?? 0) >= 40 ? '#e2231a' : (z.tauxNonRetires ?? 0) >= 25 ? '#f26a21' : '#00833d' }))} />
      </div>
      {info && <p className="succes" role="status">{info}</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {mairie && (
        <>
          <h3>À suivre ({aRelancer.length})</h3>
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Enfant</th><th>Zone</th><th>État</th><th></th></tr></thead>
              <tbody>
                {aRelancer.slice(0, 30).map((l) => (
                  <tr key={l.id}>
                    <td>{l.codeEnfant}</td>
                    <td>{l.zone}</td>
                    <td>{l.actePretLe ? 'Prêt, à retirer' : 'En préparation'}</td>
                    <td>
                      <div className="actions">
                        {!l.actePretLe && <button className="bouton petit-bouton" onClick={() => agir(l.id, 'acte-pret')}>Acte prêt : prévenir la famille</button>}
                        <button className="bouton secondaire petit-bouton" onClick={() => agir(l.id, 'acte-retire')}>Retiré</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {aRelancer.length === 0 && <tr><td colSpan="4" className="petit">Tous les actes validés ont été retirés.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
