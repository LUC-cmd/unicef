import { useEffect, useRef, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { derniereSynchro, nombreEnAttente, synchroniser } from '../lib/reseauClient.js'
import { exporterFile, importerFile } from '../lib/synchro.js'

const quand = (t) => (t ? new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'jamais')

/** Hors réseau, en ligne : ce qui attend sur cet appareil, comment l'envoyer, comment le copier vers un endroit où il y a du réseau. */
export default function Synchro() {
  const [enLigne, setEnLigne] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [n, setN] = useState(nombreEnAttente)
  const [derniere, setDerniere] = useState(derniereSynchro)
  const [mdp, setMdp] = useState('')
  const [msg, setMsg] = useState('')
  const [ep, setEp] = useState(false)
  const champ = useRef(null)
  const maj = () => { setN(nombreEnAttente()); setDerniere(derniereSynchro()) }
  useEffect(() => {
    const a = () => { setEnLigne(true); synchroniser().then(maj) }; const b = () => setEnLigne(false)
    window.addEventListener('online', a); window.addEventListener('offline', b)
    const t = setInterval(maj, 4000)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); clearInterval(t) }
  }, [])
  const envoyer = async () => { setEp(true); setMsg(''); const k = await synchroniser(); maj(); setEp(false); setMsg(k ? `${k} élément(s) envoyé(s).` : nombreEnAttente() ? 'Pas de réseau pour le moment : tout est gardé.' : 'Rien à envoyer.') }
  const sauver = async () => {
    try {
      const t = await exporterFile(mdp)
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = `fildor-synchro-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href)
      setMsg(`${nombreEnAttente()} élément(s) copiés dans un fichier chiffré. Gardez le mot de passe à part : sans lui, le fichier est illisible.`)
    } catch (e) { setMsg(e.message) }
  }
  const lire = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    try { const k = await importerFile(await f.text(), mdp); maj(); setMsg(`${k} élément(s) importés. ${navigator.onLine ? 'Envoi en cours…' : 'Ils partiront dès qu’il y aura du réseau.'}`); if (navigator.onLine) synchroniser().then(maj) } catch (er) { setMsg(er.message) }
    e.target.value = ''
  }
  return (
    <>
      <Bandeau titre="Hors réseau et synchronisation">Un village sans réseau n’arrête rien : on saisit sur le téléphone, et les données partent dès qu’il y a du réseau, ou par un fichier chiffré porté à la main.</Bandeau>
      <div className="tuiles">
        <div className={`tuile ${enLigne ? '' : 'alerte'}`}><b>{enLigne ? 'En ligne' : 'Hors ligne'}</b><span>état du réseau sur cet appareil</span></div>
        <div className={`tuile ${n ? 'alerte' : ''}`}><b>{n}</b><span>élément(s) en attente d’envoi</span></div>
        <div className="tuile"><b>{quand(derniere)}</b><span>dernier envoi réussi</span></div>
      </div>
      <section className="carte">
        <h2>Envoyer maintenant</h2>
        <p>Tout ce qui est saisi sans réseau reste sur cet appareil et part tout seul au retour de la connexion. Un envoi répété ne crée jamais de doublon.</p>
        <p><button type="button" className="bouton" onClick={envoyer} disabled={ep || n === 0}>{ep ? 'Envoi…' : 'Envoyer ce qui attend'}</button></p>
      </section>
      <section className="carte">
        <h2>Copier vers un endroit où il y a du réseau</h2>
        <p>Pas de réseau du tout ? Copiez les données dans un fichier chiffré, portez-le (clé USB, Bluetooth, carte mémoire) sur un autre appareil qui a du réseau, et ouvrez-le là.</p>
        <label className="champ-synchro">Mot de passe du fichier (6 caractères au moins)
          <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" />
        </label>
        <div className="boutons-ligne">
          <button type="button" className="bouton" onClick={sauver} disabled={n === 0 || mdp.length < 6}>Copier dans un fichier chiffré</button>
          <button type="button" className="bouton secondaire" onClick={() => champ.current?.click()} disabled={mdp.length < 6}>Ouvrir un fichier reçu</button>
          <input ref={champ} type="file" accept="application/json,.json" onChange={lire} hidden />
        </div>
        {msg && <p role="status"><b>{msg}</b></p>}
      </section>
      <section className="carte">
        <h2>Les quatre situations</h2>
        <dl className="doc-liste">
          <div><dt>Village avec réseau</dt><dd>Tout part en direct. Les tableaux de bord se mettent à jour tout seuls.</dd></div>
          <div><dt>Village avec réseau faible</dt><dd>L’envoi est retenté par petits paquets jusqu’au succès.</dd></div>
          <div><dt>Village sans réseau</dt><dd>L’agent saisit sur son téléphone. Au retour en zone couverte, tout part. Sinon : fichier chiffré porté à la main.</dd></div>
          <div><dt>Téléphone sans l’application</dt><dd>Installez-la sans internet : le fichier d’installation (APK) se copie par clé USB ou Bluetooth, puis s’ouvre sur le téléphone. L’agent se connecte avec son identifiant, et le téléphone garde sa file d’attente.</dd></div>
        </dl>
      </section>
      <section className="carte">
        <h2>La sécurité, derrière</h2>
        <ul className="liste-coches">
          <li>Chaque accès a son rôle : on ne voit que son espace, et un partenaire ne peut rien modifier.</li>
          <li>Les mots de passe ne sont jamais conservés : seule leur empreinte l’est. Un accès se crée avec un code à usage unique.</li>
          <li>Le fichier de synchronisation est chiffré (AES-256) avec votre mot de passe. Il ne contient ni nom ni adresse.</li>
          <li>Chaque élément importé est vérifié, puis envoyé avec le compte de la personne connectée : le service refuse ce qui n’est pas permis.</li>
          <li>Chaque envoi porte un identifiant : le même élément reçu deux fois n’est enregistré qu’une fois.</li>
          <li>Sur le téléphone, les données en attente restent dans l’espace privé de l’application, sans nom d’enfant.</li>
        </ul>
        <p className="petit">À renforcer avant un vrai déploiement : chiffrement de la file sur l’appareil, verrouillage par code, audit de sécurité indépendant.</p>
      </section>
    </>
  )
}
