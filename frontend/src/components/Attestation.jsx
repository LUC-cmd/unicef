import { formaterDate } from '../lib/format.js'

const PHRASE = {
  accouchement: 'un accouchement a eu lieu dans l’établissement',
  naissance: 'une naissance vivante a été constatée',
  prise_en_charge: 'une prise en charge médicale a été assurée',
  hospitalisation: 'une hospitalisation a eu lieu',
}

/** Imprime seulement l'attestation choisie (le reste de la page est masqué à l'impression). */
export function imprimerAttestation(id) {
  const el = document.getElementById(`att-${id}`)
  if (!el) return
  el.classList.add('a-imprimer'); document.body.classList.add('imprime-att')
  const fin = () => { el.classList.remove('a-imprimer'); document.body.classList.remove('imprime-att'); window.removeEventListener('afterprint', fin) }
  window.addEventListener('afterprint', fin)
  window.print()
}

/** Une attestation tamponnée : établissement, texte, date, signataire, cachet. Aucun nom : des codes. */
export default function Attestation({ a, bouton = true }) {
  const nom = a.centre.replace(/ \(fictifs?\)| \(fictives?\)/, '')
  return (
    <article className="attestation" id={`att-${a.id}`}>
      <header>
        <p className="att-etab">{nom}</p>
        <h3>{a.libelle}</h3>
        <p className="petit">N° {a.numero}</p>
      </header>
      <p>
        L’établissement atteste que, pour la famille <b>{a.famille}</b>{a.enfant && <> (enfant <b>{a.enfant}</b>)</>}, {PHRASE[a.type]} le <b>{formaterDate(a.dateEvenement)}</b>.
      </p>
      {a.note && <p>{a.note}</p>}
      <footer>
        <div className="att-signature">
          <p className="petit">Établi le {formaterDate(a.emis)}</p>
          <p>{a.cachet.titre}<br /><b>{a.cachet.responsable}</b></p>
        </div>
        <img className="att-cachet" src={a.cachet.image} alt="Cachet de l’établissement" />
      </footer>
      <p className="petit att-note">Prototype de démonstration : ce modèle doit être validé avec l’état civil avant d’avoir une valeur officielle. Numéro vérifiable auprès de l’établissement.</p>
      {bouton && <p className="att-bouton"><button type="button" className="bouton" onClick={() => imprimerAttestation(a.id)}>Imprimer cette attestation</button></p>}
    </article>
  )
}
