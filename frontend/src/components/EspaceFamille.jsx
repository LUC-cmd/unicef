import Shell from './Shell.jsx'
import { lireCompte } from '../lib/famille.js'

/** Cadre de l'espace famille : le même menu vertical que les autres espaces, avec tout à portée. */
export default function EspaceFamille({ aRepondre = 0, children }) {
  const compte = lireCompte()
  const groupes = [
    { titre: 'Mon espace', liens: [
      { to: '/famille', nom: 'Accueil', icone: 'accueil', fin: true },
      { to: '/famille/messages', nom: 'Messages', icone: 'boite', badge: aRepondre > 0 ? aRepondre : null },
      { to: '/famille/dossier', nom: 'Dossier de naissance', icone: 'carnet' },
      { to: '/famille/compte', nom: 'Mon compte', icone: 'bouclier' },
    ] },
    { titre: 'Crèches', liens: [
      { to: '/famille/lieux', nom: 'Crèches près de moi', icone: 'carte' },
      { to: '/famille/creche', nom: 'Réserver une place', icone: 'horloge' },
    ] },
    { titre: 'Pour mon enfant', liens: [
      { to: '/famille/grossesse', nom: 'Ma grossesse', icone: 'coeur' },
      { to: '/famille/developpement', nom: 'Mon enfant avance-t-il bien ?', icone: 'graphe' },
      { to: '/famille/bras', nom: 'Mesure du bras', icone: 'ruban' },
      { to: '/famille/jeux', nom: 'Jeux et vidéos', icone: 'jeu' },
      { to: '/famille/assistant', nom: 'Poser une question', icone: 'bulle' },
      { to: '/famille/acte', nom: 'Acte de naissance', icone: 'livre' },
    ] },
    { titre: 'Pour moi', liens: [
      { to: '/famille/bien-etre', nom: 'Comment je vais, moi ?', icone: 'soleil' },
      { to: '/famille/voix', nom: 'Messages parlés', icone: 'micro' },
    ] },
  ]
  return <Shell titre="Espace famille" teinte="orange" groupes={groupes} nom={compte ? `Famille ${compte.codeFamille}` : 'Famille'} utilisateur={compte ? `famille-${compte.codeFamille}` : undefined} sous="Espace famille">{children}</Shell>
}
