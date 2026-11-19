import { useEffect, useRef, useState } from 'react'

/**
 * Composant de lecture de code QR par caméra (sans dépendance externe).
 * Propose la capture vidéo avec overlay de visée, décodage natif ou manuel,
 * et arrêt automatique de la caméra au démontage.
 */
export default function LecteurQr({ onScan, onFermer, titre = 'Scanner un code QR' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fluxRef = useRef(null)
  const boucleRef = useRef(null)

  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [codeManuel, setCodeManuel] = useState('')
  const [motifDetecte, setMotifDetecte] = useState(false)

  useEffect(() => {
    let actif = true

    async function demarrerCamera() {
      setErreur('')
      setChargement(true)
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Votre navigateur ne supporte pas l\'accès direct à la caméra.')
        }

        let flux = null
        try {
          // Essai avec la caméra arrière (recommandée pour scanner)
          flux = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
          })
        } catch {
          // Fallback sur n'importe quelle caméra disponible
          flux = await navigator.mediaDevices.getUserMedia({ video: true })
        }

        if (!actif) {
          flux.getTracks().forEach((t) => t.stop())
          return
        }

        fluxRef.current = flux
        if (videoRef.current) {
          videoRef.current.srcObject = flux
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()
        }
        setChargement(false)

        // Détection automatique : soit BarcodeDetector natif, soit analyse de trames
        initialiserDetection()
      } catch (err) {
        if (!actif) return
        setChargement(false)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErreur('Accès à la caméra refusé. Veuillez autoriser la caméra ou saisir le code ci-dessous.')
        } else {
          setErreur('Caméra indisponible. Vous pouvez saisir le code manuellement ci-dessous.')
        }
      }
    }

    demarrerCamera()

    return () => {
      actif = false
      arreterCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function arreterCamera() {
    if (boucleRef.current) {
      clearInterval(boucleRef.current)
      boucleRef.current = null
    }
    if (fluxRef.current) {
      fluxRef.current.getTracks().forEach((piste) => piste.stop())
      fluxRef.current = null
    }
  }

  function initialiserDetection() {
    // Si l'API native BarcodeDetector est disponible
    const supportBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window
    let detecteur = null
    if (supportBarcodeDetector) {
      try {
        detecteur = new window.BarcodeDetector({ formats: ['qr_code'] })
      } catch {
        detecteur = null
      }
    }

    boucleRef.current = setInterval(async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 1. Détection via BarcodeDetector natif si possible
      if (detecteur) {
        try {
          const codes = await detecteur.detect(canvas)
          if (codes.length > 0 && codes[0].rawValue) {
            arreterCamera()
            if (onScan) onScan(codes[0].rawValue)
            return
          }
        } catch {
          /* trame suivante */
        }
      }

      // 2. Détection par motif de contraste (recherche de finder pattern QR 1:1:3:1:1)
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        if (analyserMotifFinder(imageData)) {
          setMotifDetecte(true)
        }
      } catch {
        /* poursuite */
      }
    }, 280)
  }

  /**
   * Analyse simple en JavaScript pur pour repérer le motif 1:1:3:1:1 des QR codes
   */
  function analyserMotifFinder(imgData) {
    const { data, width, height } = imgData
    const pas = 8
    const milieuY = Math.floor(height / 2)

    let noir = 0
    let blanc = 0
    let sequences = []

    for (let x = 0; x < width; x += pas) {
      const idx = (milieuY * width + x) * 4
      const luminosite = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      const estNoir = luminosite < 100

      if (estNoir) {
        if (blanc > 0) {
          sequences.push({ type: 'blanc', taille: blanc })
          blanc = 0
        }
        noir += pas
      } else {
        if (noir > 0) {
          sequences.push({ type: 'noir', taille: noir })
          noir = 0
        }
        blanc += pas
      }

      if (sequences.length >= 5) {
        const s = sequences.slice(-5)
        // Vérifie si le motif ressemble à noir-blanc-noir-blanc-noir avec ratios 1:1:3:1:1
        if (s[0].type === 'noir' && s[1].type === 'blanc' && s[2].type === 'noir' && s[3].type === 'blanc' && s[4].type === 'noir') {
          const unite = (s[0].taille + s[1].taille + s[3].taille + s[4].taille) / 4
          if (unite > 2 && Math.abs(s[2].taille - unite * 3) < unite * 1.8) {
            return true
          }
        }
      }
    }
    return false
  }

  function soumettreManuel(e) {
    e?.preventDefault()
    const code = codeManuel.trim()
    if (!code) return
    arreterCamera()
    if (onScan) onScan(code)
  }

  function injecterExemple() {
    const codeExemple = 'fildor1.CARNET.FAMILLE-TOGO-2026'
    arreterCamera()
    if (onScan) onScan(codeExemple)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        className="carte"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          overflow: 'hidden',
          padding: 0,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* En-tête */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.15rem',
            backgroundColor: '#16325c',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#ffffff', fontWeight: 600 }}>{titre}</h2>
          </div>
          {onFermer && (
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.3rem',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0.2rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Zone de la caméra avec overlay de visée */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '280px',
            backgroundColor: '#000000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Animation CSS du faisceau vert */}
          <style>{`
            @keyframes scanLigne {
              0% { top: 12%; opacity: 0.8; }
              50% { top: 84%; opacity: 1; }
              100% { top: 12%; opacity: 0.8; }
            }
          `}</style>

          {/* Cadre de visée vert */}
          <div
            style={{
              position: 'absolute',
              width: '210px',
              height: '210px',
              border: '2px solid rgba(0, 230, 118, 0.45)',
              borderRadius: '12px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'none',
            }}
          >
            {/* Coins verts renforcés */}
            <span style={{ position: 'absolute', top: -2, left: -2, width: 22, height: 22, borderTop: '4px solid #00e676', borderLeft: '4px solid #00e676', borderTopLeftRadius: '10px' }} />
            <span style={{ position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderTop: '4px solid #00e676', borderRight: '4px solid #00e676', borderTopRightRadius: '10px' }} />
            <span style={{ position: 'absolute', bottom: -2, left: -2, width: 22, height: 22, borderBottom: '4px solid #00e676', borderLeft: '4px solid #00e676', borderBottomLeftRadius: '10px' }} />
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderBottom: '4px solid #00e676', borderRight: '4px solid #00e676', borderBottomRightRadius: '10px' }} />

            {/* Ligne laser animée */}
            <div
              style={{
                position: 'absolute',
                left: 6,
                right: 6,
                height: '2px',
                backgroundColor: '#00e676',
                boxShadow: '0 0 8px #00e676',
                animation: 'scanLigne 2s ease-in-out infinite',
              }}
            />
          </div>

          {chargement && (
            <div style={{ position: 'absolute', color: '#ffffff', fontSize: '0.88rem' }}>
              Démarrage de la caméra…
            </div>
          )}

          {motifDetecte && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                backgroundColor: 'rgba(0, 131, 61, 0.9)',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              ✓ QR Code détecté dans le cadre
            </div>
          )}
        </div>

        {/* Message d'erreur caméra si nécessaire */}
        {erreur && (
          <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '0.65rem 1rem', fontSize: '0.82rem', borderBottom: '1px solid #fed7d7' }}>
            {erreur}
          </div>
        )}

        {/* Zone de saisie manuelle et actions */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#4a5568', textAlign: 'center' }}>
            Pointez la caméra vers le code QR du carnet ou saisissez le code :
          </p>

          <form onSubmit={soumettreManuel} style={{ display: 'flex', gap: '0.45rem' }}>
            <label htmlFor="lecteur-code-manuel" className="sr-seulement">Code QR manuel</label>
            <input
              id="lecteur-code-manuel"
              type="text"
              value={codeManuel}
              onChange={(e) => setCodeManuel(e.target.value)}
              placeholder="Ex : fildor1.TG-LOM-..."
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                fontSize: '0.88rem',
              }}
            />
            <button
              type="submit"
              className="bouton"
              disabled={!codeManuel.trim()}
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.88rem' }}
            >
              Valider
            </button>
          </form>

          {/* Bouton démo et annulation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
            <button
              type="button"
              className="lien"
              onClick={injecterExemple}
              style={{ fontSize: '0.8rem', color: '#1cabe2', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Simuler un scan de test
            </button>
            {onFermer && (
              <button
                type="button"
                className="bouton secondaire"
                onClick={onFermer}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
