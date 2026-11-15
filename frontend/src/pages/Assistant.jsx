import { useState } from 'react'

const EXEMPLES = [
  'Un vaccin a été manqué, est-ce trop tard ?',
  'La déclaration de naissance est-elle gratuite ?',
  'Que donner à manger à partir de 6 mois ?',
  'Mon enfant a des convulsions',
]

/** Questions au service assistant. Il ne consulte aucun dossier d'enfant. */
export default function Assistant() {
  const [question, setQuestion] = useState('')
  const [reponse, setReponse] = useState(null)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)

  async function envoyer(e, texte) {
    e?.preventDefault()
    const q = (texte ?? question).trim()
    if (!q) return
    setQuestion(q)
    setErreur('')
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
      setReponse(donnees)
    } catch (err) {
      setReponse(null)
      setErreur(err.name === 'TimeoutError' ? 'Le service assistant ne répond pas.' : err.message)
    } finally {
      setAttente(false)
    }
  }

  return (
    <main className="page etroite">
      <p className="surtitre">Service assistant</p>
      <h1>Poser une question</h1>
      <p>
        L'assistant répond à partir des contenus de Fil d'Or, déjà écrits pour les familles.
        Il ne voit aucun dossier, aucun nom, aucun numéro. Il ne remplace pas un soignant.
      </p>

      <form className="carte" onSubmit={(e) => envoyer(e)}>
        <label>
          Question
          <textarea className="question" rows="3" maxLength="400" value={question}
                    onChange={(ev) => setQuestion(ev.target.value)}
                    placeholder="Par exemple : quand déclarer une naissance ?" required />
        </label>
        <button className="bouton" disabled={attente}>{attente ? 'Recherche…' : 'Demander'}</button>
      </form>

      <p className="petit">Exemples</p>
      <div className="actions">
        {EXEMPLES.map((ex) => (
          <button key={ex} type="button" className="bouton secondaire petit-bouton" onClick={() => envoyer(null, ex)}>{ex}</button>
        ))}
      </div>

      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {reponse && (
        <article className="carte" role="status">
          <p className="petit">{reponse.niveau === 'URGENCE' ? 'Orientation immédiate' : reponse.niveau === 'INFO' ? 'Contenu approuvé' : 'Hors des contenus'}</p>
          <p>{reponse.reponse}</p>
          {reponse.sources?.length > 0 && <p className="petit">Source : {reponse.sources.map((s) => s.titre).join(', ')}</p>}
          <p className="petit">{reponse.limite}</p>
        </article>
      )}
    </main>
  )
}
