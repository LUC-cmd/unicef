import { useEffect, useState } from 'react'
import { LIBELLE_LANGUE } from '../lib/format.js'

/** Montre le SMS tel que la famille le recevra, dans la langue choisie. Sans traduction validée : en français, et on le dit. */
export default function ApercuMessage({ langue, code = 'RAPPEL_RDV' }) {
  const [m, setM] = useState(null)
  useEffect(() => {
    let vivant = true
    setM(null)
    fetch(`/api/public/modele?code=${code}&langue=${langue}`, { signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.json() : null)).then((j) => vivant && setM(j)).catch(() => {})
    return () => { vivant = false }
  }, [langue, code])
  if (!m) return null
  const texte = m.texte.replace('{date}', '12/12').replace('{libelle}', 'Vaccin')
  return (
    <div className="apercu-message" aria-live="polite">
      <div className="apercu-sms"><span className="apercu-de">Fil d'Or</span><p lang={m.langueEffective === 'kabye' ? 'kbp' : m.langueEffective === 'ewe' ? 'ee' : m.langueEffective === 'tem' ? 'kdh' : 'fr'}>{texte}</p></div>
      <p className={`apercu-etat ${m.traduit ? 'ok' : 'attente'}`}>
        {m.traduit
          ? `Le message part en ${LIBELLE_LANGUE[m.langueEffective]}.`
          : `Pas encore de traduction validée en ${LIBELLE_LANGUE[langue]} : le message part en français.`}
      </p>
    </div>
  )
}
