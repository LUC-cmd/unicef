/**
 * Parcours de la mère et de l'enfant : cycles, risque de grossesse, orientation avec alerte au centre,
 * rappels de déclaration, ruban MUAC, nutrition, SMS. Calculs sur l'appareil, données FICTIVES de démonstration.
 * Repères de santé généraux (OMS/PCIME) : à faire valider par un professionnel de santé avant tout usage réel.
 */
const J = 86400000
const t = (s) => Date.parse(`${s}T00:00:00Z`)
export const joursEntre = (a, b) => Math.round((t(b) - t(a)) / J)
export const plusJours = (s, n) => new Date(t(s) + n * J).toISOString().slice(0, 10)
export const aujourdhui = () => new Date().toISOString().slice(0, 10)

/* ---------- 1. Historique des règles sur plusieurs mois ---------- */
export function analyserCycles(debuts, auJour = aujourdhui()) {
  const liste = [...new Set((debuts ?? []).filter(Boolean))].sort()
  if (liste.length === 0) return { nb: 0, niveau: 'bon', message: 'Ajoute le premier jour de tes règles pour commencer.' }
  const dernier = liste[liste.length - 1]
  const depuis = joursEntre(dernier, auJour)
  const longueurs = liste.slice(1).map((d, i) => joursEntre(liste[i], d))
  const base = { nb: liste.length, dernier, depuis, longueurs }
  if (depuis >= 90) return { ...base, niveau: 'signaler', absentes3Mois: true, message: 'Tes règles sont absentes depuis 3 mois ou plus. Va au centre de santé : une grossesse est possible, et d’autres causes existent. Ce n’est pas grave d’en parler.' }
  if (longueurs.length === 0) return { ...base, niveau: 'bon', moyenne: null, message: 'Ajoute au moins deux dates pour voir la durée de tes cycles.' }
  const moyenne = Math.round(longueurs.reduce((a, b) => a + b, 0) / longueurs.length)
  const min = Math.min(...longueurs), max = Math.max(...longueurs)
  const prochaine = plusJours(dernier, moyenne)
  const retard = joursEntre(prochaine, auJour)
  const irregulier = min < 21 || max > 45 || max - min > 9
  let niveau = 'bon', message = `Tes cycles durent en moyenne ${moyenne} jours. Prochaines règles attendues vers le ${prochaine}.`
  if (retard >= 7) { niveau = 'signaler'; message = `Tes règles ont ${retard} jours de retard par rapport à ta moyenne. Une grossesse est possible : un test au centre de santé te dira.` }
  else if (irregulier) { niveau = 'surveiller'; message = `Tes cycles varient beaucoup (de ${min} à ${max} jours). C’est fréquent chez les adolescentes. Si cela dure, parle-en à une agente de santé.` }
  return { ...base, moyenne, min, max, prochaine, retard, irregulier, niveau, message }
}

/* ---------- 2. Carte de risque de grossesse (règles simples, à valider) ---------- */
export const FACTEURS = [
  ['tension', 'Tension élevée ou maux de tête forts', 3],
  ['saignement', 'Saignement pendant la grossesse', 3],
  ['cesarienne', 'Déjà une césarienne', 3],
  ['jumeaux', 'Jumeaux ou plus', 3],
  ['anemie', 'Fatigue extrême, pâleur (anémie)', 2],
  ['diabete', 'Diabète connu', 2],
  ['vih', 'Infection à VIH connue', 2],
  ['intervalle', 'Dernier accouchement il y a moins de 2 ans', 2],
  ['maigreur', 'Très maigre ou bras très fin', 2],
]
export function risqueGrossesse({ age, premiere, facteurs = [] }) {
  let pts = 0; const raisons = []
  if (age != null && age !== '') {
    const a = Number(age)
    if (a < 16) { pts += 3; raisons.push('Âge de moins de 16 ans') } else if (a < 18) { pts += 2; raisons.push('Âge de moins de 18 ans') } else if (a < 20) { pts += 1; raisons.push('Âge de moins de 20 ans') } else if (a >= 35) { pts += 2; raisons.push('Âge de 35 ans ou plus') }
  }
  if (premiere) { pts += 1; raisons.push('Première grossesse') }
  for (const [id, lib, p] of FACTEURS) if (facteurs.includes(id)) { pts += p; raisons.push(lib) }
  const niveau = pts >= 4 ? 'urgent' : pts >= 2 ? 'surveiller' : 'bon'
  const lieu = niveau === 'urgent' ? 3 : 2
  const titre = niveau === 'urgent' ? 'Grossesse à suivre de près' : niveau === 'surveiller' ? 'Grossesse à surveiller' : 'Pas de facteur de risque repéré'
  const conseil = niveau === 'urgent'
    ? 'Accoucher dans un hôpital qui peut faire une césarienne, avec un lieu et un transport décidés bien avant la date. Consultations renforcées.'
    : niveau === 'surveiller'
      ? 'Accoucher dans un centre de santé avec une sage-femme, consultations renforcées, et un plan de transport vers l’hôpital au cas où.'
      : 'Accoucher dans un centre de santé avec une sage-femme, et faire toutes les consultations.'
  return { pts, niveau, raisons, titre, conseil, lieu }
}

/* ---------- 3. Rappels de déclaration de naissance (délai de 45 jours) ---------- */
export const JALONS_ACTE = [7, 20, 30, 40]
export function rappelsNaissance(naissance, auJour = aujourdhui()) {
  const ecoules = joursEntre(naissance, auJour)
  const limite = plusJours(naissance, 45)
  const restant = 45 - ecoules
  const jalons = JALONS_ACTE.map((j) => ({ jour: j, date: plusJours(naissance, j), etat: ecoules > j ? 'passe' : ecoules === j ? 'aujourdhui' : 'avenir' }))
  const niveau = restant < 0 ? 'urgent' : restant <= 10 ? 'signaler' : 'bon'
  const message = restant < 0 ? 'Le délai de 45 jours est dépassé. Va à la mairie ou au centre d’état civil : une procédure de déclaration tardive existe.' : restant === 0 ? 'Dernier jour du délai. Va à l’état civil aujourd’hui.' : `Il reste ${restant} jour(s) pour déclarer la naissance (limite : ${limite}).`
  return { ecoules, restant, limite, jalons, niveau, message }
}

/* ---------- 4. Ruban MUAC (périmètre brachial, enfants de 6 à 59 mois) ---------- */
export function lireMuac(mm, oedemes = false) {
  const v = Number(mm)
  if (oedemes) return { niveau: 'urgent', zone: 'rouge', titre: 'Gonflement des deux pieds', texte: 'Va tout de suite au centre de santé : c’est un signe de malnutrition grave.' }
  if (!Number.isFinite(v) || v < 60 || v > 250) return { niveau: 'surveiller', zone: null, titre: 'Mesure impossible', texte: 'Mesure le milieu du bras gauche, en millimètres, puis recommence.' }
  if (v < 115) return { niveau: 'urgent', zone: 'rouge', titre: 'Zone rouge : malnutrition aiguë sévère', texte: 'Va au centre de santé tout de suite. L’enfant doit être examiné et suivi.' }
  if (v < 125) return { niveau: 'signaler', zone: 'jaune', titre: 'Zone jaune : risque de malnutrition', texte: 'Va voir un nutritionniste ou l’agente de santé cette semaine, et mesure de nouveau dans 2 semaines.' }
  return { niveau: 'bon', zone: 'verte', titre: 'Zone verte : bon état', texte: 'Continue une alimentation variée et mesure de nouveau chaque mois.' }
}

/* ---------- 5. Villages, centres, orientation et alerte au centre (FICTIFS) ---------- */
export const VILLAGES = [
  { id: 'agbele', nom: 'Agbélé', x: 0, y: 0, langue: 'Éwé' },
  { id: 'kpadape', nom: 'Kpadapé', x: 9, y: 6, langue: 'Kabiyè' },
  { id: 'zogbedji', nom: 'Zogbédji', x: 19, y: -4, langue: 'Mina' },
  { id: 'davie', nom: 'Davié', x: 31, y: 11, langue: 'Éwé' },
  { id: 'tovegan', nom: 'Tovégan', x: 42, y: -8, langue: 'Kabiyè' },
]
export const CENTRES = [
  { id: 'c1', nom: 'Dispensaire d’Agbélé (fictif)', village: 'agbele', niveau: 1, services: 'Soins de base, vaccination' },
  { id: 'c2', nom: 'Centre de santé de Kpadapé (fictif)', village: 'kpadape', niveau: 2, services: 'Sage-femme, accouchement simple' },
  { id: 'c3', nom: 'Centre de santé de Zogbédji (fictif)', village: 'zogbedji', niveau: 2, services: 'Sage-femme, accouchement simple' },
  { id: 'c4', nom: 'Hôpital de Davié (fictif)', village: 'davie', niveau: 3, services: 'Césarienne, urgences, réanimation du nouveau-né' },
]
const villageDe = (id) => VILLAGES.find((v) => v.id === id)
export const distanceKm = (a, b) => { const A = villageDe(a), B = villageDe(b); return Math.round(Math.hypot(A.x - B.x, A.y - B.y) * 10) / 10 }

export const SIGNES = {
  grossesse: [
    ['saigne', 'Elle saigne', 'urgent', ['saign', 'sang']],
    ['convulse', 'Convulsions', 'urgent', ['convuls', 'crise']],
    ['tete', 'Maux de tête violents, vue trouble', 'urgent', ['mal de tête', 'maux de tête', 'vue']],
    ['liquide', 'Perte de liquide avant le terme', 'urgent', ['liquide', 'eau']],
    ['mouvement', 'Le bébé ne bouge plus', 'urgent', ['bouge']],
    ['fievre', 'Forte fièvre', 'urgent', ['fièvre', 'fievre', 'chaud']],
    ['gonfle', 'Visage ou mains gonflés', 'consulter', ['gonfl', 'enfl']],
    ['vomit', 'Vomissements importants', 'consulter', ['vomi']],
  ],
  accouchement: [
    ['long', 'Le travail dure depuis plus de 12 heures', 'urgent', ['long', 'heures']],
    ['hemorragie', 'Saignement abondant', 'urgent', ['saign', 'sang', 'hémorrag']],
    ['placenta', 'Le placenta n’est pas sorti', 'urgent', ['placenta']],
    ['infection', 'Fièvre ou mauvaise odeur après l’accouchement', 'urgent', ['fièvre', 'fievre', 'odeur']],
    ['convulse2', 'Convulsions', 'urgent', ['convuls']],
  ],
  nouveauNe: [
    ['tete2', 'Ne tète plus', 'urgent', ['tète', 'tete', 'téter']],
    ['convulse3', 'Convulsions', 'urgent', ['convuls']],
    ['respire', 'Respire vite ou avec effort', 'urgent', ['respir']],
    ['froid', 'Très froid ou très chaud', 'urgent', ['froid', 'chaud', 'fièvre']],
    ['jaune', 'Jaune dès le premier jour', 'urgent', ['jaune']],
    ['cordon', 'Cordon rouge ou qui coule', 'consulter', ['cordon']],
  ],
  enfant: [
    ['boit', 'Ne peut plus boire ni manger', 'urgent', ['boit', 'boire', 'manger']],
    ['vomitout', 'Vomit tout ce qu’il prend', 'urgent', ['vomit']],
    ['convulse4', 'Convulsions', 'urgent', ['convuls']],
    ['dort', 'Très endormi, mou, ne réagit pas', 'urgent', ['endormi', 'mou', 'réagit']],
    ['fievre2', 'Fièvre', 'consulter', ['fièvre', 'fievre']],
    ['diarrhee', 'Diarrhée', 'consulter', ['diarrh', 'selles']],
    ['toux', 'Toux ou respiration difficile', 'consulter', ['toux', 'respir']],
  ],
}
export const CAS = { grossesse: 'Femme enceinte', accouchement: 'Accouchement', nouveauNe: 'Nouveau-né', enfant: 'Enfant' }

const plierTexte = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
/** Un mot-clé de 3 lettres ou moins doit être un mot entier (« eau » n'est pas dans « beaucoup »). Les autres sont des débuts de mot. */
function motPresent(mot, texte, jetons) {
  const m = plierTexte(mot)
  if (m.includes(' ')) return texte.includes(m)
  return m.length <= 3 ? jetons.includes(m) : jetons.some((j) => j.startsWith(m))
}
/** Mots-clés : repère les signes cités dans une description libre. Ce n’est pas un diagnostic. */
export function signesDepuisTexte(cas, texte) {
  const s = plierTexte(texte)
  const jetons = s.match(/[a-z0-9]+/g) ?? []
  return SIGNES[cas].filter(([, , , mots]) => mots.some((m) => motPresent(m, s, jetons))).map(([id]) => id)
}

export function orienter({ cas, signes, village }) {
  const liste = SIGNES[cas].filter(([id]) => signes.includes(id))
  const urgent = liste.some(([, , g]) => g === 'urgent')
  if (liste.length === 0) return { niveau: 'bon', titre: 'Aucun signe de danger coché', texte: 'Continuer le suivi habituel. En cas de doute, orienter vers le centre le plus proche.', centre: null }
  const obst = cas === 'grossesse' || cas === 'accouchement' || cas === 'nouveauNe'
  const besoin = urgent ? (obst ? 3 : 2) : 1
  const candidats = CENTRES.filter((c) => c.niveau >= besoin).map((c) => ({ ...c, km: distanceKm(village, c.village) })).sort((a, b) => a.km - b.km)
  const centre = candidats[0]
  return {
    niveau: urgent ? 'urgent' : 'surveiller',
    titre: urgent ? 'Urgence : orienter tout de suite' : 'À voir au centre de santé aujourd’hui',
    texte: urgent ? 'Ne pas attendre. Prévenir le centre pour qu’il prépare l’accueil, et prévoir un transport sûr. Rester auprès de la personne.' : 'Orienter vers le centre de santé le plus proche.',
    centre, signes: liste.map(([, l]) => l),
  }
}

/* ---------- 6. Alertes au centre, nutrition, questions : stockage local de démonstration ---------- */
const lire = (k, v) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? v } catch { return v } }
const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* refusé */ } }
export const ALPHABET_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
let compteur = 0
const nouvelId = () => `${Date.now().toString(36)}${(compteur++).toString(36)}`

export const lireAlertes = () => lire('fildor.alertes', [])
export function creerAlerte({ centreId, cas, niveau, signes, depuis }) {
  const a = { id: nouvelId(), centreId, cas, niveau, signes, depuis, heure: new Date().toISOString(), etat: 'en-route' }
  ecrire('fildor.alertes', [a, ...lireAlertes()]); return a
}
export function changerAlerte(id, etat) { ecrire('fildor.alertes', lireAlertes().map((a) => (a.id === id ? { ...a, etat } : a))) }
export const ordreAlertes = (liste) => [...liste].sort((a, b) => (a.etat === 'pris' ? 1 : 0) - (b.etat === 'pris' ? 1 : 0) || (a.niveau === 'urgent' ? 0 : 1) - (b.niveau === 'urgent' ? 0 : 1) || a.heure.localeCompare(b.heure))

export const POINTS_NUTRITION = [
  { id: 'n1', nom: 'Nutritionniste du centre de Kpadapé (fictif)', village: 'kpadape', lat: 6.2840, lng: 1.5150, type: 'Nutritionniste', offre: 'Conseil, bouillies enrichies, suivi du poids et du ruban MUAC' },
  { id: 'n2', nom: 'Boutique « Bonne bouillie » d’Agbélé (fictive)', village: 'agbele', lat: 6.2400, lng: 1.4700, type: 'Boutique partenaire', offre: 'Farines enrichies, œufs, légumes, sur bon du nutritionniste' },
  { id: 'n3', nom: 'Boutique du marché de Zogbédji (fictive)', village: 'zogbedji', lat: 6.3200, lng: 1.5800, type: 'Boutique partenaire', offre: 'Céréales, niébé, poisson séché, sur bon du nutritionniste' },
]
/** Bornes de démonstration. Positions fictives, à remplacer par les vraies à l'installation. */
export const BORNES = [
  { id: 'b1', nom: 'Borne d’Agbélé, place du village (fictive)', village: 'agbele', lat: 6.2420, lng: 1.4690, type: 'Village' },
  { id: 'b2', nom: 'Borne de Davié, marché (fictive)', village: 'davie', lat: 6.3700, lng: 1.6400, type: 'Bourg' },
  { id: 'b3', nom: 'Borne de la gare routière, ville (fictive)', village: 'davie', lat: 6.1750, lng: 1.2300, type: 'Ville' },
]
export const POUR = { grossesse: 'Femme enceinte', allaitement: 'Mère qui allaite', petit: 'Enfant de 6 à 23 mois', muac: 'Enfant en zone jaune ou rouge' }
export const lireDemandes = () => lire('fildor.nutrition', [])
export function creerDemande({ pointId, pour, village }) {
  const d = { id: nouvelId(), pointId, pour, village, date: aujourdhui(), etat: 'demande' }
  ecrire('fildor.nutrition', [d, ...lireDemandes()]); return d
}
export function changerDemande(id, etat) { ecrire('fildor.nutrition', lireDemandes().map((d) => (d.id === id ? { ...d, etat } : d))) }

export const lireQuestions = () => lire('fildor.questions', [])
export function poserQuestion(texte) {
  const code = String(Math.floor(1000 + Math.random() * 9000))
  const q = { id: nouvelId(), code, texte: String(texte).trim(), date: aujourdhui(), reponse: '' }
  ecrire('fildor.questions', [q, ...lireQuestions()]); return q
}
export function repondreQuestion(id, reponse) { ecrire('fildor.questions', lireQuestions().map((q) => (q.id === id ? { ...q, reponse } : q))) }

/* ---------- 7. Message à une personne de confiance (SMS pré-rempli, sans numéro enregistré) ---------- */
export const MESSAGES_CONFIANCE = {
  aide: 'J’ai besoin d’aide. Peux-tu me rappeler dès que tu vois ce message ?',
  centre: 'Je dois aller au centre de santé. Peux-tu venir avec moi ou m’aider à y aller ?',
  urgence: 'URGENCE : j’ai un signe de danger pour la grossesse ou le bébé. Viens tout de suite m’aider à aller au centre de santé.',
}
export const lienSms = (texte) => `sms:?&body=${encodeURIComponent(texte)}`

/* ---------- 8. Menu SMS/USSD sans internet (simulation) ---------- */
export const SEMAINES = [12, 20, 26, 30, 34, 36, 38, 40]
export function ussd(entrees, auJour = aujourdhui()) {
  const racine = 'Fil d’Or\n1 Mes règles\n2 Ma grossesse\n3 Mon enfant\n4 Urgence'
  if (entrees.length === 0) return { texte: racine, fin: false }
  const [c, ...r] = entrees
  const lireJJMM = (s) => { const m = /^(\d{2})(\d{2})$/.exec(s ?? ''); if (!m) return null; const an = auJour.slice(0, 4); let d = `${an}-${m[2]}-${m[1]}`; if (Number.isNaN(t(d)) || +m[1] > 31 || +m[2] > 12 || +m[1] < 1 || +m[2] < 1) return null; if (d > auJour) d = `${+an - 1}-${m[2]}-${m[1]}`; return d }
  if (c === '1') {
    if (r.length === 0) return { texte: 'Entre le jour de tes dernières règles (JJMM, ex. 0311).', fin: false }
    const d = lireJJMM(r[0]); if (!d) return { texte: 'Date incorrecte. Recommence : JJMM.', fin: true }
    const a = analyserCycles([d], auJour)
    return { texte: a.depuis >= 35 ? `Retard probable (${a.depuis} jours). Va au centre de santé pour un test.` : `Prochaines règles vers le ${plusJours(d, 28)} (cycle de 28 jours, indicatif).`, fin: true }
  }
  if (c === '2') {
    if (r.length === 0) return { texte: 'Entre le jour de tes dernières règles (JJMM).', fin: false }
    const d = lireJJMM(r[0]); if (!d) return { texte: 'Date incorrecte. Recommence : JJMM.', fin: true }
    const sa = Math.floor(joursEntre(d, auJour) / 7)
    if (sa < 0 || sa > 44) return { texte: 'Date peu probable. Va au centre de santé.', fin: true }
    const proch = SEMAINES.find((w) => w > sa)
    return { texte: `Environ ${sa} semaines. ${proch ? `Prochaine consultation vers la semaine ${proch}.` : 'Terme proche : prépare ton départ au centre.'} Saignement, convulsions ou bébé qui ne bouge plus : va tout de suite au centre.`, fin: true }
  }
  if (c === '3') {
    if (r.length === 0) return { texte: 'Ton enfant :\n1 Ne boit plus / convulsions / très endormi\n2 Fièvre\n3 Diarrhée', fin: false }
    return { texte: r[0] === '1' ? 'URGENT : va tout de suite au centre de santé.' : 'Va au centre de santé aujourd’hui. Continue de faire boire.', fin: true }
  }
  if (c === '4') return { texte: 'Danger maintenant : va au centre de santé le plus proche avec une personne de confiance. Appelle l’agente de santé de ton village.', fin: true }
  return { texte: 'Choix inconnu.\n' + racine, fin: false }
}

/* ---------- 9. Poste de mesures de la borne : température, tension, oxygène, bras ---------- */
export const PUBLICS = { ado: 'Jeune fille', grossesse: 'Femme enceinte', maman: 'Mère après l’accouchement', bebe: 'Bébé de moins de 3 mois', enfant: 'Enfant de 3 mois à 5 ans' }
const RANG = { bon: 0, surveiller: 1, signaler: 2, urgent: 3 }
export function centrePour(village, besoin) {
  return CENTRES.filter((c) => c.niveau >= besoin).map((c) => ({ ...c, km: distanceKm(village, c.village) })).sort((a, b) => a.km - b.km)[0] ?? null
}
/** Chaque mesure est lue par un appareil homologué (à valider). Les seuils sont des repères OMS/PCIME, à faire valider. */
export function lireMesures({ pour, temp, sys, dia, spo2, muac, village = 'agbele' }) {
  const trouves = []
  const ajoute = (niveau, texte) => trouves.push({ niveau, texte })
  const num = (v) => (v === '' || v == null ? null : Number(v))
  const T = num(temp), S = num(sys), D = num(dia), O = num(spo2), M = num(muac)
  const enceinte = pour === 'grossesse' || pour === 'maman'
  if (T != null) {
    if (T < 30 || T > 43) ajoute('surveiller', 'Température impossible : recommence la mesure.')
    else if (pour === 'bebe') { if (T >= 37.5) ajoute('urgent', `Fièvre chez un bébé de moins de 3 mois (${T} °C) : danger, aller à l’hôpital tout de suite.`); else if (T < 35.5) ajoute('urgent', `Bébé trop froid (${T} °C) : le réchauffer contre la peau de la mère et aller au centre tout de suite.`) }
    else if (enceinte) { if (T >= 38) ajoute('urgent', `Fièvre (${T} °C) pendant la grossesse ou après l’accouchement : risque d’infection, aller au centre tout de suite.`); else if (T < 35.5) ajoute('urgent', `Température très basse (${T} °C) : aller au centre tout de suite.`) }
    else if (T >= 39.5) ajoute('urgent', `Fièvre très forte (${T} °C) : aller au centre aujourd’hui sans attendre.`)
    else if (T >= 38) ajoute('signaler', `Fièvre (${T} °C) : voir un agent de santé aujourd’hui et faire boire.`)
  }
  if (enceinte && S != null && D != null) {
    if (S >= 160 || D >= 110) ajoute('urgent', `Tension très élevée (${S}/${D}) : risque de crise grave, aller à l’hôpital tout de suite.`)
    else if (S >= 140 || D >= 90) ajoute('signaler', `Tension élevée (${S}/${D}) : voir la sage-femme aujourd’hui.`)
    else if (S < 90) ajoute('urgent', `Tension trop basse (${S}/${D}) : s’allonger et aller au centre tout de suite.`)
  }
  if (O != null) {
    if (O < 90) ajoute('urgent', `Oxygène très bas (${O} %) : aller à l’hôpital tout de suite.`)
    else if (O < 95) ajoute('signaler', `Oxygène un peu bas (${O} %) : voir un agent de santé aujourd’hui.`)
  }
  if (pour === 'enfant' && M != null) { const m = lireMuac(M); if (m.niveau !== 'bon') ajoute(m.niveau === 'urgent' ? 'urgent' : 'signaler', `${m.titre}. ${m.texte}`) }
  const pire = trouves.reduce((p, x) => (RANG[x.niveau] > RANG[p] ? x.niveau : p), 'bon')
  const besoin = pire === 'urgent' ? (pour === 'ado' || pour === 'enfant' ? 2 : 3) : pire === 'signaler' ? 1 : 0
  const centre = besoin ? centrePour(village, besoin) : null
  return { niveau: pire, trouves, centre, besoin }
}

/* ---------- 10. Boutiques : produits conseillés et contrôle (FICTIFS) ---------- */
export const CONSEILS_ALIMENTAIRES = {
  ado: ['Haricots, niébé, feuilles vertes (fer)', 'Poisson, œufs, viande', 'Fruits de saison', 'Arachides, lait caillé (calcium)'],
  grossesse: ['Haricots, niébé, feuilles vertes (fer)', 'Poisson, œufs, viande', 'Fruits et légumes de saison', 'Huile, arachides (énergie)'],
  allaitement: ['Un repas de plus chaque jour', 'Céréales, haricots, légumes', 'Poisson, œufs', 'Beaucoup d’eau'],
  petit: ['Bouillie enrichie (céréale, arachide, huile)', 'Œuf, poisson écrasé', 'Légumes et fruits écrasés', 'Pas de boisson sucrée'],
}
export const POUR_BOUTIQUE = { ado: 'Jeune fille', grossesse: 'Femme enceinte', allaitement: 'Mère qui allaite', petit: 'Enfant de 6 à 23 mois' }
export const POINTS_CONTROLE = [
  ['periodes', 'Aucun produit périmé en rayon'],
  ['hygiene', 'Produits stockés à l’abri de l’humidité et des animaux'],
  ['prix', 'Prix affichés et respectés'],
  ['substituts', 'Aucune promotion de lait en poudre pour bébé de moins de 6 mois'],
  ['bons', 'Bons des nutritionnistes comptés et conservés'],
]
export const lireControles = () => lire('fildor.controles', [])
export function enregistrerControle({ pointId, ok }) {
  const n = POINTS_CONTROLE.filter(([id]) => ok.includes(id)).length
  const c = { id: nouvelId(), pointId, date: aujourdhui(), ok, conforme: n === POINTS_CONTROLE.length, n }
  ecrire('fildor.controles', [c, ...lireControles()]); return c
}

/* ---------- 11. Consultation anonyme à la borne : règles douloureuses, pertes blanches ---------- */
export const MOTIFS_CONSULTATION = { regles: 'Règles douloureuses', pertes: 'Pertes blanches' }
// [id, libellé, gravité] : « urgent » = hôpital, « consulter » = bon de consultation anonyme au centre
export const QUESTIONS_CONSULTATION = {
  regles: [
    ['malaise', 'Je me suis évanouie ou j’ai failli', 'urgent'],
    ['fievre', 'J’ai de la fièvre', 'urgent'],
    ['abondant', 'Je change de serviette toutes les heures, ou je perds de gros caillots', 'urgent'],
    ['retardDouleur', 'Mes règles ont du retard, ou je pense être enceinte, et j’ai mal au ventre', 'urgent'],
    ['cote', 'La douleur est soudaine, très forte, d’un seul côté', 'urgent'],
    ['chaque', 'La douleur m’empêche d’aller à l’école ou de travailler chaque mois', 'consulter'],
    ['nouvelle', 'La douleur est nouvelle : avant, je n’avais pas mal', 'consulter'],
    ['longue', 'La douleur dure plus de 3 jours', 'consulter'],
    ['rapport', 'J’ai eu un rapport sans protection récemment', 'consulter'],
    ['allergie', 'Je suis allergique à un médicament, ou j’ai une maladie de l’estomac, du foie ou des reins', 'contre'],
  ],
  pertes: [
    ['fievre', 'J’ai de la fièvre', 'fievre'],
    ['ventre', 'J’ai mal au bas du ventre', 'ventre'],
    ['odeur', 'Les pertes sentent mauvais', 'consulter'],
    ['demange', 'Cela me démange ou me brûle', 'consulter'],
    ['urine', 'Cela me brûle quand j’urine', 'consulter'],
    ['aspect', 'Elles sont vertes, jaunes, mousseuses ou avec du sang', 'consulter'],
    ['rapport', 'J’ai eu un rapport sans protection récemment', 'consulter'],
    ['enceinte', 'Je pense être enceinte', 'consulter'],
  ],
}
export const CONSEILS_CONSULTATION = {
  regles: ['Pose une compresse tiède sur le bas du ventre (pas brûlante).', 'Repose-toi, bois de l’eau, marche doucement.', 'Une douleur légère à modérée pendant les règles est fréquente chez les jeunes filles.'],
  pertes: ['Lave seulement l’extérieur à l’eau, sans savon parfumé. Pas de douche à l’intérieur.', 'Porte des sous-vêtements en coton et change-les chaque jour.', 'Ne prends aucun médicament de ta propre initiative : un traitement dépend de la cause.'],
}
/** Retourne un niveau (bon, signaler, urgent), un conseil, un éventuel produit (si le protocole le valide) et le centre à voir. */
export function consulter({ motif, reponses = [], village = 'agbele' }) {
  const q = QUESTIONS_CONSULTATION[motif]
  if (!q) return { niveau: 'surveiller', titre: 'Choisis un motif', texte: '', conseils: [], produit: null, bon: false, centre: null }
  const oui = q.filter(([id]) => reponses.includes(id))
  const urgent = motif === 'regles'
    ? oui.some(([, , g]) => g === 'urgent')
    : reponses.includes('fievre') || (reponses.includes('ventre') && oui.length >= 2)
  const consulter = motif === 'regles' ? oui.some(([, , g]) => g === 'consulter') : oui.length > 0
  const base = { conseils: CONSEILS_CONSULTATION[motif] }
  if (urgent) {
    return { ...base, niveau: 'urgent', titre: 'Va à l’hôpital tout de suite', texte: motif === 'regles' ? 'Ce que tu décris peut être grave. Ne reste pas seule : va tout de suite à l’hôpital avec une personne de confiance.' : 'Fièvre ou douleur au ventre avec des pertes peut être une infection qu’il faut soigner vite. Va à l’hôpital tout de suite.', produit: null, bon: false, centre: centrePour(village, motif === 'regles' ? 3 : 2) }
  }
  if (consulter) {
    return { ...base, niveau: 'signaler', titre: 'Vois une agente de santé', texte: 'Ce que tu décris mérite une consultation. Le bon anonyme te permet d’être reçue sans donner ton nom.', produit: null, bon: true, centre: centrePour(village, 1) }
  }
  if (motif === 'regles') {
    const contre = reponses.includes('allergie')
    return { ...base, niveau: 'bon', titre: 'Pas de signe de danger', texte: contre ? 'Aucun signe de danger. Comme tu as une allergie ou une maladie, ne prends pas de médicament sans l’avis d’une agente de santé.' : 'Aucun signe de danger. Si la douleur te gêne, un antalgique simple peut être remis par la borne, selon le protocole validé, et seulement si ta carte le prévoit.', produit: contre ? null : 'antalgique', bon: false, centre: null }
  }
  return { ...base, niveau: 'bon', titre: 'Pas de signe inquiétant', texte: 'Des pertes claires ou blanches, sans odeur ni démangeaison, sont souvent normales. Si cela change, reviens ou va voir une agente de santé.', produit: null, bon: false, centre: null }
}
