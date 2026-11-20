import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { MESSAGES_CONFIANCE, lienSms, ussd } from '../lib/parcours.js'
import { codeAleatoire, envoyerOuGarder, reseau } from '../lib/reseauClient.js'

function Telephone() {
  const [entrees, setEntrees] = useState([])
  const [saisie, setSaisie] = useState('')
  const sortie = ussd(entrees)
  const envoyer = (e) => { e.preventDefault(); if (!saisie.trim()) return; setEntrees([...entrees, saisie.trim()]); setSaisie('') }
  return (
    <section className="carte">
      <h2>Sur un téléphone simple, sans internet</h2>
      <p>Un menu court, comme pour recharger son crédit. Il marche avec les téléphones à touches, dans un village sans réseau de données. Le code court réel doit être demandé à un opérateur : nous n’en inventons pas.</p>
      <div className="ussd-tel" aria-label="Simulation d’un téléphone à touches">
        <pre aria-live="polite">{sortie.texte}</pre>
        {!sortie.fin ? (
          <form onSubmit={envoyer}><input inputMode="numeric" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Ta réponse" placeholder="Ta réponse" /><button className="bouton" type="submit">Envoyer</button></form>
        ) : <p style={{ margin: 0 }}>Fin de la session.</p>}
        <button type="button" className="bouton secondaire petit-bouton" onClick={() => { setEntrees([]); setSaisie('') }}>Recommencer</button>
      </div>
      <p className="petit">Pour les dates : jour puis mois, par exemple 0311 pour le 3 novembre. Rien n’est enregistré.</p>
    </section>
  )
}

function Confiance() {
  return (
    <section className="carte">
      <h2>Prévenir une personne de confiance</h2>
      <p>Un bouton ouvre ton application de messages avec un texte déjà écrit. Tu choisis le contact toi-même : aucun numéro n’est enregistré par Fil d’Or.</p>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        <a className="bouton secondaire" href={lienSms(MESSAGES_CONFIANCE.aide)}>J’ai besoin d’aide</a>
        <a className="bouton secondaire" href={lienSms(MESSAGES_CONFIANCE.centre)}>Venir avec moi au centre</a>
        <a className="bouton" href={lienSms(MESSAGES_CONFIANCE.urgence)}>Urgence</a>
      </p>
    </section>
  )
}

function Questions() {
  const [texte, setTexte] = useState('')
  const [code, setCode] = useState('')
  const [recu, setRecu] = useState(null)
  const [lue, setLue] = useState(null)
  const poser = async (e) => {
    e.preventDefault(); if (!texte.trim()) return
    const c = codeAleatoire()
    const r = await envoyerOuGarder('questions', { texte, code: c })
    setRecu({ code: r.ok ? r.donnees.code : c, gardee: r.gardee, refuse: r.refuse, erreur: r.erreur }); setTexte('')
  }
  const lire = async (e) => {
    e.preventDefault(); setLue(null)
    try { const r = await reseau.get(`questions/${encodeURIComponent(code.trim())}`); setLue({ reponse: r.reponse }) } catch (er) { setLue({ erreur: er.statut === 404 ? 'Numéro inconnu. Si ta question n’est pas encore partie, réessaie quand tu auras du réseau.' : er.message }) }
  }
  return (
    <section className="carte">
      <h2>Boîte à questions anonyme</h2>
      <p>Pose ta question sans écrire ton nom. Une agente de santé te répond. Tu lis la réponse avec ton numéro, que toi seule connais.</p>
      <form onSubmit={poser} style={{ display: 'grid', gap: '.6rem' }}>
        <label>Ta question<textarea rows="3" maxLength={600} value={texte} onChange={(e) => setTexte(e.target.value)} /></label>
        <button className="bouton" type="submit">Envoyer</button>
      </form>
      {recu && !recu.refuse && <p role="status"><b>Question {recu.gardee ? 'gardée sur ton téléphone, elle partira avec le réseau' : 'envoyée'}.</b> Garde ce numéro pour lire la réponse : <b>{recu.code}</b></p>}
      {recu?.refuse && <p role="alert">La question n’a pas pu partir : {recu.erreur}</p>}
      <form onSubmit={lire} style={{ display: 'grid', gap: '.6rem', marginTop: '1rem' }}>
        <label>J’ai un numéro de réponse<input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" /></label>
        <button className="bouton secondaire" type="submit">Lire la réponse</button>
      </form>
      {lue && <p role="status">{lue.erreur ? lue.erreur : lue.reponse ? <>Réponse : {lue.reponse}</> : 'Pas encore de réponse. Reviens plus tard.'}</p>}
      <p className="petit">Seule la personne qui a le numéro lit la réponse. Les agentes ne voient que le texte de la question, jamais le numéro. Les réponses doivent être données par une agente formée.</p>
    </section>
  )
}

export default function Sms() {
  return (
    <>
      <Bandeau surtitre="Sans smartphone" titre="SMS, menu court et questions anonymes">Pour celles qui n’ont qu’un téléphone simple, ou pas de réseau de données.</Bandeau>
      <main className="page ado"><Telephone /><Confiance /><Questions /><p className="petit">Démonstration avec des données fictives. Ce n’est pas un service officiel de l’UNICEF.</p></main>
    </>
  )
}
