const POINTS = ['Grossesse', 'Naissance', 'Petite enfance', 'Éveil', 'Préscolaire']

/** Où en est l'enfant sur son fil d'or, et le prochain pas. Tout se calcule sur place, à partir de l'âge. */
export function etapeDe(e) {
  if (e.statut !== 'ENFANT') return 0
  const m = e.ageMois ?? 0
  if (m < 2) return 1
  if (m < 12) return 2
  if (m < 36) return 3
  return 4
}

export function prochainPas(e) {
  if (e.statut !== 'ENFANT') return "Venir à la prochaine consultation prénatale : chaque rendez-vous compte."
  const m = e.ageMois ?? 0
  if (!e.acte && m < 2) return "Déclarer la naissance à la mairie : c'est gratuit pendant 45 jours."
  if (!e.acte) return "Obtenir l'acte de naissance : l'agent de santé vous aide à choisir la bonne démarche."
  if (e.acte === 'ETABLI') return "Aller retirer l'acte de naissance à la mairie, il est prêt."
  if (m < 12) return "Garder les vaccins à jour et faire le jeu du jour avec votre bébé."
  if (m < 36) return "Faire le jeu du jour, et voir la crèche proche de chez vous pour ses journées d'éveil."
  return "Préparer l'entrée au préscolaire : une crèche ou un jardin d'enfants près de chez vous."
}

export default function FilEnfant({ enfant }) {
  const ici = etapeDe(enfant)
  return (
    <div className="fil-enfant" role="group" aria-label={`Parcours de l'enfant ${enfant.codeEnfant}`}>
      <ol>
        {POINTS.map((p, i) => (
          <li key={p} className={i < ici ? 'fait' : i === ici ? 'ici' : ''} aria-current={i === ici ? 'step' : undefined}>
            <span aria-hidden="true" />
            <small>{p}</small>
          </li>
        ))}
      </ol>
      <p className="fil-pas"><b>Prochain pas :</b> {prochainPas(enfant)}</p>
    </div>
  )
}
