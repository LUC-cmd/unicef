/** Questions que la borne pose à voix haute. Les réponses ne sont liées à personne. */
export const QUESTIONS = [
  { id: 'probleme', fr: 'Quel est ton plus gros problème en ce moment ?', en: 'What is your biggest problem right now?',
    choix: [['regles', 'Règles douloureuses ou sans protection', 'Painful periods or no protection'], ['protection', 'Me protéger (grossesse, infections)', 'Protecting myself'], ['produits', 'Je ne trouve pas les produits près de chez moi', 'I cannot find products nearby'], ['info', 'Je manque d’informations fiables', 'I lack reliable information'], ['autre', 'Autre chose', 'Something else']] },
  { id: 'ailleurs', fr: 'Avant la borne, pouvais-tu trouver ces produits près de chez toi ?', en: 'Before this kiosk, could you find these products near you?',
    choix: [['oui', 'Oui, facilement', 'Yes, easily'], ['difficile', 'Oui, mais c’était difficile ou trop cher', 'Yes, but hard or too expensive'], ['non', 'Non', 'No']] },
  { id: 'utile', fr: 'La borne t’a-t-elle aidée aujourd’hui ?', en: 'Did the kiosk help you today?',
    choix: [['oui', 'Oui', 'Yes'], ['peu', 'Un peu', 'A little'], ['non', 'Non', 'No']] },
]
export const LIBELLES_PROBLEME = Object.fromEntries(QUESTIONS[0].choix.map(([k, f]) => [k, f]))
export const voixDispo = (langue) => langue === 'Français' || langue === 'English'
const code = (l) => (l === 'English' ? 'en-US' : 'fr-FR')
export const texteQ = (q, langue) => (langue === 'English' ? q.en : q.fr)
export const texteC = (c, langue) => (langue === 'English' ? c[2] : c[1])

/** La borne parle (voix du navigateur) quand la langue est disponible. Pour éwé, kabiyè et mina : voix enregistrées par des locuteurs, sinon texte seulement. */
export function parler(texte, langue) {
  try {
    if (!voixDispo(langue) || !window.speechSynthesis) return false
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte); u.lang = code(langue); u.rate = 0.95
    window.speechSynthesis.speak(u); return true
  } catch { return false }
}
export const taire = () => { try { window.speechSynthesis?.cancel() } catch { /* rien */ } }

/** Écoute une réponse : renvoie le texte entendu, ou null si le navigateur ne sait pas écouter. */
export function ecouter(langue) {
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  if (!SR || !voixDispo(langue)) return null
  return new Promise((ok) => {
    const r = new SR(); r.lang = code(langue); r.interimResults = false; r.maxAlternatives = 1
    r.onresult = (e) => ok(e.results[0][0].transcript); r.onerror = () => ok(''); r.onend = () => ok('')
    try { r.start() } catch { ok('') }
  })
}

const CHIFFRES = { un: 1, une: 1, one: 1, deux: 2, two: 2, trois: 3, three: 3, quatre: 4, four: 4, cinq: 5, five: 5 }
/** Retrouve le choix (index) dans ce que la personne a dit : un chiffre, ou un mot de la réponse. */
export function choixDepuis(dit, choix, langue) {
  const t = String(dit).toLowerCase().trim()
  if (!t) return -1
  const m = t.match(/\d/)
  if (m && Number(m[0]) >= 1 && Number(m[0]) <= choix.length) return Number(m[0]) - 1
  const i = choix.findIndex((c) => texteC(c, langue).toLowerCase().split(/\s+/).some((w) => w.length > 2 && new RegExp(`\\b${w}\\b`).test(t)) && !/^(un|une|one)$/.test(t))
  if (i >= 0) return i
  for (const [mot, n] of Object.entries(CHIFFRES)) if (new RegExp(`\\b${mot}\\b`).test(t) && n <= choix.length) return n - 1
  return -1
}
