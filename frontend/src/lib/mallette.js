// La mallette de la crèche : de quoi tenir une journée d'accueil sans formation préalable.
// Répond à un constat du briefing Hack4Children : les crèches communautaires sont tenues par des femmes leaders bénévoles,
// peu formées en santé, nutrition et éveil, dans des locaux exigus. Contenus simples, à faire valider par un professionnel
// de santé et un nutritionniste avant tout usage réel.

export const A_VALIDER = 'Contenus à faire valider par un professionnel de santé et un nutritionniste avant tout usage réel.'

/** Activités par âge, faisables dans un petit local, avec ce qu'on a sous la main. */
export const GROUPES_AGE = [
  { code: 'bebes', nom: 'Bébés de 6 à 11 mois', de: 6, a: 11, activites: [
    ['Cache-cache sous un tissu', 'Cachez un objet sous un tissu, laissez l’enfant le chercher. Félicitez-le à voix haute.'],
    ['Le ventre à terre', 'Sur une natte, un jouet à portée de main : il se tourne, il rampe, il attrape.'],
    ['Chanter en le regardant', 'Une comptine, le visage tout près : l’enfant apprend la parole en regardant la bouche.'],
  ] },
  { code: 'petits', nom: 'Petits de 12 à 23 mois', de: 12, a: 23, activites: [
    ['Empiler et renverser', 'Des boîtes ou des gobelets à empiler, puis à renverser. Nommez : grand, petit, haut.'],
    ['Nommer les objets', 'Montrez un objet, dites son nom, laissez-le répéter. Dix mots par jour suffisent.'],
    ['Rouler la balle', 'À deux, assis face à face, on roule une balle de chiffons. On attend son tour.'],
  ] },
  { code: 'moyens', nom: 'Enfants de 24 à 35 mois', de: 24, a: 35, activites: [
    ['Imiter les animaux', 'Le coq, la tortue, la chèvre : les enfants imitent le cri et le déplacement.'],
    ['Trier par couleur', 'Des graines, des bouchons, des tissus : on fait des tas de la même couleur.'],
    ['Faire semblant', 'Cuisiner, soigner un bébé en tissu, aller au marché : le jeu de « faire comme les grands ».'],
  ] },
  { code: 'grands', nom: 'Grands de 3 à 5 ans', de: 36, a: 71, activites: [
    ['Compter avec des graines', 'Compter jusqu’à dix en déplaçant des graines, puis ajouter et retirer.'],
    ['Raconter une image', 'Un dessin, une histoire : l’enfant dit ce qu’il voit et ce qui va arriver.'],
    ['Tracer dans le sable', 'Lignes, cercles, première lettre de son prénom : la préparation à l’école.'],
  ] },
]

export const groupeDe = (ageMois) => GROUPES_AGE.find((g) => ageMois >= g.de && ageMois <= g.a) ?? null

/** Un menu par jour de la semaine, avec des aliments locaux. Les quantités et les prix dépendent du marché du jour. */
export const MENUS = [
  { jour: 'lundi', matin: 'Bouillie enrichie (maïs, soja, arachide)', midi: 'Riz, haricots, sauce de feuilles', collation: 'Banane mûre' },
  { jour: 'mardi', matin: 'Bouillie enrichie (mil, arachide)', midi: 'Pâte de maïs, sauce gombo avec du poisson', collation: 'Orange' },
  { jour: 'mercredi', matin: 'Bouillie enrichie (maïs, soja, arachide)', midi: 'Igname pilée, sauce de légumes, œuf', collation: 'Papaye' },
  { jour: 'jeudi', matin: 'Bouillie enrichie (riz, soja)', midi: 'Gari, haricots, huile de palme rouge', collation: 'Mangue' },
  { jour: 'vendredi', matin: 'Bouillie enrichie (maïs, soja, arachide)', midi: 'Riz, sauce de poisson et feuilles de manioc', collation: 'Banane' },
  { jour: 'samedi', matin: 'Bouillie enrichie (maïs, soja)', midi: 'Igname, sauce de légumes', collation: 'Fruit de saison' },
  { jour: 'dimanche', matin: 'Bouillie enrichie (maïs, soja)', midi: 'Riz, haricots', collation: 'Fruit de saison' },
]

export const REGLES_REPAS = [
  'De l’eau potable à portée de main toute la journée.',
  'Un enfant de moins de 6 mois ne reçoit que le lait de sa mère : la crèche ne lui donne ni bouillie ni eau.',
  'On ne donne rien à manger à un enfant qui s’endort ou qui pleure fort : on attend qu’il soit calme et assis.',
  'On demande à la famille les allergies et ce que l’enfant ne mange pas.',
]

export const HYGIENE = [
  'Lavage des mains des enfants avant le repas, avec du savon ou de la cendre',
  'Lavage des mains des adultes avant de préparer le repas et après les toilettes',
  'Eau de boisson conservée dans un récipient couvert',
  'Sol et jouets nettoyés avec de l’eau et du savon',
  'Latrines ou pot nettoyés, enfants accompagnés',
]

/** Signes pour lesquels on n'attend pas : on prévient la famille et on oriente vers le centre de santé le jour même. */
export const SIGNES_ALERTE = [
  'Fièvre (le front brûlant, ou 38 °C et plus au thermomètre)',
  'Diarrhée ou vomissements répétés',
  'Refuse de boire ou de manger',
  'Respire vite, ou on voit les côtes se creuser quand il respire',
  'Très endormi, mou, qu’on a du mal à réveiller',
  'Convulsions (secousses du corps) : urgence, appeler immédiatement',
]

/** Formation express : des cartes de deux minutes, à lire entre deux activités. */
export const MODULES = [
  { id: 'mains', titre: 'Se laver les mains, en cinq temps', lignes: ['Mouiller, savonner ou frotter avec de la cendre.', 'Frotter paumes, dos des mains, entre les doigts, ongles.', 'Compter jusqu’à vingt, en chantant avec les enfants.', 'Rincer à l’eau propre.', 'Sécher à l’air ou avec un linge propre.'] },
  { id: 'danger', titre: 'Reconnaître un enfant malade', lignes: ['Un enfant qui change d’habitude (calme ou agité) doit nous alerter.', 'Toucher le front, regarder la respiration, regarder s’il boit.', 'En cas d’un signe de la liste, on prévient la famille et l’agent de santé.', 'On note le code enfant, l’heure, ce qu’on a vu.'] },
  { id: 'nutrition', titre: 'Un repas qui fait grandir', lignes: ['Une céréale, une légumineuse, un légume ou un fruit : le trio de base.', 'Un peu d’huile et, quand on peut, un œuf ou du poisson.', 'Les fruits en collation plutôt que les sucreries.', 'Le périmètre brachial : l’agent le mesure, la crèche prévient si l’enfant maigrit.'] },
  { id: 'eveil', titre: 'Jouer, c’est apprendre', lignes: ['Parler à l’enfant, lui nommer les choses, attendre sa réponse.', 'Chanter, rouler, empiler : les jeux simples apprennent le plus.', 'Féliciter l’effort, pas seulement le résultat.', 'Pas d’écran avant deux ans.'] },
  { id: 'sommeil', titre: 'Un sommeil sûr', lignes: ['Bébé couché sur le dos, sur une surface plate et ferme.', 'Rien dans le lit : ni oreiller, ni peluche, ni couverture lourde.', 'Un adulte reste dans la pièce.', 'Une moustiquaire imprégnée pour la sieste.'] },
]
