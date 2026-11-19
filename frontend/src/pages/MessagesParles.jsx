import { useEffect, useRef, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import Picto from '../components/Picto.jsx'
import { LANGUES_VOIX, MESSAGES_VOIX } from '../lib/petiteEnfance.js'

const cle = (lg, id) => `fildor.voix.${lg}.${id}`
const lireVoix = (lg, id) => { try { return localStorage.getItem(cle(lg, id)) || '' } catch { return '' } }
const DUREE_MAX = 25000

/**
 * Messages parlés : la famille écoute sans lire. En français, la voix de l'appareil lit le texte ; dans une langue locale, un relais
 * communautaire enregistre sa propre voix, qui reste sur l'appareil (démonstration : en production, elle serait validée puis partagée).
 */
export default function MessagesParles() {
  const [langue, setLangue] = useState('Français')
  const [, maj] = useState(0)
  const [enCours, setEnCours] = useState('')
  const [lecture, setLecture] = useState('')
  const [erreur, setErreur] = useState('')
  const rec = useRef(null)
  const minuteur = useRef(null)
  const peutEnregistrer = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
  const peutLire = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => { window.speechSynthesis?.cancel(); clearTimeout(minuteur.current); rec.current?.state === 'recording' && rec.current.stop() }, [])

  const lireTexte = (m) => {
    if (!peutLire) { setErreur('Cet appareil ne sait pas lire à voix haute. Lisez le message à l’écran.'); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(m.texte); u.lang = 'fr-FR'; u.rate = 0.9
    u.onend = () => setLecture(''); u.onerror = () => setLecture('')
    setLecture(m.id); setErreur(''); window.speechSynthesis.speak(u)
  }
  const arreterLecture = () => { window.speechSynthesis?.cancel(); setLecture('') }

  const enregistrer = async (m) => {
    setErreur('')
    if (!peutEnregistrer) { setErreur('Cet appareil ne permet pas d’enregistrer depuis le navigateur.'); return }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true })
      const morceaux = []
      const r = new MediaRecorder(flux); rec.current = r
      r.ondataavailable = (e) => e.data.size && morceaux.push(e.data)
      r.onstop = () => {
        flux.getTracks().forEach((t) => t.stop()); clearTimeout(minuteur.current); setEnCours('')
        const lecteur = new FileReader()
        lecteur.onload = () => { try { localStorage.setItem(cle(langue, m.id), lecteur.result) } catch { setErreur('Pas assez de place sur l’appareil pour garder cet enregistrement.') } maj((n) => n + 1) }
        lecteur.readAsDataURL(new Blob(morceaux, { type: r.mimeType || 'audio/webm' }))
      }
      r.start(); setEnCours(m.id); minuteur.current = setTimeout(() => r.state === 'recording' && r.stop(), DUREE_MAX)
    } catch { setErreur('Le micro n’est pas autorisé. Autorisez-le dans le navigateur pour enregistrer.') }
  }
  const finir = () => rec.current?.state === 'recording' && rec.current.stop()
  const retirer = (m) => { try { localStorage.removeItem(cle(langue, m.id)) } catch { /* sans stockage */ } maj((n) => n + 1) }

  return (
    <>
      <Bandeau surtitre="Pour moi" titre="Messages parlés">Écoutez les conseils au lieu de les lire. Un relais de la communauté peut les enregistrer dans votre langue.</Bandeau>
      <main className="page voix">
        <div className="voix-langues" role="group" aria-label="Langue du message">
          {LANGUES_VOIX.map((l) => <button key={l} type="button" className={l === langue ? 'actif' : ''} aria-pressed={l === langue} onClick={() => { arreterLecture(); setLangue(l) }}>{l}</button>)}
        </div>
        {langue !== 'Français' && <p className="petit">Pour l’instant, aucune voix de l’appareil ne parle {langue}. Un relais communautaire peut enregistrer sa voix ci-dessous : l’enregistrement reste sur cet appareil. En vrai déploiement, des voix de la communauté seraient enregistrées et validées une seule fois, puis envoyées à toutes les familles.</p>}
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <ul className="voix-liste">
          {MESSAGES_VOIX.map((m) => {
            const audio = langue === 'Français' ? '' : lireVoix(langue, m.id)
            return (
              <li key={m.id} className="carte voix-carte">
                <h2>{m.titre}</h2>
                <p>{m.texte}</p>
                <div className="voix-actions">
                  {langue === 'Français'
                    ? (lecture === m.id
                      ? <button className="bouton secondaire" type="button" onClick={arreterLecture}>Arrêter</button>
                      : <button className="bouton" type="button" onClick={() => lireTexte(m)}><Picto nom="parole" /> Écouter</button>)
                    : (
                      <>
                        {audio && <audio controls src={audio} preload="none" aria-label={`${m.titre} en ${langue}`} />}
                        {enCours === m.id
                          ? <button className="bouton" type="button" onClick={finir}>Terminer l’enregistrement</button>
                          : <button className={`bouton${audio ? ' secondaire' : ''}`} type="button" disabled={Boolean(enCours)} onClick={() => enregistrer(m)}>{audio ? 'Réenregistrer' : `Enregistrer en ${langue}`}</button>}
                        {audio && enCours !== m.id && <button className="bouton secondaire" type="button" onClick={() => retirer(m)}>Retirer</button>}
                      </>
                    )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="petit">Textes de démonstration, à faire valider par un professionnel de santé avant usage réel.</p>
      </main>
    </>
  )
}
