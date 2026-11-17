import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

// Propose l'application Android à qui ouvre le site depuis un téléphone Android, une seule fois par session.
export default function BandeauAndroid() {
  const { pathname } = useLocation()
  const [ferme, setFerme] = useState(() => { try { return sessionStorage.getItem('fildor.apkbandeau') === '1' } catch { return false } })
  const android = /Android/i.test(navigator.userAgent || '')
  const dansApp = window.matchMedia?.('(display-mode: standalone)').matches || Boolean(globalThis.FILDOR_CONFIG?.logiciel) || /FilDorApp/i.test(navigator.userAgent || '')
  if (!android || dansApp || ferme || pathname === '/telecharger') return null
  const fermer = () => { try { sessionStorage.setItem('fildor.apkbandeau', '1') } catch { /* sans stockage */ } setFerme(true) }
  return (
    <div className="bandeau-android no-print" role="region" aria-label="Application Android">
      <img src="/icone-192.png" alt="" width="40" height="40" />
      <span><b>Installer l'application Fil d'Or</b><small>Elle marche aussi sans réseau.</small></span>
      <Link className="bouton petit-bouton" to="/telecharger">Installer</Link>
      <button type="button" className="fermer" onClick={fermer} aria-label="Fermer">×</button>
    </div>
  )
}
