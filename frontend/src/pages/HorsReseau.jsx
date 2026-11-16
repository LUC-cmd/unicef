import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

export default function HorsReseau() {
  const [invite, setInvite] = useState(null)
  const [installe, setInstalle] = useState(false)
  useEffect(() => {
    const avant = (e) => { e.preventDefault(); setInvite(e) }
    window.addEventListener('beforeinstallprompt', avant)
    window.addEventListener('appinstalled', () => setInstalle(true))
    return () => window.removeEventListener('beforeinstallprompt', avant)
  }, [])

  async function installer() {
    if (!invite) return
    invite.prompt()
    await invite.userChoice
    setInvite(null)
  }

  return (
    <>
      <Bandeau surtitre="Zones sans réseau" titre="Fil d'Or hors réseau">
        Le village n'a pas de réseau : le suivi continue. Fil d'Or s'installe comme un logiciel, garde les saisies sur l'appareil
        et les envoie dans la base dès qu'il y a du réseau, directement ou par une clé USB.
      </Bandeau>
      <main className="page">
        <div className="grille">
          <article className="carte">
            <h2>1. Installer le logiciel</h2>
            <p>Sur ordinateur ou téléphone, ouvrez le site une fois avec du réseau, puis installez-le. Il s'ouvre ensuite sans connexion.</p>
            <button className="bouton" type="button" disabled={!invite} onClick={installer}>{installe ? 'Installé' : 'Installer Fil d’Or'}</button>
            {!invite && !installe && <p className="petit">Si le bouton est grisé : menu du navigateur, « Installer l'application » ou « Ajouter à l'écran d'accueil ».</p>}
          </article>
          <article className="carte">
            <h2>2. Saisir au village</h2>
            <p>L'agent enregistre visites, inscriptions et naissances. Tout reste sur l'appareil, rien n'est perdu si la batterie ou le réseau tombe.</p>
          </article>
          <article className="carte">
            <h2>3. Envoyer dans la base</h2>
            <p><b>Avec du réseau :</b> l'envoi part tout seul.</p>
            <p><b>Sans réseau :</b> « Copier sur une clé » crée un fichier. Sur un poste connecté, « Charger depuis une clé » l'envoie dans la base, une seule fois.</p>
          </article>
        </div>
        <p><Link className="bouton secondaire" to="/connexion">Essayer comme agent de santé</Link></p>
      </main>
    </>
  )
}
