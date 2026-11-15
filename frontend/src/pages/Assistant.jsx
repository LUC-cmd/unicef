import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'

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

  const [posee, setPosee] = useState('')
  return (
    <>
      <Bandeau surtitre="Service assistant" titre="Poser une question">
        L'assistant répond à partir des contenus de Fil d'Or, déjà écrits pour les familles.
        Il ne voit aucun dossier, aucun nom, aucun numéro. Il ne remplace pas un soignant.
      </Bandeau>
      <main className="page">
        <div className="assistant-grille">
          <div>
            <form className="carte assistant-saisie" onSubmit={(e) => { setPosee(question.trim()); envoyer(e) }}>
              <h2>Votre question</h2>
              <label className="sr-seulement" htmlFor="question">Question</label>
              <textarea id="question" className="question" rows="4" maxLength="400" value={question}
                        onChange={(ev) => setQuestion(ev.target.value)}
                        placeholder="Par exemple : quand déclarer une naissance ?" required />
              <button className="bouton" disabled={attente}>{attente ? 'Recherche…' : 'Demander'}</button>

              <p className="exemples-titre">Ou choisissez une question fréquente</p>
              <div className="exemples">
                {EXEMPLES.map((ex) => (
                  <button key={ex} type="button" className="exemple" onClick={() => { setPosee(ex); envoyer(null, ex) }}>{ex}</button>
                ))}
              </div>
            </form>

            {erreur && <p className="erreur" role="alert">{erreur}</p>}
            {reponse && (
              <div className="echange" role="status">
                {posee && <div className="bulle vous"><p>{posee}</p></div>}
                <article className={`bulle assistant ${reponse.niveau === 'URGENCE' ? 'urgence' : reponse.niveau === 'INFO' ? 'info' : ''}`}>
                  <span className="niveau">{reponse.niveau === 'URGENCE' ? 'Orientation immédiate' : reponse.niveau === 'INFO' ? 'Contenu approuvé' : 'Hors des contenus'}</span>
                  <p>{reponse.reponse}</p>
                  {(reponse.sources?.length > 0 || reponse.limite) && (
                    <p className="source">
                      {reponse.sources?.length > 0 && <>Source : {reponse.sources.map((s) => s.titre).join(', ')}. </>}
                      {reponse.limite}
                    </p>
                  )}
                </article>
              </div>
            )}
          </div>

          <aside className="assistant-cote" aria-label="Limites de l'assistant">
            <section className="carte">
              <h2>Ce qu'il fait</h2>
              <ul className="liste-coches">
                <li>Répond avec des textes déjà validés pour les familles</li>
                <li>Cite la source de chaque réponse</li>
                <li>Oriente vers un centre de santé quand c'est utile</li>
              </ul>
            </section>
            <section className="carte">
              <h2>Ce qu'il ne fait jamais</h2>
              <ul className="liste-coches non">
                <li>Lire un dossier, un nom ou un numéro de téléphone</li>
                <li>Poser un diagnostic ou conseiller un médicament</li>
                <li>Inventer une réponse hors de ses contenus</li>
              </ul>
            </section>
            <section className="carte urgence-info">
              <h2>Un enfant va mal ?</h2>
              <p>Convulsions, difficulté à respirer, fièvre qui ne baisse pas : n'attendez pas de réponse ici, allez tout de suite au centre de santé le plus proche.</p>
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}
