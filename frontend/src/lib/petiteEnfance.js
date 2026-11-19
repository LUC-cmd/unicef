// Repères simples pour les familles. Ce ne sont ni des diagnostics ni des soins : ils servent à décider quand en parler à l'agent de santé.
// Tous les textes de santé de ce fichier doivent être relus et validés par un professionnel de santé avant tout usage réel.

export const TRANCHES = [
  { max: 3, titre: '0 à 3 mois', questions: ['Il regarde votre visage quand vous lui parlez.', 'Il sourit quand vous lui souriez.', 'Il suit un objet des yeux.', 'Sur le ventre, il lève un peu la tête.'], jeu: 'Parlez-lui face à face, doucement, et chantez-lui une chanson.' },
  { max: 6, titre: '4 à 6 mois', questions: ['Il rit ou fait des petits cris de joie.', 'Il tourne la tête vers un bruit.', 'Il attrape un jouet qu’on lui tend.', 'Il se retourne du dos sur le ventre.'], jeu: 'Montrez-lui un objet coloré et bougez-le lentement pour qu’il le suive et l’attrape.' },
  { max: 9, titre: '7 à 9 mois', questions: ['Il tient assis, seul ou avec un petit appui.', 'Il fait des sons comme « ba », « ma », « da ».', 'Il passe un objet d’une main à l’autre.', 'Il réagit quand on dit son prénom.'], jeu: 'Jouez à « coucou » avec un tissu, et répétez ses sons comme dans une conversation.' },
  { max: 12, titre: '10 à 12 mois', questions: ['Il se tient debout en s’accrochant à un meuble.', 'Il dit « maman » ou « papa », même sans bien savoir.', 'Il fait « au revoir » de la main.', 'Il cherche un objet qu’on vient de cacher.'], jeu: 'Cachez un jouet sous un tissu devant lui et laissez-le le retrouver.' },
  { max: 18, titre: '13 à 18 mois', questions: ['Il marche seul, ou fait quelques pas.', 'Il dit quelques mots.', 'Il montre du doigt ce qu’il veut.', 'Il imite un geste simple (balayer, boire).'], jeu: 'Nommez les objets de la maison quand il les montre du doigt.' },
  { max: 24, titre: '19 à 24 mois', questions: ['Il court ou marche vite sans tomber tout le temps.', 'Il met deux mots ensemble (« veux eau »).', 'Il montre son nez, sa bouche, ses pieds quand on demande.', 'Il joue à faire semblant (donner à manger à une poupée).'], jeu: 'Jouez à « montre-moi ton nez, ta bouche, ton pied » en chantant.' },
  { max: 36, titre: '25 à 36 mois', questions: ['Il dit des phrases de trois mots.', 'Il monte quelques marches avec ou sans appui.', 'Il joue à côté d’autres enfants.', 'Il aide à enlever ses habits.'], jeu: 'Racontez ensemble la journée avec des phrases courtes et laissez-le compléter.' },
  { max: 48, titre: '3 à 4 ans', questions: ['Il saute sur place avec les deux pieds.', 'Il raconte ce qu’il a fait, même avec des erreurs.', 'Il dessine un rond ou un trait.', 'Il dit son prénom.'], jeu: 'Donnez-lui un bâton et du sable : dessiner un rond, une maison, un soleil.' },
  { max: 60, titre: '4 à 5 ans', questions: ['Il se tient sur un pied quelques secondes.', 'Il raconte une petite histoire.', 'Il compte jusqu’à cinq avec les doigts.', 'Il se lave les mains presque seul.'], jeu: 'Comptez ensemble les cailloux, les fruits, les doigts, jusqu’à cinq puis dix.' },
]

export const trancheDe = (mois) => TRANCHES.find((t) => mois <= t.max) ?? TRANCHES[TRANCHES.length - 1]

/** pasEncore : nombre de repères que l'enfant ne fait pas encore. */
export function lireDeveloppement(pasEncore) {
  if (pasEncore === 0) return { niveau: 'bon', titre: 'Il avance bien', texte: 'Continuez à lui parler, à chanter et à jouer chaque jour. Vous pouvez refaire ce petit bilan dans un ou deux mois.' }
  if (pasEncore === 1) return { niveau: 'surveiller', titre: 'À surveiller', texte: 'Un repère n’est pas encore là, c’est fréquent : chaque enfant avance à son rythme. Jouez au jeu proposé tous les jours et refaites le bilan dans un mois. Si cela ne change pas, parlez-en à votre agent de santé.' }
  return { niveau: 'signaler', titre: 'À montrer à l’agent de santé', texte: 'Plusieurs repères ne sont pas encore là. Ce n’est pas une maladie ni une faute : un agent de santé peut regarder avec vous, et aider tôt si besoin. Plus on aide tôt, mieux l’enfant avance.' }
}

/** Mesure du bras (périmètre brachial) des enfants de 6 à 59 mois : seuils habituels de dépistage de la malnutrition aiguë (millimètres). */
export function lireBras(mm, oedeme) {
  if (oedeme) return { niveau: 'rouge', titre: 'Aller au centre de santé aujourd’hui', texte: 'Des pieds ou des jambes gonflés chez un enfant doivent être vus par un soignant sans attendre.' }
  if (mm < 115) return { niveau: 'rouge', titre: 'Aller au centre de santé aujourd’hui', texte: 'Le bras est très fin pour son âge : l’enfant a besoin d’un soin rapide. Allez au centre de santé le plus proche, ou prévenez votre agent de santé.' }
  if (mm < 125) return { niveau: 'jaune', titre: 'À voir cette semaine', texte: 'Le bras est un peu fin : l’enfant risque de manquer de nourriture riche. Parlez-en à votre agent de santé cette semaine, et donnez des repas plus fréquents avec des aliments riches (œuf, poisson, haricots, huile).' }
  return { niveau: 'vert', titre: 'Tout va bien', texte: 'La mesure est dans la zone normale. Continuez les repas variés et refaites la mesure à chaque visite.' }
}

export const MESSAGES_VOIX = [
  { id: 'vaccin', titre: 'Rappel de vaccination', texte: 'Bonjour. Le rendez-vous de vaccination de votre enfant approche. Apportez son carnet au centre de santé. La vaccination est gratuite.' },
  { id: 'jeu', titre: 'Le jeu du jour', texte: 'Aujourd’hui, jouez à cacher un jouet sous un tissu. Votre enfant le cherche, vous riez ensemble. Quelques minutes suffisent.' },
  { id: 'mains', titre: 'Se laver les mains', texte: 'Lavez les mains de l’enfant avec du savon avant de manger et après les toilettes. C’est simple et cela protège de la diarrhée.' },
  { id: 'alerte', titre: 'Signes d’alerte', texte: 'Si l’enfant a de la fièvre forte, respire difficilement, refuse de boire ou est très endormi, allez tout de suite au centre de santé.' },
  { id: 'acte', titre: 'L’acte de naissance', texte: 'Déclarez la naissance de votre enfant à la mairie dans les quarante-cinq jours. C’est gratuit, et cela donne accès à l’école et aux services.' },
]

export const LANGUES_VOIX = ['Français', 'Éwé', 'Kabiyè', 'Mina']
