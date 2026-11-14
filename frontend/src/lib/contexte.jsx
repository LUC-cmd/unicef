import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, lireSession } from './api.js'

const ContexteAuth = createContext(null)
const ContexteReseau = createContext(null)

export function FournisseurAuth({ children }) {
  const [session, setSession] = useState(() => lireSession())

  const connexion = useCallback(async (u, mdp) => {
    const s = await api.connexion(u, mdp)
    setSession(s)
    return s
  }, [])
  const deconnexion = useCallback(() => {
    api.deconnexion()
    setSession(null)
  }, [])

  const valeur = useMemo(() => ({ session, connexion, deconnexion }), [session, connexion, deconnexion])
  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>
}

export const useAuth = () => useContext(ContexteAuth)

/** Réseau réel (navigateur) + interrupteur « mode hors ligne » pour simuler un village sans réseau pendant la démo. */
export function FournisseurReseau({ children }) {
  const [navigateurEnLigne, setNavigateurEnLigne] = useState(() => navigator.onLine)
  const [simuleHorsLigne, setSimuleHorsLigne] = useState(false)

  useEffect(() => {
    const on = () => setNavigateurEnLigne(true)
    const off = () => setNavigateurEnLigne(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const valeur = useMemo(
    () => ({ enLigne: navigateurEnLigne && !simuleHorsLigne, simuleHorsLigne, setSimuleHorsLigne }),
    [navigateurEnLigne, simuleHorsLigne],
  )
  return <ContexteReseau.Provider value={valeur}>{children}</ContexteReseau.Provider>
}

export const useReseau = () => useContext(ContexteReseau)
