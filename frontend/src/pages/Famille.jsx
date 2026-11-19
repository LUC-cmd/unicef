import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DeclarationFamille from '../components/DeclarationFamille.jsx'
import ConfirmerSortie from '../components/ConfirmerSortie.jsx'
import Bandeau from '../components/Bandeau.jsx'
import Picto from '../components/Picto.jsx'
import { api, definirSecretFamille } from '../lib/api.js'
import { formaterDate } from '../lib/format.js'
import FilEnfant from '../components/FilEnfant.jsx'
import { ecrireCompte, lireCompte, useInstallation } from '../lib/famille.js'

const TYPES = {
  RAPPEL: ['Rappel de rendez-vous', '#0E86B8'], NAISSANCE: ['Avis de la mairie : acte prêt', '#B87B00'], JEU: ['Jeu de la semaine', '#00833E'],
  CRECHE: ['Crèche', '#00833E'], REPONSE_STRUCTURE: ['Réponse d’une structure', '#6A4C93'], RAPPEL_GENERAL: ['Rappel général', '#0E86B8'],
}
const DOSSIER = [
  ['date', 'La date de naissance, et si possible l’heure', 'Le carnet de santé ou l’attestation de la maternité la porte.'],
  ['lieu', 'Le lieu de naissance', 'Centre de santé, maternité ou domicile.'],
  ['sexe', 'Le sexe de l’enfant', ''],
  ['prenoms', 'Les prénoms choisis par la famille', 'La famille les donne à la mairie quand elle est prête : Fil d’Or ne les demande pas.'],
  ['mere', 'Une pièce d’identité de la mère, si elle en a une', 'Sans pièce, la mairie indique la marche à suivre.'],
  ['pere', 'Le père : pièce d’identité, ou « père non déclaré »', 'Cela n’empêche pas la déclaration par la mère.'],
  ['attestation', 'L’attestation de naissance de la maternité', 'Pour une naissance à domicile : deux témoins adultes.'],
  ['temoins', 'Deux adultes de confiance qui connaissent la naissance', 'Seulement si l’attestation manque.'],
]
const lire = (c, d) => { try { return JSON.parse(localStorage.getItem(c)) ?? d } catch { return d } }
const ecrire = (c, v) => { try { localStorage.setItem(c, JSON.stringify(v)) } catch { /* stockage indisponible */ } }

async function afficherNotification(titre, corps) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return reg.showNotification(titre, { body: corps, icon: '/icone-192.png', badge: '/icone-192.png', tag: 'fildor', data: { url: '/famille' } })
    new Notification(titre, { body: corps, icon: '/icone-192.png' })
  } catch { /* notification refusée par l'appareil */ }
}

function Connexion({ onConnecte }) {
  const [tel, setTel] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState('')
  const [secretRequis, setSecretRequis] = useState(false)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const entrer = async (e) => {
    e.preventDefault(); setAttente(true); setErreur('')
    definirSecretFamille(secret.trim())
    try {
      const p = await api.post('/api/public/famille/connexion', { telephone: tel, codeFamille: code })
      const codeF = code.trim().toUpperCase()
      ecrireCompte({ telephone: tel, codeFamille: codeF, secret: codeF === 'F-0001' ? 'demo' : secret.trim() }); onConnecte(p)
    } catch (err) {
      definirSecretFamille('')
      if (err.statut === 401) { setSecretRequis(true); setErreur('Entrez le code secret que vous avez choisi à votre première connexion.') }
      else if (err.statut === 429) setErreur(err.message)
      else setErreur(err.statut === 403 ? (secret ? 'Numéro, code famille ou code secret incorrect.' : 'Numéro ou code famille incorrect. Le code est écrit sur votre carte de famille ; sinon demandez-le à votre agent de santé.') : err.message)
    }
    finally { setAttente(false) }
  }
  return (
    <main className="page espace-famille">
      <form className="carte connexion-famille" onSubmit={entrer}>
        <h2>Entrer dans mon espace</h2>
        <p className="petit">Le numéro de téléphone de la famille et le code famille (sur la carte de famille). À la première connexion, vous choisirez un code secret personnel : sans lui, personne d'autre ne peut ouvrir votre espace, même avec votre carte.</p>
        <label className="champ">Numéro de téléphone<input inputMode="tel" autoComplete="tel" required value={tel} onChange={(e) => setTel(e.target.value)} placeholder="90 00 00 01" /></label>
        <label className="champ">Code famille<input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="F-0001" autoCapitalize="characters" /></label>
        <label className="champ">Code secret {secretRequis ? '' : <em>(après votre première connexion)</em>}<input type="password" inputMode="numeric" autoComplete="current-password" pattern="\d{4,6}" maxLength={6} value={secret} onChange={(e) => setSecret(e.target.value.replace(/\D/g, ''))} placeholder="4 à 6 chiffres" required={secretRequis} /></label>
        {erreur && <p className="alerte-jour" role="alert">{erreur}</p>}
        <button className="bouton" disabled={attente}>Entrer dans mon espace</button>
        <button type="button" className="bouton secondaire" onClick={() => { setTel('90000001'); setCode('F-0001'); setSecret('') }}>Remplir la famille de démonstration</button>
        <p className="petit">Vous êtes agent de santé, mairie ou structure ? <Link to="/connexion">Ouvrir mon espace professionnel</Link>.</p>
        <p className="petit">Une famille sans compte : l'agent de santé l'inscrit lors de sa visite et lui remet sa carte de famille.</p>
      </form>
    </main>
  )
}

export default function Famille() {
  const [compte, setCompte] = useState(lireCompte)
  const [profil, setProfil] = useState(null)
  if (!compte) return <><Bandeau surtitre="Pour les familles" titre="Mon espace famille">Rappels, crèches, dossier de naissance : tout ce qui concerne votre famille, au même endroit.</Bandeau><Connexion onConnecte={(p) => { setProfil(p); setCompte(lireCompte()) }} /></>
  return <Tableau compte={compte} profil={profil} setProfil={setProfil} sortir={() => { definirSecretFamille(''); ecrireCompte(null); setCompte(null); setProfil(null) }} onSecret={(sec) => { const c = { ...compte, secret: sec }; definirSecretFamille(sec); ecrireCompte(c); setCompte(c) }} />
}

function ChoixSecret({ compte, onSecret, sortir }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const valider = async (e) => {
    e.preventDefault()
    if (!/^\d{4,6}$/.test(a)) { setErreur('Le code secret a 4 à 6 chiffres.'); return }
    if (a !== b) { setErreur('Les deux codes ne sont pas identiques.'); return }
    setAttente(true); setErreur('')
    try { await api.post('/api/public/famille/code-secret', { telephone: compte.telephone, codeFamille: compte.codeFamille, nouveauCode: a }); onSecret(a) }
    catch (err) { setErreur(err.message) } finally { setAttente(false) }
  }
  return (
    <main className="page espace-famille">
      <form className="carte connexion-famille" onSubmit={valider}>
        <h2>Choisissez votre code secret</h2>
        <p className="petit">Votre carte de famille peut être vue par d'autres personnes. Ce code, que vous seul connaissez, protège les informations de vos enfants. Notez-le ailleurs que sur la carte. Il vous sera demandé à chaque connexion. Si vous l'oubliez, votre agent de santé peut l'effacer.</p>
        <label className="champ">Code secret (4 à 6 chiffres)<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ''))} required /></label>
        <label className="champ">Répétez le code<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ''))} required /></label>
        {erreur && <p className="alerte-jour" role="alert">{erreur}</p>}
        <button className="bouton" disabled={attente}>Enregistrer mon code secret</button>
        <button type="button" className="bouton secondaire" onClick={sortir}>Quitter</button>
      </form>
    </main>
  )
}

function Tableau({ compte, profil, setProfil, sortir, onSecret }) {
  const numero = compte.telephone
  const [messages, setMessages] = useState([])
  const [erreur, setErreur] = useState('')
  const [confirmerSortie, setConfirmerSortie] = useState(false)
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'indisponible'))
  const [coches, setCoches] = useState(() => lire('fildor.famille.dossier', {}))
  const [proches, setProches] = useState([])
  const [zones, setZones] = useState([])
  const [nouvelleZone, setNouvelleZone] = useState('')
  const [info, setInfo] = useState(null)
  const { installee, peutInstaller, installer } = useInstallation()
  const vus = useRef(new Set(lire('fildor.famille.vus', [])))
  const premier = useRef(true)
  const acces = { telephone: compte.telephone, codeFamille: compte.codeFamille }

  const chargerProfil = useCallback(async () => {
    try { setProfil(await api.post('/api/public/famille/connexion', acces)); setProches(await api.post('/api/public/famille/creches/proches', acces)) }
    catch (e) { if (e.statut === 403 || e.statut === 401) sortir(); else setErreur('Pas de réseau pour le moment. Vos informations reviendront avec la connexion.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compte.telephone, compte.codeFamille])

  const charger = useCallback(async () => {
    try {
      const r = await api.post('/api/public/sms', { telephone: numero })
      const liste = r.messages ?? []
      setMessages(liste); setErreur('')
      const nouveaux = liste.filter((m) => !vus.current.has(`${m.type}-${m.id}`))
      if (!premier.current && nouveaux.length && 'Notification' in window && Notification.permission === 'granted') {
        nouveaux.slice(0, 3).forEach((m) => afficherNotification(TYPES[m.type]?.[0] ?? 'Fil d\u2019Or', m.message))
      }
      premier.current = false
      nouveaux.forEach((m) => vus.current.add(`${m.type}-${m.id}`))
      ecrire('fildor.famille.vus', [...vus.current].slice(-300))
    } catch { setErreur('Pas de réseau pour le moment. Vos messages s\u2019afficheront dès le retour de la connexion.') }
  }, [numero])

  useEffect(() => { chargerProfil(); api.get('/api/public/ecoute/zones').then(setZones).catch(() => {}) }, [chargerProfil])
  useEffect(() => { premier.current = true; charger() }, [charger])
  useEffect(() => {
    const t = setInterval(charger, 60000)
    const retour = () => { if (document.visibilityState === 'visible') charger() }
    document.addEventListener('visibilitychange', retour)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', retour) }
  }, [charger])

  const activer = async () => { if ('Notification' in window) setPermission(await Notification.requestPermission()) }
  const cocher = (k) => { const n = { ...coches, [k]: !coches[k] }; setCoches(n); ecrire('fildor.famille.dossier', n) }
  const faits = DOSSIER.filter(([k]) => coches[k]).length
  const repondre = async (id) => { try { await api.post(`/api/public/sms/${id}/ok`, { telephone: numero }); charger() } catch { setErreur('Réponse non envoyée. Réessayez avec du réseau.') } }
  const acte = messages.find((m) => m.type === 'NAISSANCE')
  const fixerNombre = async (n) => { if (n < 0 || n > 20) return; try { setProfil(await api.post('/api/public/famille/enfants-declares', { ...acces, nombre: n })) } catch (e) { setInfo({ ok: false, texte: e.message }) } }
  const demenager = async () => {
    try { const p = await api.post('/api/public/famille/demenagement', { ...acces, codeZone: nouvelleZone }); setProfil(p); setProches(await api.post('/api/public/famille/creches/proches', acces)); setInfo({ ok: true, texte: `Votre famille est maintenant dans la zone ${p.zone}. Les crèches proches et votre agent de santé suivent.` }); setNouvelleZone('') }
    catch (e) { setInfo({ ok: false, texte: e.message }) }
  }
  const declares = profil?.enfantsDeclares ?? 0
  const suivis = profil?.enfantsSuivis ?? 0

  if (!compte.secret) return <ChoixSecret compte={compte} onSecret={onSecret} sortir={sortir} />
  return (
    <>
      <Bandeau surtitre="Pour les familles" titre={`Famille ${compte.codeFamille}`}>
        {profil ? `Zone : ${profil.zone}. ` : ''}Vos rappels, les crèches proches de chez vous et votre dossier de naissance.
      </Bandeau>
      <main className="page espace-famille">
        <div className="famille-barre"><span className="petit">Connecté avec le numéro {compte.telephone}</span><button className="bouton secondaire petit-bouton" onClick={() => setConfirmerSortie(true)}>Se déconnecter</button></div>
        <ConfirmerSortie ouvert={confirmerSortie} onAnnuler={() => setConfirmerSortie(false)} onConfirmer={() => { setConfirmerSortie(false); sortir() }} texte="Vous quittez votre espace famille. Pour y revenir, il faudra le numéro de téléphone, le code famille et votre code secret." />
        {acte && <div className="alerte-acte" role="status"><b>Bonne nouvelle : l'acte de naissance est prêt.</b> {acte.message} <Link to="/acte">Voir les étapes du retrait</Link></div>}

        {!installee && (
          <section className="carte carte-installer" aria-labelledby="t-install">
            <h2 id="t-install">Installer l'application sur mon téléphone</h2>
            <p>Avec l'application, les rappels, les crèches proches et le dossier de naissance sont toujours à portée de main, même avec peu de réseau.</p>
            {peutInstaller ? <button className="bouton" onClick={installer}>Installer Fil d'Or</button> : <p className="petit">Sur Android : menu du navigateur, puis « Ajouter à l'écran d'accueil ».</p>}
            <Link className="bouton secondaire" to="/telecharger">Autres façons d'installer</Link>
          </section>
        )}

        <div className="famille-tuiles">
          <div><b>{suivis}</b><span>enfant{suivis > 1 ? 's' : ''} suivi{suivis > 1 ? 's' : ''} par l'agent</span></div>
          <div><b>{declares}</b><span>enfant{declares > 1 ? 's' : ''} dans la famille</span></div>
          <div><b>{proches.length}</b><span>crèche{proches.length > 1 ? 's' : ''} près de chez vous</span></div>
        </div>

        <section className="carte" aria-labelledby="t-enfants">
          <h2 id="t-enfants">Mes enfants</h2>
          <div className="nb-enfants">
            <span>Combien d'enfants avez-vous ?</span>
            <div className="pas"><button aria-label="Un enfant de moins" onClick={() => fixerNombre(declares - 1)}>−</button><b aria-live="polite">{declares}</b><button aria-label="Un enfant de plus" onClick={() => fixerNombre(declares + 1)}>+</button></div>
          </div>
          {profil && declares > suivis && <p className="petit">{declares - suivis} enfant(s) pas encore suivi(s) : votre agent de santé les inscrira à sa prochaine visite, ou au centre de santé avec le carnet.</p>}
          <ul className="fam-boite">
            {(profil?.enfants ?? []).map((e) => (
              <li key={e.codeEnfant} style={{ '--c': '#0E86B8' }}><b>Enfant {e.codeEnfant}</b><small>{e.statut === 'ENFANT' ? `${e.ageMois} mois` : `Naissance attendue vers le ${formaterDate(e.termePrevu)}`}</small><FilEnfant enfant={e} /></li>
            ))}
          </ul>
        </section>

        <section className="carte famille-pour-vous" aria-labelledby="t-pourvous">
          <h2 id="t-pourvous">Pour vous et vos enfants</h2>
          <div className="pour-vous-grille">
            {(profil?.enfants || []).some((e) => e.statut === 'GROSSESSE') && (
              <Link to="/grossesse" className="pour-vous-carte"><Picto nom="enceinte" /><b>Ma grossesse, mois par mois</b><span>Consultations, exercices doux, signes d'alerte, kit d'accouchement.</span></Link>
            )}
            {(profil?.enfants || []).some((e) => e.statut === 'ENFANT') && (
              <Link to="/jeux" className="pour-vous-carte"><Picto nom="danse" /><b>Jeux et vidéos d'éveil</b><span>Des jeux simples à faire à la maison, adaptés à l'âge de l'enfant.</span></Link>
            )}
            <Link to="/assistant" className="pour-vous-carte"><Picto nom="parole" /><b>Poser une question</b><span>L'assistant répond sur la santé de l'enfant, et dit quand voir un agent.</span></Link>
            <Link to="/acte" className="pour-vous-carte"><Picto nom="fiche" /><b>Obtenir l'acte de naissance</b><span>Les étapes, les délais et la gratuité.</span></Link>
          </div>
        </section>

        <DeclarationFamille compte={compte} profil={profil} />

        <section className="carte carte-creche" aria-labelledby="t-creche">
          <h2 id="t-creche">Crèches près de chez moi</h2>
          {proches.slice(0, 3).map((x) => (
            <p key={x.creche.code} className="creche-ligne"><b>{x.creche.nom}</b><span>{x.proximite}</span></p>
          ))}
          <Link className="bouton" to="/famille/creche">Voir les conditions et réserver</Link>
        </section>

        <section className="carte" aria-labelledby="t-boite">
          <h2 id="t-boite">Ma boîte de messages</h2>
          <div className="notif-etat">
            {permission === 'granted' && <p className="ok-notif">Notifications actives sur ce téléphone : un message arrive, l'appareil le signale.</p>}
            {permission === 'default' && <button className="bouton" onClick={activer}>Activer les notifications sur ce téléphone</button>}
            {permission === 'denied' && <p className="petit">Les notifications sont refusées dans les réglages de ce téléphone. Les SMS continuent d'arriver.</p>}
            {permission === 'indisponible' && <p className="petit">Ce navigateur ne gère pas les notifications. Les SMS continuent d'arriver.</p>}
          </div>
          {erreur && <p className="petit" role="alert">{erreur}</p>}
          {messages.length === 0 && !erreur && <p className="petit">Aucun message pour le moment.</p>}
          <ul className="fam-boite">
            {messages.map((m) => (
              <li key={`${m.type}-${m.id}`} style={{ '--c': TYPES[m.type]?.[1] ?? '#0E86B8' }}>
                <b>{TYPES[m.type]?.[0] ?? 'Message'}</b>
                <p>{m.message}</p>
                <small>{formaterDate(m.envoyeLe)}{m.type === 'RAPPEL' && (m.statut === 'ACQUITTE' ? ' · Confirmé' : m.statut === 'SANS_REPONSE' ? ' · Sans réponse : un agent passera' : '')}</small>
                {m.type === 'RAPPEL' && m.statut !== 'ACQUITTE' && <button className="bouton petit-bouton" onClick={() => repondre(m.id)}>Répondre OK</button>}
              </li>
            ))}
          </ul>
        </section>

        <section className="carte" aria-labelledby="t-demenage">
          <h2 id="t-demenage">J'ai déménagé</h2>
          <p className="petit">Votre carnet vous suit : choisissez votre nouvelle zone. Les rappels, les crèches proches et l'agent de santé changent avec vous. Aucune adresse n'est demandée.</p>
          <label className="champ">Ma nouvelle zone
            <select value={nouvelleZone} onChange={(e) => setNouvelleZone(e.target.value)}>
              <option value="">Choisir une zone</option>
              {zones.filter((z) => z.code !== profil?.zoneCode).map((z) => <option key={z.code} value={z.code}>{z.nom}</option>)}
            </select>
          </label>
          <button className="bouton" disabled={!nouvelleZone} onClick={demenager}>Confirmer le déménagement</button>
          {info && <p className={info.ok ? 'ok-notif' : 'alerte-jour'} role="status">{info.texte}</p>}
        </section>

        <section className="carte" aria-labelledby="t-canaux">
          <h2 id="t-canaux">Comment chaque famille est prévenue</h2>
          <p className="petit">Le même message, la porte qui convient à la famille. Si une porte reste sans réponse, la suivante s'ouvre, jusqu'à la visite de l'agent.</p>
          <ol className="fam-canaux">
            <li><b>Application sur le téléphone</b><span>Notification sur l'écran et message dans cette boîte, même au retour du réseau.</span></li>
            <li><b>Téléphone basique</b><span>SMS court, sans nom d'enfant. La famille répond OK pour confirmer. Appel vocal dans sa langue si elle préfère.</span></li>
            <li><b>Famille sans téléphone</b><span>Un proche désigné reçoit le rappel général et prévient la famille. Le carnet imprimé garde les dates.</span></li>
            <li><b>Aucune réponse</b><span>La famille monte en haut de la liste de l'agent de santé, qui passe la voir.</span></li>
          </ol>
        </section>

        <section className="carte" aria-labelledby="t-dossier">
          <h2 id="t-dossier">Préparer la déclaration de naissance</h2>
          <p className="petit">Cochez ce que la famille a déjà. La liste reste sur ce téléphone et n'est envoyée à personne : les noms ne sont donnés qu'à la mairie, par la famille.</p>
          <div className="barre-progres" aria-hidden="true"><i style={{ width: `${(faits / DOSSIER.length) * 100}%` }} /></div>
          <p><b>{faits} sur {DOSSIER.length}</b> éléments prêts</p>
          <ul className="fam-dossier">
            {DOSSIER.map(([k, t, d]) => (
              <li key={k}><label><input type="checkbox" checked={Boolean(coches[k])} onChange={() => cocher(k)} /><span><b>{t}</b>{d && <small>{d}</small>}</span></label></li>
            ))}
          </ul>
          <Link className="bouton" to="/acte">Voir le chemin vers l'acte</Link>
        </section>
      </main>
    </>
  )
}
