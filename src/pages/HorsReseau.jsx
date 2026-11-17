import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

const LIEN_WINDOWS = '/telechargements/Fil-dOr-Windows.zip'
const LIEN_ANDROID = globalThis.FILDOR_CONFIG?.apkUrl || ''

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
          <section className="carte telechargement">
            <h2>Logiciel Windows : Fil d'Or hors réseau</h2>
            <p>Un seul dossier à copier : il fonctionne sans réseau, sans installation et sans droits d'administrateur. Il suffit de le décompresser et d'ouvrir <b>FilDor.exe</b>.</p>
            <p><a className="bouton" href={LIEN_WINDOWS}>Télécharger pour Windows (environ 105 Mo)</a></p>
            <ol className="pas-a-pas">
              <li>Faites un clic droit sur le fichier téléchargé, puis « Extraire tout ».</li>
              <li>Ouvrez le dossier et double-cliquez sur <b>FilDor.exe</b>. Si Windows affiche « Windows a protégé votre ordinateur » : « Informations complémentaires », puis « Exécuter quand même » (le logiciel n'est pas encore signé).</li>
              <li>Sur l'écran de connexion, « Entrer sans réseau » : choisissez votre zone et saisissez.</li>
              <li>Avant de partir : <b>Synchronisation et clé USB</b>, « Copier sur une clé ». Un poste avec réseau envoie ensuite le fichier dans la base.</li>
            </ol>
          </section>
        )}
        {!dansLeLogiciel && (
          <section className="carte telechargement android">
            <h2>Android : Fil d'Or sur le téléphone</h2>
            <p>L'application garde les saisies sur le téléphone, même sans réseau, et les envoie au retour du réseau.</p>
            <div className="actions">
              {LIEN_ANDROID && <a className="bouton" href={LIEN_ANDROID}>Télécharger l'application Android (APK)</a>}
              <button type="button" className={`bouton ${LIEN_ANDROID ? 'secondaire' : ''}`} onClick={installer} disabled={!invite || installe}>{installe ? 'Déjà installée' : 'Ajouter à l\u2019écran d\u2019accueil'}</button>
            </div>
            {!invite && !installe && <p className="petit">Si le bouton est grisé : ouvrez ce site dans Chrome, menu ⋮, « Ajouter à l'écran d'accueil ».</p>}
            <p><Link to="/telecharger">Code QR et lien d'installation à partager</Link></p>
            {LIEN_ANDROID && <p className="petit">Pour installer l'APK : ouvrez le fichier, puis autorisez « les sources inconnues » si Android le demande.</p>}
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
