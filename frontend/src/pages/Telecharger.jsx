import { useEffect, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import QrCode from '../components/QrCode.jsx'

const LIEN_WINDOWS = '/telechargements/Fil-dOr-Windows.zip'

export default function Telecharger() {
  const apk = globalThis.FILDOR_CONFIG?.apkUrl || ''
  const android = /Android/i.test(navigator.userAgent || '')
  const page = `${window.location.origin}/telecharger`
  const [invite, setInvite] = useState(null)
  const [installe, setInstalle] = useState(false)
  useEffect(() => {
    const avant = (e) => { e.preventDefault(); setInvite(e) }
    const fini = () => setInstalle(true)
    window.addEventListener('beforeinstallprompt', avant)
    window.addEventListener('appinstalled', fini)
    return () => { window.removeEventListener('beforeinstallprompt', avant); window.removeEventListener('appinstalled', fini) }
  }, [])
  async function ajouter() { if (invite) { invite.prompt(); await invite.userChoice; setInvite(null) } }
  const iphone = /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  const mobile = android || iphone
  const dansApp = window.matchMedia?.('(display-mode: standalone)').matches

  return (
    <>
      <Bandeau surtitre="Installer" titre="Fil d'Or sur votre téléphone">
        Scannez le code avec l'appareil photo : l'installation se propose directement sur le téléphone.
      </Bandeau>
      <main className="page">
        {mobile && !dansApp && (
          <section className="carte installer-mobile" aria-labelledby="t-inst">
            <img src="/icone-192.png" alt="" width="96" height="96" />
            <h2 id="t-inst">Installer Fil d'Or</h2>
            <p className="petit">Sur l'écran d'accueil de votre téléphone, avec son logo, même sans réseau.</p>
            {installe ? <p><b>Application installée.</b></p>
              : invite ? <button type="button" className="bouton gros" onClick={ajouter}>Installer l'application</button>
              : apk && android ? <a className="bouton gros" href={apk}>Télécharger et installer</a>
              : iphone ? <p className="petit">Sur iPhone : touchez le bouton Partager de Safari, puis « Sur l'écran d'accueil ».</p>
              : <p className="petit">Ouvrez le menu ⋮ du navigateur, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».</p>}
          </section>
        )}
        <section className="carte telechargement telecharger-haut">
          <div className="telecharger-qr">
            <QrCode valeur={page} titre="Code QR pour installer Fil d'Or" />
            <p className="petit">Scannez ce code, ou envoyez le lien <b>{page.replace(/^https?:\/\//, '')}</b></p>
          </div>
          <div>
            <h2>Android</h2>
            {android ? (
              <>
                {apk
                  ? <p><a className="bouton gros" href={apk}>Télécharger et installer l'application</a></p>
                  : <p className="petit">Le fichier d'installation n'est pas encore publié. En attendant, utilisez le bouton ci-dessous.</p>}
                <p><button type="button" className={`bouton ${apk ? 'secondaire' : ''}`} onClick={ajouter} disabled={!invite || installe}>{installe ? 'Déjà ajoutée' : 'Ajouter à l’écran d’accueil'}</button></p>
                {!invite && !installe && <p className="petit">Si le bouton est grisé : menu ⋮ de Chrome, puis « Ajouter à l'écran d'accueil ».</p>}
              </>
            ) : (
              <p>Ouvrez cette page sur un téléphone Android, ou scannez le code à côté.</p>
            )}
            <ol className="pas-a-pas">
              <li>Appuyez sur « Télécharger », puis ouvrez le fichier reçu.</li>
              <li>Si Android le demande, autorisez l'installation depuis ce navigateur (une seule fois).</li>
              <li>Ouvrez Fil d'Or. Au premier lancement, gardez le réseau quelques secondes.</li>
            </ol>
            <p className="petit"><b>Mises à jour :</b> l'application affiche toujours la dernière version du site, sans rien réinstaller. Si une nouvelle version de l'application elle-même est publiée, ce même code QR et ce même lien donnent le nouveau fichier.</p>
          </div>
        </section>
        <section className="carte">
          <h2>Ordinateur Windows</h2>
          <p>Le logiciel fonctionne sans réseau et envoie les saisies par clé USB ou dès que le réseau revient.</p>
          <p><a className="bouton secondaire" href={LIEN_WINDOWS}>Télécharger pour Windows</a></p>
        </section>
      </main>
    </>
  )
}
