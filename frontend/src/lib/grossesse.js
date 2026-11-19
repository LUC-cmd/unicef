// Fiches de grossesse : un mois = une page. Contenu à informer et orienter, jamais à diagnostiquer :
// tout est marqué « à valider » tant que des professionnels de santé ne l'ont pas relu
// (même règle que les contenus du serveur, colonne contenu.a_valider).
// Chaque fiche porte des emplacements vidéo (lib/videosEveil.js côté jeux ; ici mois par mois).

export const A_VALIDER = 'Contenus à faire valider par des professionnels de santé avant tout usage réel (PEV, CPN, exercices).'

export const MOIS_GROSSESSE = [
  {
    mois: 1,
    titre: 'Je découvre que j\'attends un bébé',
    bebe: 'Un petit grain de vie : le cœur commence à battre.',
    rdv: 'Dès que vous savez : allez au centre de santé pour la CPN 1. La première consultation protège toute la grossesse.',
    exercices: [
      { picto: 'marche', titre: 'Marche douce', consigne: '20 à 30 minutes de marche tranquille, matin ou fin de journée. Le corps qui bouge, c\'est un corps qui se prépare.', materiel: 'aucun' },
      { picto: 'souffle', titre: 'Respiration du ventre', consigne: 'Assise, une main sur le ventre. Respirez par le nez, le ventre gonfle, soufflez lentement par la bouche. 5 fois, deux fois par jour.', materiel: 'aucun' },
    ],
    conseil: 'Commencez les comprimés de fer et d\'acide folique donnés au centre : ils protègent le sang de la maman et la colonne du bébé. Prenez-les avec de l\'eau, pas avec le thé.',
    video: null,
  },
  {
    mois: 2,
    titre: 'Le corps change',
    bebe: 'Il grandit très vite : ses petits bras et ses petites jambes se dessinent.',
    rdv: 'CPN selon le calendrier du centre. Signalez toute nausée forte qui empêche de manger ou de boire.',
    exercices: [
      { picto: 'yoga', titre: 'Étirement doux du dos', consigne: 'À quatre pattes, creusez le dos en respirant, puis arrondissez-le en soufflant (le chat). 5 fois, lentement.', materiel: 'un pagne plié sous les genoux' },
      { picto: 'goutte', titre: 'Boire et se reposer', consigne: 'Buvez de l\'eau propre souvent, en petites quantités. Reposez-vous les pieds surélevés quand les jambes pèsent.', materiel: 'eau propre' },
    ],
    conseil: 'Les nausées passent souvent vers le 4ᵉ mois. Mangez petit à petit mais souvent : ignambe, banane, haricots, œufs.',
    video: null,
  },
  {
    mois: 3,
    titre: 'Fin du premier trimestre : on vérifie que tout va bien',
    bebe: 'Il bouge ses doigts, son cœur s\'entend au centre de santé.',
    rdv: 'CPN 2 ou 3 : le poids, la tension, le ventre sont vérifiés. C\'est le moment des premiers comprimés anti-paludisme (TPI) si l\'agent les a donnés.',
    exercices: [
      { picto: 'lit', titre: 'Bien dormir à gauche', consigne: 'Le soir, couchez-vous sur le côté gauche, un pagne roulé entre les genoux : le sang circule mieux vers le bébé.', materiel: 'un pagne roulé' },
      { picto: 'marche', titre: 'Marche et respiration', consigne: 'Gardez la marche douce tous les jours. En marchant, respirez régulièrement : inspirez 3 pas, soufflez 3 pas.', materiel: 'aucun' },
    ],
    conseil: 'Dormez toujours sous la moustiquaire imprégnée. Le paludisme est dangereux pour le bébé.',
    video: null,
  },
  {
    mois: 4,
    titre: 'Le ventre s\'arrondit',
    bebe: 'Il entend maintenant les voix : parlez-lui, chantez-lui.',
    rdv: 'CPN mensuelle. Le centre vérifie la croissance du ventre et écoute le cœur du bébé.',
    exercices: [
      { picto: 'parole', titre: 'Parlez à votre bébé', consigne: 'Chaque jour, la main sur le ventre : racontez votre journée, chantez une berceuse. Le bébé reconnaît votre voix dès la naissance.', materiel: 'aucun' },
      { picto: 'chaise', titre: 'Se tenir droite', consigne: 'Assise et debout, dos droit, épaules relâchées. Le bébé grandit droit quand la maman tient bien son dos.', materiel: 'une chaise avec dossier' },
    ],
    conseil: 'Fer + acide folique tous les jours jusqu\'à l\'accouchement, comme le centre l\'a expliqué.',
    video: null,
  },
  {
    mois: 5,
    titre: 'Les premiers coups de pied',
    bebe: 'Vous sentez ses mouvements : c\'est son langage. Comptez-les chaque jour.',
    rdv: 'CPN mensuelle. Annoncez au centre si le bébé bouge moins que d\'habitude.',
    exercices: [
      { picto: 'jambe', titre: 'Renforcer les jambes', consigne: 'Debout, en vous appuyant au mur : pliez les genoux un peu, remontez. 8 fois, lentement. Les jambes fortes portent mieux le ventre.', materiel: 'un mur' },
      { picto: 'souffle', titre: 'Souffler le ventre rond', consigne: 'Assise, mains sur les côtes : inspirez pour élargir les côtes, soufflez longtemps comme dans un roseau. 5 fois.', materiel: 'aucun' },
    ],
    conseil: 'Mangez varié : ignambe, haricots, poisson, œufs, légumes verts, fruits. Le bébé construit son corps avec votre assiette.',
    video: null,
  },
  {
    mois: 6,
    titre: 'Le dos travaille : on le soulage',
    bebe: 'Il ouvre les yeux, il répond quand vous touchez le ventre.',
    rdv: 'CPN mensuelle. Si les chevilles ou le visage gonflent le matin, dites-le tout de suite au centre.',
    exercices: [
      { picto: 'accroupie', titre: 'Le chat (dos souple)', consigne: 'À quatre pattes, arrondissez le dos en soufflant, creusez en inspirant. 6 fois, deux fois par jour : le meilleur geste contre les maux de dos.', materiel: 'un pagne plié' },
      { picto: 'pied', titre: 'Cercles de cheville', consigne: 'Assise, jambe tendue : tournez la cheville 5 fois dans un sens, 5 fois dans l\'autre. Évite les gonflements et les crampes.', materiel: 'aucun' },
    ],
    conseil: 'Ne portez plus de charges lourdes. Demandez aux proches d\'aider pour l\'eau et le bois.',
    video: null,
  },
  {
    mois: 7,
    titre: 'On prépare l\'arrivée',
    bebe: 'Il prend son poids de naissance. Il se met parfois la tête en bas.',
    rdv: 'CPN mensuelle + préparation à l\'accouchement : demandez le plan d\'accouchement au centre (où accoucher, avec qui, comment appeler).',
    exercices: [
      { picto: 'souffle', titre: 'La respiration du accouchement', consigne: 'Entraînez-vous chaque jour : soufflez LONG et doux comme pour pousser une bougie, pendant une contraction imaginaire. La respiration de la naissance s\'apprend avant.', materiel: 'aucun' },
      { picto: 'panier', titre: 'Le kit d\'accouchement', consigne: 'Préparez et gardez prêt : savon, drap propre, pagne propre, gants, ciseaux propres, ficelle propre, couches, une tenue pour le bébé. Voir la liste complète ci-dessous.', materiel: 'voir le kit' },
    ],
    conseil: 'Repérez le transport pour le centre, jour et nuit : qui conduit, avec quel argent, quel téléphone. Un plan de naissance évite les retards.',
    video: null,
  },
  {
    mois: 8,
    titre: 'La tête en bas',
    bebe: 'Il prend de la place : un peu moins de mouvements, mais ils restent réguliers.',
    rdv: 'CPN mensuelle. Le centre vérifie que le bébé est bien placé et le poids de la maman.',
    exercices: [
      { picto: 'yoga', titre: 'Ouvrir le bassin', consigne: 'Assise sur une chaise, jambes ouvertes, dos droit, ou accroupie appuyée contre un mur quelques secondes. Le bassin s\'ouvre pour l\'accouchement.', materiel: 'un mur ou une chaise' },
      { picto: 'souffle', titre: 'Respirer court et lent', consigne: 'Inspirez sur 3 temps, soufflez sur 3 temps, sans forcer. On l\'utilisera pendant les contractions.', materiel: 'aucun' },
    ],
    conseil: 'Repos plus souvent, mais la marche reste votre amie : elle prépare le jour de l\'accouchement.',
    video: null,
  },
  {
    mois: 9,
    titre: 'Le mois de la rencontre',
    bebe: 'Il est prêt : la tête est en bas, il appuie sur le bassin.',
    rdv: 'CPN chaque semaine si le centre le propose. Gardez le kit d\'accouchement à portée de main, même la nuit.',
    exercices: [
      { picto: 'marche', titre: 'Marche de préparation', consigne: 'Petites marches plusieurs fois par jour, avec un accompagnant. Cela aide la tête du bébé à bien se placer.', materiel: 'un accompagnant' },
      { picto: 'souffle', titre: 'Relâcher sous la contraction', consigne: 'Imaginez une contraction : soufflez doucement et relâchez les épaules et les mains. Répétez 5 fois, matin et soir.', materiel: 'aucun' },
    ],
    conseil: 'Contractions régulières, perte d\'eau ou de sang : partez au centre, sans attendre. Le reçu de naissance est gratuit dans les 45 jours.',
    video: null,
  },
]

/** Signes qui imposent d'aller au centre de santé TOUT DE SUITE, quel que soit le mois. */
export const SIGNES_ALERTE_GROSSESSE = [
  ['goutte', 'Du sang ou une perte d\'eau'],
  ['vertige', 'Mal de tête très fort, vue trouble, gonflement du visage et des mains'],
  ['fievre', 'Fièvre'],
  ['coeur', 'Le bébé bouge moins que d\'habitude ou ne bouge plus'],
  ['nausee', 'Vomissements qui empêchent de boire'],
  ['eclair', 'Convulsions'],
]

/** Le kit d'accouchement propre, à préparer dès le 7ᵉ mois. */
export const KIT_ACCOUCHEMENT = [
  'Un savon et une eau propre',
  'Un drap et un pagne propres',
  'Des gants propres (donnés au centre)',
  'Des ciseaux et une ficelle propres (liés dans un pagne)',
  'Une tenue et une couverture pour le bébé, une paire de chaussettes',
  'Des couches et un bas de coton',
  'Le carnet de CPN et l\'argent du transport',
  'Le numéro de l\'agent de santé et du taxi/moto',
]

/** Postures douces qui aident le bébé à se placer, à partir du 7ᵉ mois.
 *  IMPORTANT : ce sont des postures de confort, jamais des manœuvres. On n'appuie jamais sur le ventre
 *  et on ne cherche jamais à « retourner » le bébé à la main : c'est le centre de santé qui vérifie la
 *  position et décide. Toute fiche reste à valider par des professionnels (sage-femme, CPN). */
export const POSITIONS_BEBE = [
  {
    picto: 'accroupie',
    titre: 'Le balancier à quatre pattes',
    quand: 'À partir du 7ᵉ mois, 5 à 10 minutes, 2 fois par jour',
    consigne: 'À quatre pattes, avancez doucement les hanches d’avant en arrière, le dos plat, en respirant. Ce balancement soulage le dos et laisse de la place au bébé.',
    materiel: 'un pagne plié sous les genoux',
    video: null,
  },
  {
    picto: 'chaise',
    titre: 'Assise penchée en avant',
    quand: 'Quand vous êtes fatiguée, quelques minutes',
    consigne: 'Assise sur une chaise, genoux écartés, penchez le buste vers l’avant en soufflant, les bras posés sur les genoux. Le ventre se libère, le bébé a plus de place.',
    materiel: 'une chaise stable',
    video: null,
  },
  {
    picto: 'yoga',
    titre: 'Accroupie appuyée',
    quand: 'À partir du 8ᵉ mois, si c’est confortable',
    consigne: 'Accroupie, dos appuyé contre un mur, genoux ouverts : tenez quelques secondes puis relevez-vous lentement en vous aidant des mains. Le bassin s’ouvre et prépare la naissance.',
    materiel: 'un mur et un accompagnant',
    video: null,
  },
  {
    picto: 'lune',
    titre: 'Sur le côté gauche',
    quand: 'Pour dormir et se reposer',
    consigne: 'Allongée sur le côté gauche, un pagne roulé entre les genoux : le sang circule mieux vers le bébé et le dos est soulagé.',
    materiel: 'un pagne roulé',
    video: null,
  },
]

/** La phrase de prudence qui accompagne toujours ces postures. */
export const PRUDENCE_POSITIONS = 'Ces postures sont douces et ne remplacent pas le centre de santé. N’appuyez jamais sur le ventre et ne cherchez jamais à retourner le bébé vous-même : c’est la sage-femme qui vérifie la position et décide. Si le bébé bouge moins, si vous saignez ou si vous perdez de l’eau, allez au centre tout de suite.'

/** Accompagne la maman enceinte suivie par un agent : le mois calculé d'après le terme prévu. */
export function moisActuel(dateTermePrevue, aujourdhui) {
  if (!dateTermePrevue) return null
  const jours = Math.round((dateTermePrevue.getTime() - aujourdhui.getTime()) / 86400000)
  if (jours <= 0) return 9
  // 280 jours = 40 semaines = 10 mois de 28 jours ; on affiche le mois de grossesse « médical » (1 à 9)
  const restant = Math.ceil(jours / 28)
  return Math.min(9, Math.max(1, 10 - restant))
}
