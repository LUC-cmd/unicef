import { useEffect, useState } from 'react'

const ICONES = { succes: '✓', erreur: '!', info: 'i' }

// Notifications en bas à droite + fine barre de progression en haut quand le serveur travaille.
export default function Retours() {
  const [liste, setListe] = useState([])
  const [occupe, setOccupe] = useState(false)

  useEffect(() => {
    const retirer = (id) => setListe((l) => l.filter((x) => x.id !== id))
    const surRetour = (e) => {
      const n = e.detail
      setListe((l) => [...l.filter((x) => x.texte !== n.texte), n].slice(-3))
      setTimeout(() => retirer(n.id), n.type === 'erreur' ? 7000 : 4000)
    }
    let tempo
    const surOccupe = (e) => {
      clearTimeout(tempo)
      if (e.detail > 0) tempo = setTimeout(() => setOccupe(true), 250)
      else setOccupe(false)
      document.body.classList.toggle('occupe', e.detail > 0)
    }
    window.addEventListener('fildor:retour', surRetour)
    window.addEventListener('fildor:occupe', surOccupe)
    return () => { window.removeEventListener('fildor:retour', surRetour); window.removeEventListener('fildor:occupe', surOccupe); clearTimeout(tempo) }
  }, [])

  return (
    <>
      <div className={`barre-occupe ${occupe ? 'active' : ''}`} aria-hidden="true"><i /></div>
      <div className="retours" role="region" aria-label="Notifications" aria-live="polite">
        {liste.map((n) => (
          <div key={n.id} className={`retour retour-${n.type}`} role={n.type === 'erreur' ? 'alert' : 'status'}>
            <span className="retour-icone" aria-hidden="true">{ICONES[n.type]}</span>
            <span className="retour-texte">{n.texte}</span>
            <button type="button" className="retour-fermer" aria-label="Fermer" onClick={() => setListe((l) => l.filter((x) => x.id !== n.id))}>×</button>
          </div>
        ))}
      </div>
    </>
  )
}
