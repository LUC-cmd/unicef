import { formaterDate, nomDuJour } from '../lib/format.js'

/** Éveil d'un enfant : le jeu du jour (même jeu qu'au téléphone et dans le carnet) et la semaine. */
export default function Eveil({ eveil, aujourdhui }) {
  if (!eveil) return null
  const jour = eveil.jeuDuJour
  const lundi = new Date(aujourdhui + 'T00:00:00Z')
  lundi.setUTCDate(lundi.getUTCDate() - ((lundi.getUTCDay() + 6) % 7))
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi); d.setUTCDate(lundi.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    return { iso, nom: nomDuJour(i), fait: (eveil.joursFaits ?? []).includes(iso), futur: iso > aujourdhui }
  })

  return (
    <>
      <h3>Éveil : un jeu par jour</h3>
      {jour ? (
        <div className="jeu">
          <p><b>{jour.titre}</b> <span className="petit">({eveil.ageMois} mois)</span></p>
          <p>{jour.consigne}</p>
          <p className="petit">Matériel : {jour.materiel}. {eveil.faitAujourdhui ? '✓ Fait aujourd\'hui.' : 'Pas encore noté aujourd\'hui.'}</p>
        </div>
      ) : <p className="petit">Pas de jeu proposé pour cet âge.</p>}
      <div className="semaine" aria-label="Jeux faits cette semaine">
        {jours.map((j) => (
          <span key={j.iso} className={`jour ${j.fait ? 'fait' : ''} ${j.futur ? 'futur' : ''}`} title={formaterDate(j.iso)}>
            {j.nom}<br />{j.fait ? '✓' : '·'}
          </span>
        ))}
      </div>
      <p className="petit">{(eveil.joursFaits ?? []).length} jour(s) sur 7 cette semaine. Jeux à valider avec des spécialistes de la petite enfance.</p>
    </>
  )
}
