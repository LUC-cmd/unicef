import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import Picto from './Picto.jsx'

const pct = (a, b) => (b > 0 ? Math.round((100 * a) / b) : 0)

function Tuile({ icone, valeur, titre, texte }) {
  return (
    <div className="filles-tuile">
      <span className="filles-ico" aria-hidden="true"><Picto nom={icone} /></span>
      <b>{valeur}</b>
      <span className="filles-titre">{titre}</span>
      <small>{texte}</small>
    </div>
  )
}

/** Filles et jeunes mères : où elles sont, si elles sont aussi bien suivies que les garçons, ce qui reste à faire. */
export default function FillesImpact() {
  const [d, setD] = useState(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => { api.get('/api/decideur/filles').then(setD).catch((e) => setErreur(e.message)) }, [])
  if (erreur) return <p className="erreur" role="alert">{erreur}</p>
  if (!d) return <p className="petit" role="status">Chargement…</p>

  const tF = pct(d.fillesRdvManques, d.filles)
  const tG = pct(d.garconsRdvManques, d.garcons)
  const ecart = tF - tG
  const tJM = pct(d.jeunesMeresRdvManques, d.bebesJeunesMeres + d.adosEnceintes)
  return (
    <section className="carte filles-impact" aria-labelledby="t-filles">
      <h2 id="t-filles">Les chiffres</h2>
      <p className="petit">Une jeune mère suivie tôt protège deux vies : la sienne et celle de son enfant. Ce tableau montre où elles sont, et si les filles sont suivies aussi bien que les garçons. Des chiffres seulement, jamais de nom.</p>

      <div className="filles-grille">
        <Tuile icone="enceinte" valeur={d.jeunesMeres} titre="Jeunes mères suivies" texte="Mères de moins de 20 ans : suivi renforcé, orientation santé et retour à l'école." />
        <Tuile icone="bebe" valeur={d.bebesJeunesMeres} titre="Bébés de jeunes mères" texte="Moins d'un an : un suivi plus rapproché la première année." />
        <Tuile icone="alerte" valeur={`${tJM} %`} titre="Jeunes mères avec un rendez-vous manqué" texte="À rejoindre en priorité par l'agent, ou par une visite si silence." />
        <Tuile icone="fiche" valeur={d.fillesSansActe} titre="Filles sans acte de naissance" texte="Nées il y a plus de 45 jours, sans déclaration : sans acte, l'école et les services sont plus difficiles." />
      </div>

      <h3>Les filles sont-elles suivies comme les garçons ?</h3>
      <div className="filles-parite" role="img" aria-label={`Rendez-vous manqués : filles ${tF} pour cent, garçons ${tG} pour cent`}>
        <div><span>Filles ({d.filles})</span><div className="barre"><i style={{ width: `${tF}%` }} className="fille" /></div><b>{tF} %</b></div>
        <div><span>Garçons ({d.garcons})</span><div className="barre"><i style={{ width: `${tG}%` }} className="garcon" /></div><b>{tG} %</b></div>
      </div>
      <p className="petit">Part des enfants avec au moins un rendez-vous ou vaccin manqué. {d.filles + d.garcons < 20
        ? "Les effectifs sont encore petits : la comparaison n'est pas fiable."
        : ecart > 5 ? `Les filles manquent plus de rendez-vous (écart de ${ecart} points) : chercher pourquoi, et agir.`
          : ecart < -5 ? `Les garçons manquent plus de rendez-vous (écart de ${-ecart} points).`
            : "Pas d'écart important entre filles et garçons."}</p>

      <div className="tableau-defile"><table className="tableau">
        <caption className="sr-seul">Jeunes mères et filles par zone</caption>
        <thead><tr><th>Zone</th><th>Jeunes mères</th><th>Adolescentes enceintes</th><th>Bébés de jeunes mères</th><th>Filles sans acte</th></tr></thead>
        <tbody>{d.zones.map((z) => (z.masquee
          ? <tr key={z.zone}><td>{z.zone}</td><td colSpan="4" className="petit">Effectif trop petit : masqué pour protéger les familles</td></tr>
          : <tr key={z.zone}><td>{z.zone}</td><td>{z.jeunesMeres}</td><td>{z.adosEnceintes}</td><td>{z.bebesJeunesMeres}</td><td>{z.fillesSansActe}</td></tr>))}</tbody>
      </table></div>
    </section>
  )
}
