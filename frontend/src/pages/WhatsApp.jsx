import { useEffect, useRef, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'

const EXEMPLES = [
  'Un vaccin a été manqué, est-ce trop tard ?',
  'La déclaration de naissance est-elle gratuite ?',
  'Que donner à manger à partir de 6 mois ?',
  'Mon enfant a des convulsions',
]

const BIENVENUE = "Bonjour, je suis l'assistant Fil d'Or. Posez une question sur la santé de votre enfant : vaccins, nutrition, naissance, développement. Je réponds avec les contenus validés, sans voir aucun dossier."

/** Conversation style WhatsApp branchée sur le service assistant — même API que la page Assistant. */
export default function WhatsApp() {
  const [messages, setMessages] = useState([{ de: 'assistant', texte: BIENVENUE, niveau: 'INFO' }])
  const [saisie, setSaisie] = useState('')
  const [attente, setAttente] = useState(false)
  const fin = useRef(null)

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, attente])

  async function envoyer(texte) {
    const q = (texte ?? saisie).trim()
    if (!q || attente) return
    setSaisie('')
    setMessages((m) => [...m, { de: 'moi', texte: q }])
    setAttente(true)
    try {
      const r = await fetch('/assistant/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
        signal: AbortSignal.timeout(8000),
      })
      const donnees = await r.json().catch(() => null)
      if (!r.ok) throw new Error(donnees?.detail || 'Le service assistant ne répond pas.')
      setMessages((m) => [...m, { de: 'assistant', texte: donnees.reponse, niveau: donnees.niveau, sources: donnees.sources, limite: donnees.limite }])
    } catch (err) {
      setMessages((m) => [...m, { de: 'assistant', texte: err.name === 'TimeoutError' ? 'Le service assistant ne répond pas. Réessayez dans un instant.' : err.message, niveau: 'INFO' }])
    } finally {
      setAttente(false)
    }
  }

  return (
    <>
      <Bandeau surtitre="Porte 2" titre="Assistant sur WhatsApp">
        La même conversation qu'un parent aurait avec l'assistant, dans l'application qu'il utilise déjà.
        Aucun dossier n'est lu : les réponses viennent des contenus validés.
      </Bandeau>
      <main className="page">
        <div className="wa-cadre">
          <div className="wa-entete">
            <span className="wa-avatar" aria-hidden="true">F</span>
            <div>
              <b>Fil d'Or — Assistant</b>
              <small>{attente ? 'en train d’écrire…' : 'répond avec les contenus validés'}</small>
            </div>
          </div>
          <div className="wa-discussion" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`wa-bulle ${m.de === 'moi' ? 'moi' : 'assistant'} ${m.niveau === 'URGENCE' ? 'urgence' : ''}`}>
                <p>{m.texte}</p>
                {m.de === 'assistant' && (m.sources?.length > 0 || m.limite) && (
                  <p className="wa-source">
                    {m.sources?.length > 0 && <>Source : {m.sources.map((s) => s.titre).join(', ')}. </>}
                    {m.limite}
                  </p>
                )}
              </div>
            ))}
            {attente && <div className="wa-bulle assistant wa-ecrit"><i /><i /><i /></div>}
            <div ref={fin} />
          </div>
          <div className="wa-suggestions">
            {EXEMPLES.map((ex) => (
              <button key={ex} type="button" className="wa-chip" onClick={() => envoyer(ex)}>{ex}</button>
            ))}
          </div>
          <form className="wa-saisie" onSubmit={(e) => { e.preventDefault(); envoyer() }}>
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} maxLength={400}
                   placeholder="Écrire un message…" aria-label="Message" />
            <button className="bouton" disabled={attente || !saisie.trim()}>Envoyer</button>
          </form>
        </div>
        <aside className="carte">
          <h2>Ce que cet assistant ne fait jamais</h2>
          <ul className="liste-coches non">
            <li>Lire un dossier, un nom ou un numéro de téléphone</li>
            <li>Poser un diagnostic ou conseiller un médicament</li>
            <li>Inventer une réponse hors de ses contenus</li>
          </ul>
          <p className="petit">Un enfant va mal ? N'attendez pas de réponse ici : allez tout de suite au centre de santé le plus proche.</p>
        </aside>
      </main>
    </>
  )
}
