/**
 * Espace adolescente : cycle, grossesse, signes de danger, plan d'accouchement.
 * Tout se calcule sur l'appareil. Rien n'est envoyé au serveur.
 * Les repères de santé sont des repères courants (OMS), à faire valider par un professionnel avant tout usage réel.
 */
const JOUR = 86400000
const vers = (iso) => { const [a, m, j] = iso.split('-').map(Number); return Date.UTC(a, m - 1, j) }
const iso = (t) => new Date(t).toISOString().slice(0, 10)
export const ajouterJours = (dateIso, n) => iso(vers(dateIso) + n * JOUR)
export const ecartJours = (a, b) => Math.round((vers(b) - vers(a)) / JOUR)

/**
 * Cycle : prévision des prochaines règles et de la période où une grossesse est possible.
 * L'ovulation survient environ 14 jours avant les règles suivantes. La période fertile couvre les 5 jours qui la précèdent et le jour d'après.
 * Ce n'est qu'une estimation : chez les adolescentes les cycles sont souvent irréguliers. Ce n'est PAS une méthode de contraception.
 */
export function lireCycle({ debut, duree = 28 }) {
  if (!debut || !Number.isFinite(duree)) return null
  if (duree < 21 || duree > 45) {
    return { fiable: false, niveau: 'signaler', titre: 'Parlez-en à une agente de santé', texte: 'Un cycle de moins de 21 jours ou de plus de 45 jours mérite l’avis d’une agente de santé. Elle pourra t’expliquer et, si besoin, t’examiner.' }
  }
  const prochaines = [1, 2, 3].map((k) => ajouterJours(debut, duree * k))
  const ovulation = ajouterJours(prochaines[0], -14)
  return {
    fiable: true,
    prochaines,
    ovulation,
    fertileDu: ajouterJours(ovulation, -5),
    fertileAu: ajouterJours(ovulation, 1),
  }
}

/** Où en est-on aujourd'hui dans le cycle ? */
export function phaseCycle(cycle, auJour, duree = 28, debut) {
  if (!cycle?.fiable || !debut) return null
  let jour = ecartJours(debut, auJour) % duree
  if (jour < 0) jour += duree
  jour += 1
  const dansFenetre = (d) => d >= ecartJours(debut, cycle.fertileDu) % duree + 1 && d <= ecartJours(debut, cycle.fertileAu) % duree + 1
  if (jour <= 5) return { jour, nom: 'Règles probables', texte: 'Repose-toi si tu as mal au ventre, bois de l’eau, mange des aliments riches en fer (haricots, feuilles vertes, poisson).' }
  if (dansFenetre(jour)) return { jour, nom: 'Période où une grossesse est possible', texte: 'Un rapport sexuel sans protection peut mener à une grossesse. Cette date est une estimation, elle peut se décaler.' }
  return { jour, nom: jour < 14 ? 'Avant la période fertile' : 'Après la période fertile', texte: 'Une grossesse reste possible : les cycles bougent. Seule une méthode de protection adaptée protège vraiment.' }
}

/** Alerte de suivi selon l'âge de la mère. L'âge exact n'est jamais gardé côté serveur. */
export function niveauAgeMere(age) {
  if (!Number.isFinite(age) || age < 10 || age > 55) return null
  if (age < 15) return { niveau: 'rouge', titre: 'Suivi très rapproché', texte: 'Avant 15 ans, la grossesse et l’accouchement présentent un risque élevé. Accouchement en centre de santé équipé, consultations rapprochées, appui d’une personne de confiance.', consultations: 'rapprochees' }
  if (age < 18) return { niveau: 'orange', titre: 'Suivi renforcé', texte: 'Avant 18 ans, un suivi plus attentif protège la mère et le bébé : consultations régulières, accouchement en centre de santé, orientation vers le centre social pour rester à l’école.', consultations: 'rapprochees' }
  if (age < 20) return { niveau: 'jaune', titre: 'Suivi attentif', texte: 'Entre 18 et 19 ans, le suivi habituel s’applique avec une attention sur la nutrition, le fer et la planification après la naissance.', consultations: 'habituelles' }
  return { niveau: 'bon', titre: 'Suivi habituel', texte: 'Le suivi habituel s’applique.', consultations: 'habituelles' }
}

/** Consultations prénatales : 8 contacts recommandés par l'OMS (semaines 12, 20, 26, 30, 34, 36, 38, 40). */
export const SEMAINES_CPN = [12, 20, 26, 30, 34, 36, 38, 40]
/** Pour une adolescente, on ajoute un contact tôt (8 semaines) et un contact en plus en fin de grossesse (37). */
export const SEMAINES_CPN_RENFORCEES = [8, 12, 16, 20, 24, 28, 32, 34, 36, 37, 38, 40]

export function lireGrossesse({ dernieresRegles, auJour, age }) {
  if (!dernieresRegles || !auJour) return null
  const jours = ecartJours(dernieresRegles, auJour)
  if (jours < 0 || jours > 300) return null
  const semaines = Math.floor(jours / 7)
  const termePrevu = ajouterJours(dernieresRegles, 280)
  const trimestre = semaines < 14 ? 1 : semaines < 28 ? 2 : 3
  const suivi = niveauAgeMere(age)
  const liste = suivi && suivi.consultations === 'rapprochees' ? SEMAINES_CPN_RENFORCEES : SEMAINES_CPN
  const rendezVous = liste.map((s) => ({ semaine: s, date: ajouterJours(dernieresRegles, s * 7), passe: s <= semaines }))
  const prochain = rendezVous.find((r) => !r.passe) ?? null
  return { semaines, joursReste: jours % 7, termePrevu, trimestre, suivi, rendezVous, prochain, restant: Math.max(0, ecartJours(auJour, termePrevu)) }
}

export const SIGNES_GROSSESSE = [
  { id: 'sang', texte: 'Du sang qui coule du vagin' },
  { id: 'convulsions', texte: 'Des convulsions, ou je perds connaissance' },
  { id: 'tete', texte: 'Un très fort mal de tête, avec la vue floue' },
  { id: 'fievre', texte: 'Une forte fièvre' },
  { id: 'ventre', texte: 'Une douleur très forte au ventre' },
  { id: 'liquide', texte: 'Du liquide qui coule avant le terme' },
  { id: 'souffle', texte: 'Je respire très difficilement' },
  { id: 'bouge', texte: 'Le bébé bouge beaucoup moins qu’avant' },
  { id: 'gonfle', texte: 'Le visage et les mains sont gonflés d’un coup' },
]
export function lireSignesGrossesse(cochees) {
  const n = cochees.length
  if (n === 0) return { niveau: 'bon', titre: 'Aucun signe de danger coché', texte: 'Continue tes consultations. Si un de ces signes apparaît, va au centre de santé tout de suite.' }
  return { niveau: 'urgent', titre: 'Va au centre de santé tout de suite', texte: 'Ces signes peuvent mettre ta vie et celle du bébé en danger. Ne reste pas seule : demande à quelqu’un de t’accompagner maintenant. N’attends pas le prochain rendez-vous.' }
}

export const SIGNES_NOUVEAU_NE = [
  { id: 'tete', texte: 'Il ne tète pas bien ou refuse le sein', danger: true },
  { id: 'convulsions', texte: 'Il a eu des convulsions', danger: true },
  { id: 'respire', texte: 'Il respire très vite ou avec difficulté (le ventre ou la poitrine se creuse)', danger: true },
  { id: 'chaud', texte: 'Il est brûlant', danger: true },
  { id: 'froid', texte: 'Il est très froid', danger: true },
  { id: 'jaune24', texte: 'La peau est jaune le premier jour, ou les paumes et la plante des pieds sont jaunes', danger: true },
  { id: 'bouge', texte: 'Il bouge très peu ou il est mou', danger: true },
  { id: 'cordon', texte: 'Le nombril est rouge, gonflé ou coule du pus', danger: true },
  { id: 'sang', texte: 'Du sang sort de son nombril', danger: true },
]
export function lireNouveauNe(cochees) {
  if (cochees.length === 0) return { niveau: 'bon', titre: 'Aucun signe de danger coché', texte: 'Continue de le garder au chaud contre ta peau, de l’allaiter, et viens à toutes les visites. Si un de ces signes apparaît, va au centre de santé tout de suite.' }
  return { niveau: 'urgent', titre: 'Va au centre de santé tout de suite', texte: 'Chez un bébé de moins d’un mois, un de ces signes est une urgence. Garde-le contre ta peau, bien couvert, et pars maintenant. Ne donne ni tisane ni médicament avant d’avoir vu un agent de santé.' }
}

/** Signes généraux de danger de l'enfant de 2 mois à 5 ans (repères PCIME de l'OMS). */
export const SIGNES_ENFANT_ROUGE = [
  { id: 'boit', texte: 'Il ne peut pas boire ni téter' },
  { id: 'vomit', texte: 'Il vomit tout ce qu’il prend' },
  { id: 'convulsions', texte: 'Il a eu des convulsions' },
  { id: 'mou', texte: 'Il est très mou, difficile à réveiller ou il ne réagit pas' },
]
export const SIGNES_ENFANT_ORANGE = [
  { id: 'fievre', texte: 'Il a de la fièvre depuis plus de 2 jours' },
  { id: 'toux', texte: 'Il tousse et respire plus vite que d’habitude' },
  { id: 'diarrhee', texte: 'Il a la diarrhée depuis plus de 3 jours ou du sang dans les selles' },
  { id: 'soif', texte: 'Il a les yeux creux et il boit avidement' },
  { id: 'maigre', texte: 'Il est très maigre ou les deux pieds sont gonflés' },
]
export function lireEnfantMalade(cochees) {
  if (SIGNES_ENFANT_ROUGE.some((s) => cochees.includes(s.id))) return { niveau: 'urgent', titre: 'Va au centre de santé tout de suite', texte: 'Ces signes de danger demandent une prise en charge urgente. Pars maintenant et garde l’enfant au chaud. Continue de lui proposer le sein ou de l’eau si c’est possible.' }
  if (SIGNES_ENFANT_ORANGE.some((s) => cochees.includes(s.id))) return { niveau: 'signaler', titre: 'Va au centre de santé aujourd’hui', texte: 'Ces signes demandent l’avis d’un agent de santé le jour même. En attendant : continue l’allaitement, propose de l’eau propre en petites quantités, garde-le au frais s’il a de la fièvre.' }
  return { niveau: 'bon', titre: 'Aucun signe de danger coché', texte: 'Surveille-le. Si un signe apparaît ou si l’état s’aggrave, va au centre de santé.' }
}

export const METHODES = [
  { nom: 'Préservatif', texte: 'Protège d’une grossesse et des infections sexuellement transmissibles (dont le VIH). À utiliser à chaque rapport.' },
  { nom: 'Pilule', texte: 'Un comprimé chaque jour. Un agent de santé explique comment la prendre et ce qu’il faut faire en cas d’oubli.' },
  { nom: 'Injection', texte: 'Une injection tous les quelques mois, faite au centre de santé.' },
  { nom: 'Implant', texte: 'Un petit bâtonnet placé sous la peau du bras par un agent formé. Il protège plusieurs années et peut être retiré à tout moment.' },
  { nom: 'Stérilet', texte: 'Un petit dispositif posé dans l’utérus par un agent formé. Il protège plusieurs années.' },
  { nom: 'Contraception d’urgence', texte: 'Après un rapport sans protection, elle peut éviter une grossesse si elle est prise tôt. Plus on va vite, mieux c’est. Va au centre de santé ou à la pharmacie le plus vite possible.' },
]

export const CLE = 'fildor.ado'
const vide = () => ({ debut: '', duree: 28, regles: [], dr: '', age: '', plan: { centre: '', transport: '', accompagnant: '', argent: '', sac: false } })
export function lireEspace() {
  try { return { ...vide(), ...JSON.parse(localStorage.getItem(CLE) ?? '{}') } } catch { return vide() }
}
export function ecrireEspace(v) { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* stockage plein ou refusé */ } }
export function effacerEspace() { try { localStorage.removeItem(CLE) } catch { /* rien */ } }
