import { useEffect, useState } from 'react'
import VideoFiche from './VideoFiche.jsx'
import {
  ALPHABET, CHANSONS, COULEURS, CORPS, JOURS, LANGUES_FILMS, MOIS, NOMBRES, filmDe,
} from '../lib/chansons.js'
import Picto from './Picto.jsx'

const VOIX_POSSIBLE = typeof window !== 'undefined' && 'speechSynthesis' in window

function dire(texte, langue = 'fr') {
  if (!VOIX_POSSIBLE || !texte) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = langue === 'fr' ? 'fr-FR' : langue
    u.rate = 0.85
    u.pitch = 1.1
    window.speechSynthesis.speak(u)
  } catch { /* la voix n'est pas indispensable : le texte reste affiché */ }
}

/** Chansons et petits films : on choisit un film, on lit les paroles, puis on touche les lettres,
 *  les nombres, les jours… pour les entendre. Tout se passe sur l'appareil, sans réseau ni compte.
 *  Les voix éwé, kabyè et tem arriveront avec les enregistrements (emplacements prêts). */
export default function Chansons() {
  const [choisie, setChoisie] = useState(CHANSONS[0].id)
  const [langue, setLangue] = useState('fr')
  const [dernier, setDernier] = useState('')
  const chanson = CHANSONS.find((c) => c.id === choisie)

  useEffect(() => () => VOIX_POSSIBLE && window.speechSynthesis.cancel(), [])
  useEffect(() => { setDernier('') }, [choisie, langue])

  const toucher = (texte) => {
    setDernier(texte)
    if (langue === 'fr') dire(texte)
  }

  const aujourdhui = new Date()
  const jourAujourdhui = JOURS[(aujourdhui.getDay() + 6) % 7]
  const moisAujourdhui = MOIS[aujourdhui.getMonth()]

  return (
    <section className="chansons" aria-labelledby="t-chansons">
      <h2 id="t-chansons" className="titre-section"><Picto nom="musique" /> Chansons et petits films</h2>
      <p className="chapeau">
        Des petits films d’une à deux minutes pour chanter l’alphabet, les nombres, les jours et les mois.
        Un adulte reste à côté ; on touche les lettres et les nombres pour les entendre.
      </p>

      <div className="chansons-choix">
        {CHANSONS.map((c) => (
          <button key={c.id} type="button" className={`chanson-carte${c.id === choisie ? ' active' : ''}`}
            aria-pressed={c.id === choisie} onClick={() => setChoisie(c.id)}>
            <span className="chanson-icone" aria-hidden="true"><Picto nom={c.icone} /></span>
            <b>{c.titre}</b>
            <small>{c.duree} · {c.age}</small>
          </button>
        ))}
      </div>

      <div className="chanson-detail">
        <div className="chanson-lecteur">
          <VideoFiche titre={chanson.titre} video={filmDe(chanson)}
            consigne="Le petit film sera tourné avec des voix d’enfants et de parents, en français, éwé, kabyè et tem." />
          <div className="chanson-langues" role="group" aria-label="Langue du film">
            {LANGUES_FILMS.map(([code, nom, dispo]) => (
              <button key={code} type="button" className={`puce${langue === code ? ' active' : ''}`}
                onClick={() => setLangue(code)} aria-pressed={langue === code}>
                {nom}{dispo ? '' : ' · bientôt'}
              </button>
            ))}
          </div>
          {langue !== 'fr' && (
            <p className="petit">La version {LANGUES_FILMS.find(([c]) => c === langue)?.[1]} sera enregistrée par
              des locuteurs natifs. En attendant, les paroles s’affichent et les jeux se font en français.</p>
          )}
        </div>

        <div className="chanson-paroles">
          <h3>Les paroles</h3>
          {chanson.paroles.map((ligne) => <p key={ligne}>{ligne}</p>)}
          <p className="petit source">Toucher les éléments ci-dessous : chaque lettre, chaque nombre se dit à voix haute.</p>
        </div>
      </div>

      <div className="chanson-interaction">
        {chanson.interaction === 'alphabet' && (
          <div className="puzzle-grille alphabet" role="group" aria-label="Les 26 lettres de l’alphabet">
            {ALPHABET.map(([lettre, mot]) => (
              <button key={lettre} type="button" className="lettre-bouton" onClick={() => toucher(`${lettre}, comme ${mot}`)}
                aria-label={`Lettre ${lettre}, comme ${mot}`}>
                <b>{lettre}</b><small>{mot}</small>
              </button>
            ))}
          </div>
        )}

        {chanson.interaction === 'nombres' && (
          <div className="puzzle-grille nombres" role="group" aria-label="Les nombres de un à dix">
            {NOMBRES.map((n) => (
              <button key={n} type="button" className="nombre-bouton" onClick={() => toucher(String(n))}
                aria-label={`${n}, ${'point '.repeat(n)}`}>
                <b>{n}</b><small>{'•'.repeat(n)}</small>
              </button>
            ))}
          </div>
        )}

        {chanson.interaction === 'jours' && (
          <div className="puzzle-chips" role="group" aria-label="Les jours de la semaine">
            {JOURS.map((j) => (
              <button key={j} type="button" className={`puce${j === jourAujourdhui ? ' active' : ''}`}
                onClick={() => toucher(j)}>
                {j}{j === jourAujourdhui ? ' · aujourd’hui' : ''}
              </button>
            ))}
          </div>
        )}

        {chanson.interaction === 'mois' && (
          <div className="puzzle-chips" role="group" aria-label="Les douze mois de l’année">
            {MOIS.map((m) => (
              <button key={m} type="button" className={`puce${m === moisAujourdhui ? ' active' : ''}`}
                onClick={() => toucher(m)}>
                {m}{m === moisAujourdhui ? ' · ce mois' : ''}
              </button>
            ))}
          </div>
        )}

        {chanson.interaction === 'couleurs' && (
          <div className="puzzle-chips" role="group" aria-label="Les couleurs">
            {COULEURS.map(([nom, code]) => (
              <button key={nom} type="button" className="couleur-bouton" onClick={() => toucher(nom)}>
                <span className="pastille-couleur" style={{ background: code }} aria-hidden="true" />{nom}
              </button>
            ))}
          </div>
        )}

        {chanson.interaction === 'corps' && (
          <div className="puzzle-chips" role="group" aria-label="Les parties du corps">
            {CORPS.map(([nom, emoji]) => (
              <button key={nom} type="button" className="puce" onClick={() => toucher(nom)}>
                <Picto nom={emoji} /> {nom}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="dernier-dit" aria-live="polite">{dernier && <><Picto nom="son" /> <b>{dernier}</b></>}</p>
    </section>
  )
}
