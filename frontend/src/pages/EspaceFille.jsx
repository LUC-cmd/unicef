import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import Borne3D from '../components/Borne3D.jsx'
import BorneEssai from '../components/BorneEssai.jsx'
import QrCode from '../components/QrCode.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import Shell from '../components/Shell.jsx'
import EspaceAdolescente from './EspaceAdolescente.jsx'
import Nutrition from './Nutrition.jsx'
import { PRODUITS, formater, lienQrCarte, lireBorne, ecrireBorne, resumeJournal } from '../lib/borne.js'
import { QUOTA_PERSO } from '../lib/cartePerso.js'
import { lireFille, lireCartePerso, sortirFille } from '../lib/fille.js'
import { ajouterJours, ecartJours, lireEspace } from '../lib/adolescente.js'
import { QUESTIONS_CONSULTATION, consulter } from '../lib/parcours.js'
import { reseau } from '../lib/reseauClient.js'

const GROUPES = [
  { titre: 'Mon espace', liens: [
    { to: '/fille', nom: 'Tableau de bord', icone: 'accueil', fin: true },
    { to: '/fille/parler', nom: 'Poser mes questions', icone: 'bulle' },
    { to: '/fille/borne', nom: 'Aller à la borne', icone: 'boite' },
    { to: '/fille/carte', nom: 'Ma carte et mon code', icone: 'cle' },
    { to: '/fille/accompagnement', nom: 'Être accompagnée (facultatif)', icone: 'bouclier' },
    { to: '/fille/cycle', nom: 'Mon cycle', icone: 'horloge' },
    { to: '/fille/lieux', nom: 'Boutiques et bornes près de moi', icone: 'carte' },
  ] },
]

const Tuile = ({ n, titre }) => <div className="reseau-tuile"><b>{n}</b><span>{titre}</span></div>

function Tableau({ f }) {
  const code = lireCartePerso()
  const e = lireEspace()
  const auj = new Date().toISOString().slice(0, 10)
  const jour = e.debut ? ecartJours(e.debut, auj) + 1 : null
  const prochaines = e.debut ? ajouterJours(e.debut, Number(e.duree) || 28) : null
  const droits = Object.values(QUOTA_PERSO).reduce((a, b) => a + b, 0)
  const retraits = Object.values(resumeJournal(lireBorne())).reduce((a, j) => a + Object.values(j).reduce((x, y) => x + y, 0), 0)
  return (
    <>
      <Bandeau titre="Tableau de bord">Bonjour {f.pseudo}. Ici, personne ne connaît ton nom.</Bandeau>
      <div className="reseau-tuiles">
        <Tuile n={jour ? `J${jour}` : '–'} titre="Jour de mon cycle" />
        <Tuile n={droits} titre="Produits sur ma carte" />
        <Tuile n={retraits} titre="Produits déjà retirés" />
        <Tuile n={prochaines ? prochaines.slice(8) + '/' + prochaines.slice(5, 7) : '–'} titre="Prochaines règles, environ" />
      </div>
      <div className="fille-deux">
        <section className="carte reseau-afaire">
          <h2>Mon code</h2>
          <p className="be-code">{code ? formater(code) : '—'}</p>
          {code && <QrCode valeur={lienQrCarte(code)} taille={150} titre="QR code de ma carte" />}
          <p className="petit">À la borne, je tape ce numéro ou je montre ce QR. Personne d’autre ne le connaît.</p>
        </section>
        <section className="carte reseau-afaire">
          <h2>Que veux-tu faire ?</h2>
          <ul className="fille-actions">
            <li><Link className="bouton" to="/fille/parler">Poser une question, parler d’une douleur</Link></li>
            <li><Link className="bouton secondaire" to="/fille/borne">Retirer mes produits à la borne</Link></li>
            <li><Link className="bouton secondaire" to="/fille/accompagnement">Être accompagnée par une personne de confiance (facultatif)</Link></li>
            <li><Link className="bouton secondaire" to="/fille/lieux">Trouver la borne ou la boutique la plus proche</Link></li>
          </ul>
        </section>
      </div>
      <p className="petit">Compte de démonstration. Les données restent sur ce téléphone. Ce n’est pas un service officiel de l’UNICEF.</p>
    </>
  )
}

const MOTS = [
  [/(r[èe]gles?|douleur|mal au ventre|crampe)/i, 'regles'],
  [/(pertes?|blanch|d[ée]mangeaison)/i, 'pertes'],
  [/(pr[ée]servatif|prot[ée]ger|rapport)/i, 'preservatif'],
  [/(retard|enceinte|grossesse|test)/i, 'retard'],
]

/** Discussion privée : l'assistant écoute, pose les bonnes questions, puis dit quoi faire et quel produit retirer à la borne. */
function Parler() {
  const nav = useNavigate()
  const [msgs, setMsgs] = useState([{ de: 'bot', texte: 'Bonjour. Tu peux me poser une question ou me dire ce qui ne va pas, par exemple « j’ai mal pendant mes règles ». Je ne te demande pas ton nom.' }])
  const [texte, setTexte] = useState('')
  const [attente, setAttente] = useState(false)
  const [questions, setQuestions] = useState(null)
  const [coches, setCoches] = useState([])
  const fin = useRef(null)
  useEffect(() => { fin.current?.parentElement?.scrollTo?.({ top: fin.current.offsetTop, behavior: 'smooth' }) }, [msgs, questions])
  const ajoute = (m) => setMsgs((l) => [...l, m])

  const envoyer = async (e) => {
    e.preventDefault()
    const q = texte.trim(); if (!q || attente) return
    setTexte(''); ajoute({ de: 'moi', texte: q })
    const motif = MOTS.find(([re]) => re.test(q))?.[1]
    if (motif === 'regles' || motif === 'pertes') {
      setCoches([]); setQuestions(motif)
      ajoute({ de: 'bot', texte: motif === 'regles' ? 'Je comprends, ce n’est pas agréable. Pour bien te conseiller, dis-moi si une de ces choses est vraie.' : 'Merci de me le dire. Dis-moi si une de ces choses est vraie.' })
      return
    }
    if (motif === 'preservatif') { ajoute({ de: 'bot', texte: 'Tu as raison de t’en occuper. Un préservatif protège d’une grossesse et des infections. Tu n’as rien à cacher à la borne : personne ne connaît ton nom. Si ta carte le permet, tu peux en retirer.', action: ['preservatifs', 'Retirer des préservatifs à la borne'] }); return }
    if (motif === 'retard') { ajoute({ de: 'bot', texte: 'Un retard de règles peut avoir plusieurs causes. Le plus sûr est de faire un test au centre de santé, avec une personne de confiance. Avec le bon de consultation anonyme, on te reçoit sans te demander ton nom.', action: ['bon', 'Retirer un bon de consultation'] }); return }
    setAttente(true)
    try {
      const r = await fetch('/assistant/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, langue: 'fr' }), signal: AbortSignal.timeout(15000) })
      const d = await r.json().catch(() => null)
      ajoute({ de: 'bot', texte: d?.reponse || 'Je n’ai pas bien compris. Tu peux me dire si c’est à propos de tes règles, d’une douleur ou d’une protection ?' })
    } catch { ajoute({ de: 'bot', texte: 'Je n’arrive pas à joindre le service pour le moment. Pour les règles douloureuses, les pertes, la protection ou un retard, écris-le simplement : je peux déjà t’aider.' }) }
    finally { setAttente(false) }
  }
  const valider = () => {
    const r = consulter({ motif: questions, reponses: coches })
    ajoute({ de: 'bot', resultat: r, action: r.produit ? [r.produit, `Retirer ${PRODUITS[r.produit].toLowerCase()} à la borne`] : r.bon ? ['bon', 'Retirer un bon de consultation'] : null })
    setQuestions(null)
  }
  const liste = questions ? QUESTIONS_CONSULTATION[questions] : []
  return (
    <>
      <Bandeau titre="Poser mes questions">Une discussion privée. L’assistant ne remplace pas une soignante : il t’aide à savoir quoi faire.</Bandeau>
      <section className="carte chat-fille">
        <div className="chat-zone" role="log" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`chat-bulle ${m.de}`}>
              {m.texte && <p>{m.texte}</p>}
              {m.resultat && <><ResultatSoins niveau={m.resultat.niveau} titre={m.resultat.titre} texte={m.resultat.texte} /><ul>{m.resultat.conseils.map((c) => <li key={c}>{c}</li>)}</ul>{m.resultat.centre && <p><b>Où aller :</b> {m.resultat.centre.nom}</p>}</>}
              {m.action && <button type="button" className="bouton" onClick={() => nav(`/fille/borne?besoin=${m.action[0]}`)}>{m.action[1]}</button>}
            </div>
          ))}
          {attente && <div className="chat-bulle bot"><p>…</p></div>}
          <span ref={fin} />
        </div>
        {questions && (
          <div className="chat-choix">
            {liste.map(([id, lib]) => <label key={id}><input type="checkbox" checked={coches.includes(id)} onChange={() => setCoches((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id])} /> {lib}</label>)}
            <button type="button" className="bouton" onClick={valider}>Voir mon conseil</button>
          </div>
        )}
        <form className="chat-saisie" onSubmit={envoyer}>
          <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écris ici, par exemple : j’ai mal pendant mes règles" aria-label="Ma question" maxLength={300} />
          <button className="bouton" disabled={attente}>Envoyer</button>
        </form>
        <p className="petit">Danger (saignement important, évanouissement, violence) : va tout de suite à l’hôpital ou demande à une personne de confiance.</p>
      </section>
    </>
  )
}

function Borne({ f }) {
  const [params] = useSearchParams()
  const [etat, setEtatBrut] = useState(lireBorne)
  const [etape, setEtape] = useState(0)
  const setEtat = (e) => { setEtatBrut(e); ecrireBorne(e) }
  const besoin = params.get('besoin')
  return (
    <>
      <Bandeau titre="Aller à la borne">Choisis ce dont tu as besoin, tape ton numéro ou montre ton QR : la borne s’ouvre et les produits de ta carte sortent.</Bandeau>
      <div className="fille-borne">
        <div className="fille-borne-3d"><Borne3D auto actif={etape === 4} /></div>
        <BorneEssai etat={etat} setEtat={setEtat} cartePerso={lireCartePerso()} besoinInitial={besoin && PRODUITS[besoin] ? besoin : null} onEtape={setEtape} />
      </div>
    </>
  )
}

const CLE_ACCORD = 'fildor.accord'
const lireAccord = () => { try { return JSON.parse(localStorage.getItem(CLE_ACCORD) || 'null') } catch { return null } }
const MOTIFS_C = [['parler', 'Parler à une personne de confiance'], ['regles', 'Règles ou douleurs'], ['protection', 'Me protéger'], ['retard', 'Retard de règles'], ['autre', 'Autre chose']]

/** Par défaut, anonyme. Si elle le choisit, elle donne un prénom (ou un surnom) et dit comment être contactée : accord clair, retirable à tout moment. */
function Accompagnement() {
  const [accord, setAccord] = useState(lireAccord)
  const [f, setF] = useState({ prenom: '', nom: '', telephone: '', canal: 'visite', motif: 'parler', consentement: false })
  const [msg, setMsg] = useState(null)
  const code = lireCartePerso()
  const donner = async (e) => {
    e.preventDefault(); setMsg(null)
    try {
      await reseau.post('accompagnement', { ...f, code }, '')
      const a = { prenom: f.prenom, depuis: new Date().toISOString().slice(0, 10) }
      localStorage.setItem(CLE_ACCORD, JSON.stringify(a)); setAccord(a)
    } catch (er) { setMsg(er.message) }
  }
  const retirer = async () => {
    try { await reseau.post('accompagnement/retrait', { code }, ''); localStorage.removeItem(CLE_ACCORD); setAccord(null); setF({ ...f, consentement: false }); setMsg(null) }
    catch (er) { setMsg(er.message) }
  }
  return (
    <>
      <Bandeau titre="Être accompagnée">Tu n’es pas obligée. Tu peux rester anonyme ou choisir qu’une personne de confiance te contacte.</Bandeau>
      {accord ? (
        <section className="carte">
          <h2>Ton accord est donné</h2>
          <p>L’agent de santé peut voir ton prénom <b>{accord.prenom}</b> et te contacter comme tu l’as choisi. Ton accord date du {accord.depuis}.</p>
          <button type="button" className="bouton secondaire" onClick={retirer}>Retirer mon accord et redevenir anonyme</button>
          {msg && <p role="alert" className="erreur">{msg}</p>}
        </section>
      ) : (
        <section className="carte">
          <h2>Je veux qu’une personne de confiance me contacte</h2>
          <p className="petit">Si tu ne remplis rien, tu restes anonyme et tout continue de marcher comme avant.</p>
          <form className="ado-champs" onSubmit={donner}>
            <label>Prénom ou surnom (obligatoire ici)<input value={f.prenom} maxLength={40} onChange={(e) => setF({ ...f, prenom: e.target.value })} required /></label>
            <label>Nom (facultatif)<input value={f.nom} maxLength={40} onChange={(e) => setF({ ...f, nom: e.target.value })} /></label>
            <label>Pour quoi ?<select value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })}>{MOTIFS_C.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label>Comment te contacter ?<select value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value })}><option value="visite">Une visite discrète</option><option value="sms">Un SMS</option><option value="appel">Un appel</option></select></label>
            {f.canal !== 'visite' && <label>Numéro de téléphone<input type="tel" inputMode="tel" value={f.telephone} maxLength={20} onChange={(e) => setF({ ...f, telephone: e.target.value })} required /></label>}
            <label className="case"><input type="checkbox" checked={f.consentement} onChange={(e) => setF({ ...f, consentement: e.target.checked })} /> J’accepte que mon prénom et ces informations soient vus par l’agent de santé et le centre de santé. Je peux retirer mon accord quand je veux.</label>
            <p><button className="bouton" type="submit" disabled={!f.consentement}>Donner mon accord</button></p>
          </form>
          {msg && <p role="alert" className="erreur">{msg}</p>}
        </section>
      )}
    </>
  )
}

function Carte() {
  const code = lireCartePerso()
  const [jr] = useState(() => resumeJournal(lireBorne()))
  const jours = Object.entries(jr)
  return (
    <>
      <Bandeau titre="Ma carte et mon code">Un numéro rien qu’à moi. La borne ne garde jamais ce numéro, seulement son empreinte.</Bandeau>
      <section className="carte"><div className="ma-carte-corps"><div><p className="be-code">{code ? formater(code) : '—'}</p>
        <ul className="liste-coches">{Object.entries(QUOTA_PERSO).filter(([, n]) => n > 0).map(([k, n]) => <li key={k}>{n} × {PRODUITS[k]}</li>)}</ul></div>
        {code && <QrCode valeur={lienQrCarte(code)} taille={170} titre="QR code de ma carte" />}</div></section>
      <section className="carte"><h2>Ce qui a été retiré à la borne</h2>{jours.length ? <ul className="liste-coches">{jours.map(([j, p]) => <li key={j}>{j} : {Object.entries(p).map(([k, n]) => `${n} ${PRODUITS[k].toLowerCase()}`).join(', ')}</li>)}</ul> : <p>Rien pour l’instant.</p>}</section>
    </>
  )
}

export default function EspaceFille() {
  const f = lireFille()
  const nav = useNavigate()
  if (!f) return <Navigate to="/connexion" replace />
  return (
    <Shell titre="Jeune fille" teinte="rose" groupes={GROUPES} nom={f.pseudo} sous="Compte jeune fille" utilisateur={f.pseudo}>
      <Routes>
        <Route index element={<Tableau f={f} />} />
        <Route path="parler" element={<Parler />} />
        <Route path="borne" element={<Borne f={f} />} />
        <Route path="carte" element={<Carte />} />
        <Route path="accompagnement" element={<Accompagnement />} />
        <Route path="cycle" element={<EspaceAdolescente />} />
        <Route path="lieux" element={<Nutrition />} />
        <Route path="*" element={<Tableau f={f} />} />
      </Routes>
      <p style={{ textAlign: 'center' }}><button type="button" className="bouton secondaire" onClick={() => { sortirFille(); nav('/', { replace: true }) }}>Sortie rapide</button></p>
    </Shell>
  )
}
