import { useEffect, useState } from 'react'

// Code QR dessiné dans la page (aucun service extérieur), à scanner avec l'appareil photo du téléphone.
export default function QrCode({ valeur, taille = 220, titre = 'Code QR' }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let actif = true
    import('qrcode').then((m) => (m.default || m).toString(valeur, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#16325c', light: '#ffffff' } }))
      .then((s) => { if (actif) setSvg(s) }).catch(() => {})
    return () => { actif = false }
  }, [valeur])
  return <div className="qr" role="img" aria-label={titre} style={{ width: taille, height: taille }} dangerouslySetInnerHTML={{ __html: svg }} />
}
