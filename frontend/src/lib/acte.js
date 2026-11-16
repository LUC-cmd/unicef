// Chemin vers l'acte de naissance, selon la situation de l'enfant. Aucune donnée personnelle : tout se calcule sur place.
// Repères : déclaration gratuite à l'état civil dans les 45 jours ; ensuite, jugement supplétif au tribunal
// (6 000 FCFA, pris en charge par l'UNICEF pour certains enfants de 45 jours à 5 ans des familles les plus vulnérables).
// Sources : UNICEF Togo « Vers l'enregistrement universel des naissances » ; République Togolaise.

export const DELAI_GRATUIT_JOURS = 45

export function joursDepuis(dateIso, aujourdhuiIso) {
  const a = Date.parse(dateIso + 'T00:00:00Z')
  const b = Date.parse(aujourdhuiIso + 'T00:00:00Z')
  return Math.floor((b - a) / 86400000)
}

/** Date estimée à partir d'un âge approximatif (unité : 'mois' ou 'ans'). */
export function dateDepuisAge(valeur, unite, aujourdhuiIso) {
  const d = new Date(aujourdhuiIso + 'T00:00:00Z')
  if (unite === 'ans') d.setUTCFullYear(d.getUTCFullYear() - valeur)
  else d.setUTCMonth(d.getUTCMonth() - valeur)
  return d.toISOString().slice(0, 10)
}

const PIECES_UTILES = [
  'Le carnet de santé ou de vaccination (il porte une date de naissance)',
  "L'attestation ou le bulletin de naissance de la maternité ou du centre de santé, s'il existe",
  'Deux adultes de confiance qui connaissent la naissance (témoins)',
  "Une pièce d'identité de la mère ou du père, si la famille en a une",
]

/**
 * @param {{ etat: 'grossesse'|'ne', precision: 'exacte'|'approx'|'inconnue', date?: string, dejaDeclare?: 'oui'|'non'|'nsp',
 *           pereInconnu?: boolean, merePrefereSansNom?: boolean, aujourdhui: string }} s
 */
export function analyser(s) {
  const notes = []
  if (s.merePrefereSansNom) {
    notes.push({ titre: "La mère ne souhaite pas donner son nom", texte: "Fil d'Or n'en a pas besoin : la mère et l'enfant sont suivis par un code, sans nom. Seule la mairie demande les noms au moment de l'acte, et c'est à la famille de les lui donner, quand elle est prête. Il ne faut jamais forcer. L'enfant garde son suivi de santé et ses vaccins dans tous les cas." })
  }
  if (s.pereInconnu) {
    notes.push({ titre: "Le père n'est pas connu ou n'est pas déclaré", texte: "Cela n'empêche ni le suivi de santé, ni la déclaration de naissance par la mère. La mairie dira comment inscrire l'enfant et comment le père pourra le reconnaître plus tard s'il le souhaite : c'est à confirmer avec l'officier d'état civil." })
  }

  if (s.etat === 'grossesse') {
    return {
      cas: 'grossesse', ton: 'info', titre: 'Pas encore né : on prépare',
      resume: "Rien à déclarer aujourd'hui. Le plus utile est de préparer la suite avec la famille.",
      etapes: [
        'Dire à la famille que la déclaration de naissance est gratuite pendant 45 jours après la naissance.',
        "À la naissance, demander à la maternité ou au centre de santé un papier qui prouve la naissance (bulletin ou attestation). Si l'enfant naît à la maison, noter la date, le lieu et qui était présent.",
        "Dans les 45 jours, la famille déclare l'enfant à la mairie. Fil d'Or peut préparer la déclaration pour que la mairie la valide.",
      ],
      pieces: [], notes, cout: 'Gratuit dans les 45 jours',
    }
  }

  if (s.dejaDeclare === 'oui') {
    return {
      cas: 'declare', ton: 'ok', titre: "Déjà déclaré : il reste à retirer l'acte",
      resume: "La naissance est enregistrée. Vérifiez que la famille a bien l'acte en main.",
      etapes: [
        "Demander à la famille si elle a reçu l'acte de naissance. Si elle n'a que le récépissé, l'acte est peut-être prêt à la mairie.",
        "La mairie peut marquer l'acte « prêt » puis « retiré » dans Fil d'Or : c'est ce qui permet de voir les actes oubliés.",
      ],
      pieces: [], notes, cout: 'Gratuit',
    }
  }

  const inconnue = s.precision === 'inconnue'
  const jours = !inconnue && s.date ? joursDepuis(s.date, s.aujourdhui) : null

  if (jours !== null && jours <= DELAI_GRATUIT_JOURS) {
    const reste = DELAI_GRATUIT_JOURS - jours
    return {
      cas: 'gratuit', ton: 'ok', titre: 'Dans le délai gratuit',
      resume: reste === 0 ? "C'est le dernier jour du délai gratuit : aller à la mairie aujourd'hui."
        : `Il reste ${reste} jour${reste > 1 ? 's' : ''} pour déclarer gratuitement.`,
      etapes: [
        "Aller à la mairie avec la mère ou un proche. La déclaration est gratuite jusqu'à 45 jours après la naissance.",
        "Apporter le papier de la maternité ou du centre de santé s'il existe. Sinon, venir avec deux témoins qui connaissent la naissance.",
        "La mairie établit l'acte. Revenir le chercher quand elle indique qu'il est prêt.",
      ],
      pieces: PIECES_UTILES.slice(1, 4), notes, cout: 'Gratuit', urgence: reste <= 10,
    }
  }

  // Délai dépassé ou naissance non documentée : jugement supplétif.
  const etapes = [
    "La déclaration gratuite est passée : il faut un jugement supplétif, une décision du tribunal qui tient lieu d'acte de naissance et que la mairie enregistre ensuite.",
    "Rassembler les pièces utiles (liste ci-dessous). La mairie ou le tribunal indiquent les pièces exactes demandées.",
    "Demander le jugement supplétif au tribunal. Des campagnes de régularisation existent : demander à la mairie, à l'agent de santé ou à l'UNICEF si une est en cours dans la zone.",
    "Une fois le jugement rendu, la mairie enregistre la naissance et l'acte peut être retiré.",
  ]
  if (inconnue || s.precision === 'approx') {
    etapes.splice(1, 0, "La date de naissance exacte n'est pas connue : on part de la meilleure estimation (âge donné par la famille, carnet de vaccination, événement dont on se souvient). Le jugement permet de fixer une date de naissance.")
  }
  const petit = jours !== null && jours <= 5 * 365
  return {
    cas: 'supletif', ton: 'attention',
    titre: inconnue ? 'Naissance non documentée : jugement supplétif' : 'Délai dépassé : jugement supplétif',
    resume: petit
      ? "Pour un enfant de moins de 5 ans d'une famille très vulnérable, l'UNICEF a pris en charge ces frais dans certaines régions (région des Savanes notamment)."
      : "Ce n'est jamais trop tard : un enfant, un adolescent ou un adulte peut obtenir son acte par jugement.",
    etapes, pieces: PIECES_UTILES, notes,
    cout: '6 000 FCFA, ou pris en charge selon la campagne', urgence: false,
  }
}
