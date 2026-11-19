// Compte famille : numéro de téléphone et code famille, gardés sur l'appareil de la famille (jamais envoyés ailleurs que dans les appels au serveur).
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const CLE = 'fildor.famille.compte'
export const lireCompte = () => { try { const c = JSON.parse(localStorage.getItem(CLE)); return c?.telephone && c?.codeFamille ? c : null } catch { return null } }
export const ecrireCompte = (c) => { try { if (c) localStorage.setItem(CLE, JSON.stringify(c)); else localStorage.removeItem(CLE) } catch { /* stockage indisponible */ } window.dispatchEvent(new Event('fildor-famille')) }

/** Le compte famille, tenu à jour quand la famille se connecte ou se déconnecte. */
export function useCompteFamille() {
  const [compte, setCompte] = useState(lireCompte)
  useEffect(() => {
    const maj = () => setCompte(lireCompte())
    window.addEventListener('fildor-famille', maj); window.addEventListener('storage', maj)
    return () => { window.removeEventListener('fildor-famille', maj); window.removeEventListener('storage', maj) }
  }, [])
  return compte
}

/** Invite d'installation de l'application (Android / navigateurs compatibles). */
export function useInstallation() {
  const [invite, setInvite] = useState(null)
  const [installee, setInstallee] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || Boolean(globalThis.FILDOR_CONFIG?.logiciel))
  useEffect(() => {
    const avant = (e) => { e.preventDefault(); setInvite(e) }
    const fini = () => { setInstallee(true); setInvite(null) }
    window.addEventListener('beforeinstallprompt', avant); window.addEventListener('appinstalled', fini)
    return () => { window.removeEventListener('beforeinstallprompt', avant); window.removeEventListener('appinstalled', fini) }
  }, [])
  const installer = async () => { if (!invite) return; invite.prompt(); await invite.userChoice; setInvite(null) }
  return { installee, peutInstaller: Boolean(invite), installer }
}

/** Dans l'espace famille, les liens de service restent dans l'espace : '/famille' devant, sinon rien. */
export function useBaseFamille() {
  return useLocation().pathname.startsWith('/famille') ? '/famille' : ''
}
