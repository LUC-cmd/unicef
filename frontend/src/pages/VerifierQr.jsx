import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { lireEntree, lireSuivi } from '../lib/qrSuivi.js'
import { formaterDate } from '../lib/format.js'

const PICTO_RDV = { VACCIN: '💉', CONSULTATION_PRENATALE: '🤰', PESEE: '⚖️', NUTRITION: '🥣' }

/** Vérifier un QR du carnet : l'agent ou le centre scanne (ou colle) le code du carnet papier
 *  et lit l'état du suivi signé — sans contacter la base de la zone d'origine. */
export default function VerifierQr() {
  const [jeton, setJeton] = useState('')
  const [resultat, setResultat] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [peutScanner, setPeutScanner] = useState(false)
  const [scanOuvert, setScanOuvert] = useState(false)
  const [erreurCam, setErreurCam] = useState('')
  const videoRef = useRef(null)
  const fluxRef = useRef(null)
  const boucleRef = useRef(null)

  useEffect(() => {
    setPeutScanner('BarcodeDetector' in window)
    return () => arreterFlux()
  }, [])

  function arreterFlux() {
    if (boucleRef.current) { clearInterval(boucleRef.current); boucleRef.current = null }
    if (fluxRef.current) { fluxRef.current.getTracks().forEach((t) => t.stop()); fluxRef.current = null }
    setScanOuvert(false)
  }

  async function demarrerScan() {
    setErreurCam(''); setResultat(null)
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      fluxRef.current = flux
      setScanOuvert(true)
      const video = videoRef.current
      video.srcObject = flux
      await video.play()
      const detecteur = new window.BarcodeDetector({ formats: ['qr_code'] })
      boucleRef.current = setInterval(async () => {
        const v = videoRef.current
        if (!v || v.readyState < 2) return
        try {
          const codes = await detecteur.detect(v)
          if (codes.length && codes[0].rawValue) {
            arreterFlux()
            verifier(codes[0].rawValue)
          }
        } catch { /* image suivante */ }
      }, 350)
    } catch {
      setErreurCam('Caméra indisponible : collez le code à la main.')
      setScanOuvert(false)
    }
  }

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

        {peutScanner && !scanOuvert && (
          <button className="bouton" onClick={demarrerScan}>📷 Scanner le code avec la caméra</button>
        )}
        {scanOuvert && (
          <div>
            <video ref={videoRef} className="scan-video" playsInline muted aria-label="Caméra de lecture du code" />
            <button className="bouton secondaire" onClick={arreterFlux}>Arrêter le scan</button>
          </div>
        )}
        {erreurCam && <p className="petit">{erreurCam}</p>}

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
