import { useState } from 'react'
import { api } from '../lib/api.js'
import { lireEntree, lireSuivi } from '../lib/qrSuivi.js'
import { formaterDate } from '../lib/format.js'
import LecteurQr from '../components/LecteurQr.jsx'

const PICTO_RDV = { VACCIN: '💉', CONSULTATION_PRENATALE: '🤰', PESEE: '⚖️', NUTRITION: '🥣' }

/** Vérifier un QR du carnet : l'agent ou le centre scanne (ou colle) le code du carnet papier
 *  et lit l'état du suivi signé — sans contacter la base de la zone d'origine. */
export default function VerifierQr() {
  const [jeton, setJeton] = useState('')
  const [resultat, setResultat] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [scanOuvert, setScanOuvert] = useState(false)

  async function verifier(texte) {
    const code = String(texte ?? jeton).trim()
    if (!code) return
    setEnCours(true)
    setResultat(null)
    try {
      setResultat(await api.post('/api/verification/carnet-qr', { jeton: code }))
    } catch (e) {
      setResultat({ valide: false, erreur: e.message })
    } finally {
      setEnCours(false)
    }
  }

  const suivi = resultat?.valide ? lireSuivi(resultat.contenu) : null

  return (
    <main className="page etroite verif-qr">
      <h1>Vérifier un QR du carnet</h1>
      <div className="carte">
        <p>
          Le carnet papier porte un code signé. Scannez-le (ou collez-le) : vous verrez les rendez-vous
          faits et le prochain, sans contacter le site d'origine. La signature garantit que le code n'a pas été
          modifié. Aucun nom n'y figure — seulement les codes.
        </p>

        {!scanOuvert && (
          <button className="bouton" type="button" onClick={() => setScanOuvert(true)}>
            📷 Scanner le code avec la caméra
          </button>
        )}

        {scanOuvert && (
          <LecteurQr
            titre="Scanner le carnet papier"
            onScan={(code) => {
              setScanOuvert(false)
              setJeton(code)
              verifier(code)
            }}
            onFermer={() => setScanOuvert(false)}
          />
        )}

        <label htmlFor="zone-jeton" className="petit">Ou collez le contenu du code :</label>
        <textarea id="zone-jeton" rows={4} value={jeton} onChange={(e) => setJeton(e.target.value)}
          placeholder="fildor1.…" spellCheck="false" />
        <button className="bouton" disabled={enCours || !jeton.trim()} onClick={() => verifier()}>
          {enCours ? 'Vérification…' : 'Vérifier'}
        </button>
      </div>

      {resultat && !resultat.valide && (
        <div className="carte alerte" role="alert">
          <p><b>Code refusé.</b> {resultat.erreur || 'Signature invalide.'} N'utilisez pas ce carnet comme référence.</p>
        </div>
      )}

      {suivi && (
        <div className="carte succes-carte">
          <h2 className="sans-marge">✅ Suivi vérifié — famille <b>{suivi.famille}</b></h2>
          {suivi.genere && <p className="petit">État du suivi au {formaterDate(suivi.genere)}. Un carnet plus récent prime.</p>}
          {suivi.enfants.map((e) => (
            <section key={e.code} className="verif-enfant">
              <h3 className="sans-marge">
                {e.statut === 'GROSSESSE'
                  ? <>🤰 Grossesse <b>{e.code}</b>{e.terme && <> · terme prévu le {formaterDate(e.terme)}</>}</>
                  : <>Enfant <b>{e.code}</b>{e.naissance && <> · né le {formaterDate(e.naissance)}</>}</>}
              </h3>
              <p className="petit">Rendez-vous faits : {e.faits.length === 0 ? 'aucun enregistré' : ''}</p>
              <ul className="sans-puce">
                {e.faits.map((f, i) => {
                  const d = lireEntree(f)
                  return <li key={`${f}-${i}`} className="gros">{d.picto} le {d.date ? formaterDate(d.date) : 'date inconnue'}</li>
                })}
              </ul>
              {e.prochain && (() => { const d = lireEntree(e.prochain); return (
                <p className="gros">📅 Prochain rendez-vous : {d.picto} le {d.date ? formaterDate(d.date) : 'date inconnue'}</p>
              ) })()}
            </section>
          ))}
          <p className="petit">Détails complets : demandez le dossier via le code famille. Ce résumé suffit pour orienter la famille.</p>
        </div>
      )}
    </main>
  )
}
