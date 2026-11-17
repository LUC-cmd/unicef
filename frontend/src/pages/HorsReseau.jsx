import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

const LIEN_WINDOWS = '/telechargements/Fil-dOr-Windows.zip'

export default function HorsReseau() {
  const dansLeLogiciel = Boolean(globalThis.FILDOR_CONFIG?.logiciel)
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
        Sans réseau, le suivi continue. Les saisies partent au retour du réseau, ou par clé USB.
      </Bandeau>
      <main className="page">
        {!dansLeLogiciel && (
          <section className="carte telechargement installer-bloc">
            <div>
              <h2>Installer Fil d'Or</h2>
              <p>Sur ordinateur Windows ou sur téléphone Android. Les deux marchent sans réseau et envoient les saisies au retour du réseau.</p>
              <p className="heros-actions">
                <a className="bouton" href={LIEN_WINDOWS}>Windows (environ 105 Mo)</a>
                <Link className="bouton secondaire" to="/telecharger">Android, code QR et lien</Link>
              </p>
              <ol className="pas-a-pas">
                <li>Windows : clic droit sur le fichier, « Extraire tout », puis double-clic sur <b>FilDor.exe</b>. Si Windows prévient, « Informations complémentaires », puis « Exécuter quand même ».</li>
                <li>Sur l'écran de connexion, « Entrer sans réseau » : choisissez votre zone et saisissez.</li>
                <li>Avant de partir : <b>Clé USB et envoi</b>, « Copier sur une clé ». Un poste avec réseau envoie ensuite le fichier.</li>
              </ol>
            </div>
          </section>
        )}
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
