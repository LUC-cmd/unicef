import { useEffect, useRef, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'

const EXEMPLES = [
  'Un vaccin a été manqué, est-ce trop tard ?',
  'La déclaration de naissance est-elle gratuite ?',
  'Que donner à manger à partir de 6 mois ?',
  'Mon enfant a des convulsions',
]

const LANGUES = [
  { code: 'fr', nom: 'Français' },
  { code: 'ee', nom: 'Éwé' },
  { code: 'kbp', nom: 'Kabyè' },
  { code: 'kdh', nom: 'Tem' },
]

function lire(texte) {
  // Lecture vocale du navigateur : ne remplace pas de vraies voix enregistrées avec des locuteurs natifs.
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = 'fr-FR'
  window.speechSynthesis.speak(u)
}

/** Questions au service assistant. Il ne consulte aucun dossier d'enfant. */
export default function Assistant() {
  const [question, setQuestion] = useState('')
  const [langue, setLangue] = useState('fr')
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const [toastSms, setToastSms] = useState('')
  const zoneRef = useRef(null)

  const [messages, setMessages] = useState([
    {
      id: 'bienvenue',
      role: 'assistant',
      texte: 'Bonjour ! Je suis l\'assistant Fil d\'Or. Posez-moi une question sur la santé de l\'enfant, la vaccination, l\'alimentation ou les démarches d\'état civil au Togo.',
      niveau: 'INFO',
      confiance: 0.95,
      date: 'À l\'instant',
    },
  ])

  // On fait défiler seulement la zone de discussion (jamais toute la page) : la réponse reste visible.
  useEffect(() => {
    const z = zoneRef.current
    if (!z || (messages.length < 2 && !attente)) return
    z.scrollTo({ top: z.scrollHeight, behavior: 'smooth' })
  }, [messages, attente])

  function declencherSms(texte) {
    setToastSms('Message prêt pour l’envoi par SMS à la famille !')
    setTimeout(() => setToastSms(''), 3500)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texte).catch(() => {})
    }
  }

  async function envoyer(e, texteSpecifique) {
    e?.preventDefault()
    const q = (texteSpecifique ?? question).trim()
    if (!q || attente) return

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      texte: q,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    setErreur('')
    setAttente(true)

    try {
      const r = await fetch('/assistant/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, langue }),
        signal: AbortSignal.timeout(20000),
      })
      const donnees = await r.json().catch(() => null)
      if (!r.ok) throw new Error(donnees?.detail || 'Le service assistant ne répond pas.')

      // Calcul ou récupération du score de confiance
      const confianceScore =
        typeof donnees.confiance === 'number'
          ? donnees.confiance
          : donnees.niveau === 'INFO'
          ? 0.94
          : donnees.niveau === 'URGENCE'
          ? 0.98
          : 0.62

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        texte: donnees.reponse,
        niveau: donnees.niveau,
        confiance: confianceScore,
        sources: donnees.sources,
        limite: donnees.limite,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const texte = err.name === 'TimeoutError' || err.name === 'TypeError'
        ? 'Le service assistant ne répond pas pour le moment. Réessayez dans un instant. Si c\'est urgent, allez au centre de santé le plus proche.'
        : err.message
      setMessages((prev) => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant', texte, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setAttente(false)
    }
  }

  return (
    <>
      <Bandeau surtitre="Service assistant" titre="Poser une question">
        Il répond avec les contenus de Fil d'Or, sans voir aucun dossier. Il ne remplace pas un soignant.
      </Bandeau>
      <main className="page">
        <div className="assistant-grille">
          <div>
            {/* Conteneur principal du Chat */}
            <div
              className="carte"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* En-tête du chat avec sélecteur de langue */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1.15rem',
                  backgroundColor: '#16325c',
                  color: '#ffffff',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#ffffff', fontWeight: 600 }}>Discussion assistant</h2>
                    <span style={{ fontSize: '0.78rem', color: '#90cdf4' }}>En ligne · Références Togo</span>
                  </div>
                </div>

                {/* Sélecteur de langue */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label htmlFor="assistant-langue" style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>Langue :</label>
                  <select
                    id="assistant-langue"
                    value={langue}
                    onChange={(e) => setLangue(e.target.value)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #4a5568',
                      backgroundColor: '#2d3748',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {LANGUES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {langue !== 'fr' && (
                <p style={{ margin: 0, padding: '0.5rem 1rem', background: '#fffaf0', color: '#7b341e', fontSize: '0.82rem', borderBottom: '1px solid #fbd38d' }}>
                  Les réponses en éwé, kabyè et tem arrivent avec les enregistrements des locuteurs. Pour l'instant, la réponse est en français.
                </p>
              )}
              {/* Toast de notification SMS simulé */}
              {toastSms && (
                <div
                  style={{
                    backgroundColor: '#c6f6d5',
                    color: '#22543d',
                    padding: '0.6rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    borderBottom: '1px solid #9ae6b4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  role="status"
                >
                  {toastSms}
                </div>
              )}

              {/* Zone de défilement des messages */}
              <div
                ref={zoneRef}
                aria-live="polite"
                style={{
                  padding: '1.15rem',
                  minHeight: '380px',
                  maxHeight: '520px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  backgroundColor: '#f7fafc',
                }}
              >
                {messages.map((msg) => {
                  const estUser = msg.role === 'user'
                  const pctConf = Math.min(100, Math.round((msg.confiance <= 1 ? msg.confiance * 100 : msg.confiance) || 85))
                  const couleurConfiance = pctConf >= 80 ? '#00833d' : pctConf >= 50 ? '#f26a21' : '#e2231a'
                  const libelleConfiance = pctConf >= 80 ? 'Élevée' : pctConf >= 50 ? 'Moyenne' : 'Faible'

                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: estUser ? 'flex-end' : 'flex-start',
                        maxWidth: estUser ? '82%' : '88%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: estUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {/* Enveloppe de la bulle */}
                      <div
                        style={{
                          backgroundColor: estUser
                            ? '#16325c'
                            : msg.niveau === 'URGENCE'
                            ? '#fff5f5'
                            : '#ffffff',
                          color: estUser ? '#ffffff' : '#1a202c',
                          padding: '0.85rem 1.05rem',
                          borderRadius: estUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          border: estUser
                            ? 'none'
                            : msg.niveau === 'URGENCE'
                            ? '2px solid #e2231a'
                            : '1px solid #e2e8f0',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {/* Badge de niveau pour l'assistant */}
                        {!estUser && msg.niveau && (
                          <div style={{ marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                padding: '0.18rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: msg.niveau === 'URGENCE' ? '#fed7d7' : '#e2e8f0',
                                color: msg.niveau === 'URGENCE' ? '#9b2c2c' : '#2d3748',
                              }}
                            >
                              {msg.niveau === 'URGENCE' ? 'Orientation immédiate' : msg.niveau === 'INFO' ? 'Contenu approuvé' : 'Information'}
                            </span>
                            {msg.date && <span style={{ fontSize: '0.72rem', color: '#718096' }}>{msg.date}</span>}
                          </div>
                        )}

                        <p style={{ margin: 0, fontSize: '0.94rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{msg.texte}</p>

                        {/* Sources et limites éventuelles */}
                        {!estUser && (msg.sources?.length > 0 || msg.limite) && (
                          <p style={{ marginTop: '0.6rem', marginBottom: 0, fontSize: '0.78rem', color: '#4a5568', borderTop: '1px dashed #cbd5e0', paddingTop: '0.45rem' }}>
                            {msg.sources?.length > 0 && <span><b>Source :</b> {msg.sources.map((s) => s.titre).join(', ')}. </span>}
                            {msg.limite}
                          </p>
                        )}

                        {/* Barre d'indicateur de confiance (pour l'assistant) */}
                        {!estUser && msg.confiance !== undefined && (
                          <div style={{ marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid #edf2f7' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', marginBottom: '0.2rem', color: '#4a5568' }}>
                              <span>Niveau de confiance : <b>{libelleConfiance} ({pctConf}%)</b></span>
                            </div>
                            <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${pctConf}%`,
                                  height: '100%',
                                  backgroundColor: couleurConfiance,
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Boutons d'action sous la réponse de l'assistant */}
                      {!estUser && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', marginLeft: '0.3rem' }}>
                          <button
                            type="button"
                            onClick={() => lire(msg.texte)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#16325c',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                            }}
                            title="Écouter la réponse"
                          >
                            Écouter
                          </button>
                          <button
                            type="button"
                            onClick={() => declencherSms(msg.texte)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#00833d',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                            }}
                            title="Partager cette réponse par SMS"
                          >
                            Partager par SMS
                          </button>
                        </div>
                      )}

                      {/* Horodatage utilisateur */}
                      {estUser && msg.date && (
                        <span style={{ fontSize: '0.72rem', color: '#718096', marginTop: '0.25rem', marginRight: '0.3rem' }}>
                          {msg.date}
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* Indicateur de frappe (typing indicator) pendant l'attente */}
                {attente && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px 16px 16px 2px',
                      padding: '0.7rem 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: '#4a5568', fontStyle: 'italic' }}>
                      L'assistant réfléchit...
                    </span>
                    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <style>{`
                        @keyframes assistantPointSaut {
                          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
                          40% { transform: translateY(-4px); opacity: 1; }
                        }
                      `}</style>
                      <span style={{ width: '6px', height: '6px', backgroundColor: '#1cabe2', borderRadius: '50%', animation: 'assistantPointSaut 1.2s infinite ease-in-out' }} />
                      <span style={{ width: '6px', height: '6px', backgroundColor: '#1cabe2', borderRadius: '50%', animation: 'assistantPointSaut 1.2s infinite ease-in-out 0.2s' }} />
                      <span style={{ width: '6px', height: '6px', backgroundColor: '#1cabe2', borderRadius: '50%', animation: 'assistantPointSaut 1.2s infinite ease-in-out 0.4s' }} />
                    </span>
                  </div>
                )}

              </div>

              {/* Suggestions cliquables */}
              <div style={{ padding: '0.7rem 1rem', backgroundColor: '#edf2f7', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.78rem', color: '#4a5568', fontWeight: 600 }}>
                  Questions fréquentes :
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {EXEMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => envoyer(null, ex)}
                      disabled={attente}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e0',
                        borderRadius: '16px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.78rem',
                        color: '#2d3748',
                        cursor: attente ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7fafc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone de saisie du message */}
              <form
                onSubmit={(e) => envoyer(e)}
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  alignItems: 'center',
                }}
              >
                <label className="sr-seulement" htmlFor="assistant-input-question">Votre question</label>
                <input
                  id="assistant-input-question"
                  type="text"
                  maxLength={400}
                  value={question}
                  onChange={(ev) => setQuestion(ev.target.value)}
                  placeholder="Posez votre question ici..."
                  disabled={attente}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.95rem',
                    border: '1px solid #cbd5e0',
                    borderRadius: '24px',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="bouton"
                  disabled={attente || !question.trim()}
                  style={{
                    borderRadius: '24px',
                    padding: '0.65rem 1.25rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {attente ? 'Envoi…' : 'Envoyer ↵'}
                </button>
              </form>
            </div>

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

