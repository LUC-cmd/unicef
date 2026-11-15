import { ROLES } from '../lib/roles.js'

/** Encadré « Votre rôle » en haut d'un tableau de bord : ce que je fais ici, ce que je vois, comment partent les données. */
export default function GuideRole({ role }) {
  const r = ROLES[role]
  if (!r) return null
  return (
    <details className="guide-role" open>
      <summary>Comprendre cet espace : {r.titre}</summary>
      <div className="guide-grille">
        <div>
          <h3>Quand je m'y connecte</h3>
          <p>{r.connexion}</p>
          <h3>Comment partent les données</h3>
          <p>{r.envoi}</p>
        </div>
        <div>
          <h3>Ce que j'enregistre</h3>
          <ul className="liste-coches">{r.saisit.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div>
          <h3>Ce que je vois</h3>
          <ul className="liste-coches">{r.voit.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </details>
  )
}
