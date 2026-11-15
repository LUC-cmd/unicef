import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

/* ---------- utilitaires ---------- */

const tirer = (liste) => liste[Math.floor(Math.random() * liste.length)]

function melanger(liste) {
  const l = [...liste]
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[l[i], l[j]] = [l[j], l[i]]
  }
  return l
}

function lireEtoiles() {
  try {
    return Number(localStorage.getItem('fildor.etoiles')) || 0
  } catch {
    return 0
  }
}

function ecrireEtoiles(n) {
  try {
    localStorage.setItem('fildor.etoiles', String(n))
  } catch {
    /* stockage indisponible : les étoiles restent le temps de la visite */
  }
}

const VOIX_POSSIBLE = typeof window !== 'undefined' && 'speechSynthesis' in window

function parlerTexte(texte) {
  if (!VOIX_POSSIBLE) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = 'fr-FR'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

function sonner(type) {
  try {
    const Contexte = window.AudioContext || window.webkitAudioContext
    if (!Contexte) return
    const ctx = new Contexte()
    const notes = type === 'bravo' ? [523, 659, 784] : [330]
    notes.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      o.type = 'sine'
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.13)
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.13 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.13 + 0.2)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.13)
      o.stop(ctx.currentTime + i * 0.13 + 0.22)
    })
    setTimeout(() => ctx.close(), 900)
  } catch {
    /* pas de son : le jeu continue */
  }
}

const MANCHES = 5

/* ---------- jeu à questions : le même moteur pour plusieurs jeux ---------- */

function Quiz({ fabrique, finMessage, contexte }) {
  const [question, setQuestion] = useState(() => fabrique(0))
  const [numero, setNumero] = useState(0)
  const [retour, setRetour] = useState(null)
  const [essai, setEssai] = useState(0)
  const [fini, setFini] = useState(false)

  useEffect(() => {
    if (!fini) contexte.parler(question.voix)
    // on ne relit la consigne que lorsque la question change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, fini])

  function choisir(choix) {
    if (retour?.ok) return
    if (choix.id === question.bonne) {
      contexte.gagner()
      setRetour({ ok: true, texte: question.felicitation })
      contexte.parler(question.felicitation)
      setTimeout(() => {
        if (numero + 1 >= MANCHES) {
          setFini(true)
          contexte.parler(finMessage)
        } else {
          setNumero((n) => n + 1)
          setQuestion(fabrique(numero + 1))
          setRetour(null)
          setEssai(0)
        }
      }, 1700)
    } else {
      contexte.rate()
      setEssai((e) => e + 1)
      setRetour({ ok: false, texte: 'Essaie encore !' })
      contexte.parler('Essaie encore')
    }
  }

  function rejouer() {
    setNumero(0)
    setQuestion(fabrique(0))
    setRetour(null)
    setEssai(0)
    setFini(false)
  }

  if (fini) {
    return (
      <div className="jeu-fin" role="status">
        <div className="jeu-fin-etoiles" aria-hidden="true">★ ★ ★ ★ ★</div>
        <h2>Bravo, tu as fini !</h2>
        <p>{finMessage}</p>
        <button type="button" className="bouton" onClick={rejouer}>Rejouer</button>
      </div>
    )
  }

  return (
    <div className="jeu-zone">
      <div className="jeu-progres" aria-label={`Question ${numero + 1} sur ${MANCHES}`}>
        {Array.from({ length: MANCHES }, (_, i) => (
          <span key={i} className={i < numero ? 'fait' : i === numero ? 'en-cours' : ''} />
        ))}
      </div>
      <div className="jeu-consigne">
        <p>{question.consigne}</p>
        <button type="button" className="bouton secondaire petit-bouton" onClick={() => contexte.parler(question.voix)}>
          Écouter
        </button>
      </div>
      {question.visuel && <div className="jeu-visuel" aria-hidden={question.visuelDecoratif ? 'true' : undefined}>{question.visuel}</div>}
      <div className={`jeu-choix n${question.choix.length}`} key={`${numero}-${essai > 0 ? 'x' : 'a'}`}>
        {question.choix.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`jeu-choix-bouton ${retour?.ok && c.id === question.bonne ? 'juste' : ''}`}
            onClick={() => choisir(c)}
            aria-label={c.aria}
          >
            {c.contenu}
          </button>
        ))}
      </div>
      <p className={`jeu-retour ${retour ? (retour.ok ? 'ok' : 'non') : ''}`} role="status" aria-live="polite">
        {retour?.texte ?? ' '}
      </p>
    </div>
  )
}

/* ---------- 1. Compte avec moi ---------- */

const OBJETS = [
  ['🥭', 'mangue', 'mangues'],
  ['🍌', 'banane', 'bananes'],
  ['🥚', 'œuf', 'œufs'],
  ['🐟', 'poisson', 'poissons'],
  ['🍊', 'orange', 'oranges'],
  ['🌽', 'épi de maïs', 'épis de maïs'],
]

function fabriquerCompte(rang) {
  const max = rang < 2 ? 3 : rang < 4 ? 5 : 7
  const n = 1 + Math.floor(Math.random() * max)
  const [emoji, un, plusieurs] = tirer(OBJETS)
  const autres = melanger([1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== n && Math.abs(x - n) <= 3)).slice(0, 2)
  const choix = melanger([n, ...autres]).map((v) => ({ id: v, aria: String(v), contenu: <span className="gros-chiffre">{v}</span> }))
  return {
    consigne: `Combien y a-t-il de ${n > 1 ? plusieurs : un} ?`,
    voix: `Combien y a-t-il de ${n > 1 ? plusieurs : un} ?`,
    visuel: <div className="jeu-objets" aria-label={`${n} ${n > 1 ? plusieurs : un}`}>{Array.from({ length: n }, (_, i) => <span key={i}>{emoji}</span>)}</div>,
    choix,
    bonne: n,
    felicitation: `Bravo ! Il y a ${n} ${n > 1 ? plusieurs : un}.`,
  }
}

/* ---------- 2. Touche la couleur ---------- */

const COULEURS = [
  ['rouge', '#d62828'],
  ['bleu', '#1b6ec2'],
  ['jaune', '#f5c400'],
  ['vert', '#2e9e4f'],
  ['orange', '#f28c00'],
  ['violet', '#7b4fc2'],
]

function fabriquerCouleur() {
  const trois = melanger(COULEURS).slice(0, 3)
  const [nom] = tirer(trois)
  return {
    consigne: `Touche le ${nom}.`,
    voix: `Touche le ${nom}`,
    visuel: null,
    choix: trois.map(([n, hex]) => ({
      id: n,
      aria: n,
      contenu: (
        <>
          <span className="pastille-couleur" style={{ background: hex }} />
          <span className="etiquette-couleur">{n}</span>
        </>
      ),
    })),
    bonne: nom,
    felicitation: `Bravo ! C'est le ${nom}.`,
  }
}

/* ---------- 3. Les formes ---------- */

const FORMES = {
  cercle: { nom: 'le cercle', dessin: <circle cx="50" cy="50" r="38" /> },
  carré: { nom: 'le carré', dessin: <rect x="14" y="14" width="72" height="72" rx="4" /> },
  triangle: { nom: 'le triangle', dessin: <polygon points="50,10 92,88 8,88" /> },
  rectangle: { nom: 'le rectangle', dessin: <rect x="6" y="26" width="88" height="48" rx="4" /> },
  étoile: { nom: "l'étoile", dessin: <polygon points="50,8 61,38 93,38 67,58 77,90 50,70 23,90 33,58 7,38 39,38" /> },
  losange: { nom: 'le losange', dessin: <polygon points="50,6 92,50 50,94 8,50" /> },
}

function fabriquerForme() {
  const trois = melanger(Object.keys(FORMES)).slice(0, 3)
  const cle = tirer(trois)
  const couleurs = ['#1cabe2', '#e3a71b', '#2e9e4f', '#d62828', '#7b4fc2']
  return {
    consigne: `Où est ${FORMES[cle].nom} ?`,
    voix: `Où est ${FORMES[cle].nom} ?`,
    visuel: null,
    choix: trois.map((k, i) => ({
      id: k,
      aria: k,
      contenu: <svg viewBox="0 0 100 100" className="forme" fill={couleurs[(i + cle.length) % couleurs.length]} role="img" aria-label={k}>{FORMES[k].dessin}</svg>,
    })),
    bonne: cle,
    felicitation: `Bravo ! C'est ${FORMES[cle].nom}.`,
  }
}

/* ---------- 4. Grand et petit ---------- */

function fabriquerTaille() {
  const grand = Math.random() < 0.5
  const gauche = Math.random() < 0.5
  const [emoji] = tirer(OBJETS)
  const mot = grand ? 'le plus grand' : 'le plus petit'
  const tailles = gauche ? [92, 48] : [48, 92]
  const ids = gauche ? ['g', 'p'] : ['p', 'g']
  return {
    consigne: `Touche ${mot}.`,
    voix: `Touche ${mot}`,
    visuel: null,
    choix: ids.map((id, i) => ({
      id,
      aria: id === 'g' ? 'grand' : 'petit',
      contenu: <span style={{ fontSize: `${tailles[i]}px`, lineHeight: 1 }}>{emoji}</span>,
    })),
    bonne: grand ? 'g' : 'p',
    felicitation: `Bravo ! Tu as touché ${mot}.`,
  }
}

/* ---------- 5. Mon assiette ---------- */

const BONS = [
  ['🍠', 'les ignames'],
  ['🌽', 'le maïs'],
  ['🫘', 'les haricots'],
  ['🐟', 'le poisson'],
  ['🥚', 'les œufs'],
  ['🥭', 'les mangues'],
  ['🍌', 'les bananes'],
  ['🥜', 'les arachides'],
]
const SUCRES = [
  ['🍬', 'les bonbons'],
  ['🍭', 'les sucettes'],
  ['🥤', 'la boisson sucrée'],
]

function fabriquerAssiette() {
  const [emoji, nom] = tirer(BONS)
  const mauvais = melanger(SUCRES).slice(0, 2)
  const choix = melanger([[emoji, nom, true], ...mauvais.map(([e, n]) => [e, n, false])])
  return {
    consigne: 'Qu’est-ce qui aide un enfant à bien grandir ?',
    voix: "Qu'est-ce qui aide un enfant à bien grandir ?",
    visuel: null,
    choix: choix.map(([e, n, bon]) => ({
      id: bon ? 'bon' : n,
      aria: n,
      contenu: (
        <>
          <span className="gros-emoji">{e}</span>
          <span className="etiquette-couleur">{n}</span>
        </>
      ),
    })),
    bonne: 'bon',
    felicitation: `Bravo ! ${nom.charAt(0).toUpperCase()}${nom.slice(1)}, c'est bon pour grandir. Les bonbons, seulement de temps en temps.`,
  }
}

/* ---------- 6. Mémoire des animaux ---------- */

const ANIMAUX = ['🐓', '🐐', '🐄', '🐖', '🐟', '🐒', '🐢', '🦜']

function Memoire({ contexte }) {
  const creer = () => melanger([...ANIMAUX.slice(0, 6), ...ANIMAUX.slice(0, 6)].map((a, i) => ({ id: i, animal: a })))
  const [cartes, setCartes] = useState(creer)
  const [ouvertes, setOuvertes] = useState([])
  const [trouvees, setTrouvees] = useState([])
  const [coups, setCoups] = useState(0)
  const bloque = useRef(false)

  useEffect(() => {
    contexte.parler('Retrouve les deux animaux pareils.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function retourner(c) {
    if (bloque.current || ouvertes.includes(c.id) || trouvees.includes(c.id)) return
    const nouvelles = [...ouvertes, c.id]
    setOuvertes(nouvelles)
    if (nouvelles.length === 2) {
      setCoups((n) => n + 1)
      const [a, b] = nouvelles.map((id) => cartes.find((x) => x.id === id))
      bloque.current = true
      if (a.animal === b.animal) {
        setTimeout(() => {
          setTrouvees((t) => [...t, a.id, b.id])
          setOuvertes([])
          bloque.current = false
          contexte.gagner()
          if (trouvees.length + 2 === cartes.length) contexte.parler('Bravo, tu as tout retrouvé !')
        }, 600)
      } else {
        setTimeout(() => {
          setOuvertes([])
          bloque.current = false
        }, 1000)
      }
    }
  }

  const fini = trouvees.length === cartes.length

  return (
    <div className="jeu-zone">
      <div className="jeu-consigne">
        <p>Retrouve les deux animaux pareils.</p>
        <span className="petit">{coups} essai{coups > 1 ? 's' : ''}</span>
      </div>
      <div className="memoire-grille">
        {cartes.map((c) => {
          const visible = ouvertes.includes(c.id) || trouvees.includes(c.id)
          return (
            <button
              type="button"
              key={c.id}
              className={`carte-memoire ${visible ? 'visible' : ''} ${trouvees.includes(c.id) ? 'trouvee' : ''}`}
              onClick={() => retourner(c)}
              aria-label={visible ? c.animal : 'Carte cachée'}
            >
              <span>{visible ? c.animal : '?'}</span>
            </button>
          )
        })}
      </div>
      {fini && (
        <div className="jeu-fin" role="status">
          <h2>Bravo, tu as tout retrouvé !</h2>
          <button
            type="button"
            className="bouton"
            onClick={() => {
              setCartes(creer())
              setOuvertes([])
              setTrouvees([])
              setCoups(0)
            }}
          >
            Rejouer
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------- 7. Les mains propres ---------- */

const GESTES = [
  { id: 1, emoji: '💧', texte: 'Je mouille mes mains' },
  { id: 2, emoji: '🧼', texte: 'Je mets du savon' },
  { id: 3, emoji: '👐', texte: 'Je frotte bien' },
  { id: 4, emoji: '🧻', texte: 'Je rince et je sèche' },
]

function MainsPropres({ contexte }) {
  const [ordre, setOrdre] = useState(() => melanger(GESTES))
  const [fait, setFait] = useState([])
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    contexte.parler('Touche les images dans l’ordre, pour se laver les mains.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toucher(g) {
    if (fait.includes(g.id)) return
    if (g.id === fait.length + 1) {
      const suite = [...fait, g.id]
      setFait(suite)
      setErreur(false)
      contexte.parler(g.texte)
      if (suite.length === GESTES.length) {
        contexte.gagner()
        contexte.gagner()
        setTimeout(() => contexte.parler('Bravo ! Tes mains sont propres.'), 900)
      }
    } else {
      setErreur(true)
      contexte.rate()
      contexte.parler('Pas encore. Cherche le premier geste.')
      setTimeout(() => setErreur(false), 900)
    }
  }

  const fini = fait.length === GESTES.length

  return (
    <div className="jeu-zone">
      <div className="jeu-consigne">
        <p>Touche les images dans l'ordre, pour se laver les mains.</p>
      </div>
      <div className={`mains-grille ${erreur ? 'secoue' : ''}`}>
        {ordre.map((g) => {
          const rang = fait.indexOf(g.id) + 1
          return (
            <button type="button" key={g.id} className={`geste ${rang ? 'fait' : ''}`} onClick={() => toucher(g)} aria-label={g.texte}>
              {rang > 0 && <span className="geste-rang">{rang}</span>}
              <span className="gros-emoji">{g.emoji}</span>
              <span className="etiquette-couleur">{g.texte}</span>
            </button>
          )
        })}
      </div>
      <p className={`jeu-retour ${fini ? 'ok' : erreur ? 'non' : ''}`} role="status" aria-live="polite">
        {fini ? 'Bravo ! Tes mains sont propres.' : erreur ? 'Pas encore, cherche le premier geste.' : ' '}
      </p>
      {fini && (
        <button
          type="button"
          className="bouton"
          onClick={() => {
            setOrdre(melanger(GESTES))
            setFait([])
          }}
        >
          Rejouer
        </button>
      )}
    </div>
  )
}

/* ---------- catalogue ---------- */

const JEUX = [
  { id: 'compter', titre: 'Compte avec moi', age: '2 à 4 ans', icone: '🥭', texte: 'Compter des mangues, des œufs, des poissons.', fin: 'Tu sais bien compter.', fabrique: fabriquerCompte },
  { id: 'couleurs', titre: 'Touche la couleur', age: '2 à 4 ans', icone: '🎨', texte: 'Reconnaître le rouge, le bleu, le jaune…', fin: 'Tu connais les couleurs.', fabrique: fabriquerCouleur },
  { id: 'formes', titre: 'Les formes', age: '3 à 5 ans', icone: '🔺', texte: 'Trouver le cercle, le carré, le triangle.', fin: 'Tu reconnais les formes.', fabrique: fabriquerForme },
  { id: 'taille', titre: 'Grand ou petit', age: '2 à 3 ans', icone: '🐘', texte: 'Montrer le plus grand, le plus petit.', fin: 'Tu vois bien les tailles.', fabrique: fabriquerTaille },
  { id: 'assiette', titre: 'Mon assiette', age: '3 à 5 ans', icone: '🍠', texte: 'Choisir ce qui aide à bien grandir.', fin: 'Tu choisis bien ton repas.', fabrique: fabriquerAssiette },
  { id: 'memoire', titre: 'Les animaux jumeaux', age: '3 à 5 ans', icone: '🐓', texte: 'Retrouver les paires d’animaux de la ferme.', memoire: true },
  { id: 'mains', titre: 'Les mains propres', age: '3 à 5 ans', icone: '🧼', texte: 'Remettre dans l’ordre les gestes pour se laver les mains.', mains: true },
]

/* ---------- page ---------- */

export default function Jeux() {
  const { jeu: jeuId } = useParams()
  const [etoiles, setEtoiles] = useState(lireEtoiles)
  const [voix, setVoix] = useState(true)
  const [son, setSon] = useState(true)
  const [nouvelle, setNouvelle] = useState(false)

  const jeu = JEUX.find((j) => j.id === jeuId)

  useEffect(() => () => VOIX_POSSIBLE && window.speechSynthesis.cancel(), [])

  const contexte = useMemo(
    () => ({
      parler: (t) => {
        if (voix && t) parlerTexte(t)
      },
      gagner: () => {
        if (son) sonner('bravo')
        setEtoiles((e) => {
          ecrireEtoiles(e + 1)
          return e + 1
        })
        setNouvelle(true)
        setTimeout(() => setNouvelle(false), 900)
      },
      rate: () => {
        if (son) sonner('oups')
      },
    }),
    [voix, son],
  )

  const quitter = useCallback(() => VOIX_POSSIBLE && window.speechSynthesis.cancel(), [])

  return (
    <>
      <Bandeau
        surtitre="Pour les enfants de 2 à 5 ans"
        titre={jeu ? jeu.titre : 'Les jeux de Fil d’Or'}
        actions={
          <div className={`etoiles ${nouvelle ? 'nouvelle' : ''}`} aria-live="polite">
            <span aria-hidden="true">★</span> <b>{etoiles}</b> étoile{etoiles > 1 ? 's' : ''}
          </div>
        }
      >
        {jeu
          ? 'Un adulte reste à côté. On écoute la consigne, on touche la bonne image. Il n’y a pas de perdant : on essaie jusqu’à réussir.'
          : 'Des jeux courts pour apprendre en s’amusant : compter, reconnaître les couleurs et les formes, bien manger, se laver les mains. Chaque bonne réponse donne une étoile.'}
      </Bandeau>

      <main className="page">
        <div className="jeux-options">
          <label className="interrupteur">
            <input type="checkbox" checked={voix} onChange={(e) => { setVoix(e.target.checked); if (!e.target.checked && VOIX_POSSIBLE) window.speechSynthesis.cancel() }} />
            Voix qui lit les consignes
          </label>
          <label className="interrupteur">
            <input type="checkbox" checked={son} onChange={(e) => setSon(e.target.checked)} />
            Petits sons
          </label>
        </div>

        {!jeu && (
          <>
            <div className="jeux-catalogue">
              {JEUX.map((j) => (
                <Link key={j.id} to={`/jeux/${j.id}`} className="jeu-carte">
                  <span className="jeu-icone" aria-hidden="true">{j.icone}</span>
                  <span className="jeu-texte">
                    <b>{j.titre}</b>
                    <span>{j.texte}</span>
                    <em>{j.age}</em>
                  </span>
                </Link>
              ))}
            </div>
            <div className="carte jeux-note">
              <h2>Pour les parents et les agents</h2>
              <ul className="liste-coches">
                <li>Les jeux se jouent à deux : l'adulte lit la consigne, l'enfant touche. Pas de compte, aucune donnée enregistrée sur l'enfant.</li>
                <li>Les étoiles restent seulement sur ce téléphone ou cet ordinateur.</li>
                <li>Les voix en éwé, kabyè et tem ne sont pas encore enregistrées : les consignes sont lues en français.</li>
                <li>Sans écran : le « jeu du jour » avec des objets de la maison arrive par SMS aux familles suivies (voir le <Link to="/telephone">simulateur de téléphone</Link>).</li>
              </ul>
            </div>
          </>
        )}

        {jeu && (
          <div className="jeu-cadre">
            <Link to="/jeux" className="retour-jeux" onClick={quitter}>‹ Tous les jeux</Link>
            {jeu.memoire ? <Memoire contexte={contexte} /> : jeu.mains ? <MainsPropres contexte={contexte} /> : (
              <Quiz key={jeu.id} fabrique={jeu.fabrique} finMessage={jeu.fin} contexte={contexte} />
            )}
          </div>
        )}
      </main>
    </>
  )
}
