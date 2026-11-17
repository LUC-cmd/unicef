import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { LIBELLE_LANGUE, formaterDate, nomDuJour } from '../lib/format.js'

const PICTO = { VACCIN: '💉', CONSULTATION_PRENATALE: '🤰', PESEE: '⚖️', NUTRITION: '🥣' }

/** Carnet illustré à imprimer : pictogrammes et cases à cocher, sans nom, lisible sans savoir lire. */
export default function Carnet() {
  const { code } = useParams()
  const [carnet, setCarnet] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    api.get(`/api/agent/familles/${encodeURIComponent(code)}/carnet`).then(setCarnet).catch((e) => setErreur(e.message))
  }, [code])

  if (erreur) return <main className="page"><p className="erreur" role="alert">{erreur}</p><Link to="/agent">Retour</Link></main>
  if (!carnet) return <main className="page"><p>Chargement…</p></main>

  return (
    <main className="page carnet">
      <div className="no-print actions">
        <Link to="/agent">← Retour à la liste</Link>
        <button className="bouton" onClick={() => window.print()}>Imprimer</button>
      </div>

      {carnet.enfants.map((e) => (
        <section className="feuille" key={e.codeEnfant}>
          <header>
            <h1><span className="fil" aria-hidden="true" /> Fil d'Or</h1>
            <p className="code-famille">Code famille<br /><b>{carnet.codeFamille}</b>{carnet.codeCarte && <><br />Code de la carte<br /><b>{carnet.codeCarte}</b></>}</p>
          </header>
          <p>
            Enfant <b>{e.codeEnfant}</b> · {e.statut === 'GROSSESSE' ? `🤰 terme prévu le ${formaterDate(e.dateTermePrevue)}` : `🎂 ${formaterDate(e.dateNaissance)}`}
            {' · '}Langue : {LIBELLE_LANGUE[carnet.langue]}
          </p>

          {carnet.codeCarte && <p className="petit">Si vous changez de région : montrez ces deux codes à l'agent de santé. Votre suivi vous suit.</p>}
          <h2>Mes rendez-vous</h2>
          <table className="grille-carnet">
            <thead><tr><th>Quand</th><th>Quoi</th><th>Fait</th></tr></thead>
            <tbody>
              {e.rendezVous.map((r) => (
                <tr key={r.id}>
                  <td className="gros">📅 {formaterDate(r.datePrevue)}</td>
                  <td className="gros">{PICTO[r.type] || '📌'} {r.libelle}</td>
                  <td className="case-papier">{r.statut === 'REALISE' ? '✔' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Ruban de mesure (bras)</h2>
          <div className="ruban">
            <span className="vert">🟢 vert : tout va bien</span>
            <span className="jaune">🟡 jaune : conseils et revoir l'agent</span>
            <span className="rouge">🔴 rouge : aller au centre de santé</span>
          </div>

          <h2>Un jeu par jour</h2>
          {e.jeuxDeLaSemaine?.length > 0 ? (
            <table className="grille-carnet">
              <thead><tr><th>Jour</th><th>Le jeu</th><th>Fait</th></tr></thead>
              <tbody>
                {e.jeuxDeLaSemaine.map((j, i) => (
                  <tr key={`${j.id}-${i}`}>
                    <td className="gros">{nomDuJour(i)}</td>
                    <td><b>🎲 {j.titre}</b><br /><span className="petit">{j.consigne} Matériel : {j.materiel}.</span></td>
                    <td className="case-papier" />
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="petit">{e.statut === 'GROSSESSE' ? 'Pendant la grossesse : parlez et chantez à votre bébé, il vous entend.' : 'Pas de jeu proposé pour cet âge.'}</p>
          )}
          <p className="petit">🎵 Chanter · 🗣️ Raconter · 🌰 Compter · 🍋 Empiler. Surveillez toujours votre enfant avec les petits objets.</p>

          <p className="danger-papier">
            🚑 Allez tout de suite au centre de santé si l'enfant ne boit plus, est très faible, respire difficilement ou a des convulsions.
          </p>
          <p className="petit">Ce carnet informe et oriente. Il ne remplace pas le personnel de santé.</p>
        </section>
      ))}
    </main>
  )
}
