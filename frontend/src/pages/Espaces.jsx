import { Navigate, Route, Routes } from 'react-router-dom'
import Shell from '../components/Shell.jsx'
import Agent from './Agent.jsx'
import Inscription from './Inscription.jsx'
import Annuaire from './Annuaire.jsx'
import Mairie from './Mairie.jsx'
import Structure from './Structure.jsx'
import Carte from './Carte.jsx'
import Admin from './Admin.jsx'
import Aide from './Aide.jsx'
import ActeNaissance from './ActeNaissance.jsx'

/** Chaque rôle a son espace : un menu vertical, une barre en haut, et des vues qui marchent. */

export function EspaceAgent() {
  const groupes = [
    { titre: 'Mon travail', liens: [
      { to: '/agent', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/agent/visites', nom: 'Mes visites', icone: 'liste' },
      { to: '/agent/inscription', nom: 'Inscrire une famille', icone: 'plus' },
      { to: '/agent/acte', nom: 'Obtenir un acte de naissance', icone: 'livre' },
    ] },
    { titre: 'Sans réseau', liens: [{ to: '/agent/synchronisation', nom: 'Synchronisation et clé USB', icone: 'cle' }] },
    { titre: 'Ressources', liens: [
      { to: '/agent/annuaire', nom: 'Annuaire des structures', icone: 'batiment' },
      { to: '/agent/aide', nom: 'Comprendre cet espace', icone: 'aide' },
    ] },
  ]
  return (
    <Shell titre="Agent de santé" groupes={groupes}>
      <Routes>
        <Route index element={<Agent vue="tableau" />} />
        <Route path="visites" element={<Agent vue="visites" />} />
        <Route path="inscription" element={<Inscription />} />
        <Route path="synchronisation" element={<Agent vue="synchronisation" />} />
        <Route path="annuaire" element={<Annuaire />} />
        <Route path="acte" element={<ActeNaissance />} />
        <Route path="aide" element={<Aide role="AGENT" />} />
        <Route path="*" element={<Navigate to="/agent" replace />} />
      </Routes>
    </Shell>
  )
}

export function EspaceMairie() {
  const groupes = [
    { titre: 'État civil', liens: [
      { to: '/mairie', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/mairie/declarations', nom: 'Déclarations de naissance', icone: 'liste' },
      { to: '/mairie/actes', nom: 'Actes à retirer', icone: 'livre' },
      { to: '/mairie/preuve', nom: 'Vérifier une preuve', icone: 'bouclier' },
      { to: '/mairie/acte', nom: 'Naissance non déclarée ?', icone: 'aide' },
    ] },
    { titre: 'Ressources', liens: [
      { to: '/mairie/annuaire', nom: 'Annuaire des structures', icone: 'batiment' },
      { to: '/mairie/aide', nom: 'Comprendre cet espace', icone: 'aide' },
    ] },
  ]
  return (
    <Shell titre="État civil" groupes={groupes}>
      <Routes>
        <Route index element={<Mairie vue="tableau" />} />
        <Route path="declarations" element={<Mairie vue="declarations" />} />
        <Route path="actes" element={<Mairie vue="actes" />} />
        <Route path="preuve" element={<Mairie vue="preuve" />} />
        <Route path="annuaire" element={<Annuaire />} />
        <Route path="acte" element={<ActeNaissance />} />
        <Route path="aide" element={<Aide role="MAIRIE" />} />
        <Route path="*" element={<Navigate to="/mairie" replace />} />
      </Routes>
    </Shell>
  )
}

export function EspaceStructure() {
  const groupes = [
    { titre: 'Ma structure', liens: [
      { to: '/structure', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/structure/demandes', nom: 'Demandes des familles', icone: 'boite' },
      { to: '/structure/fiche', nom: 'Mes informations', icone: 'batiment' },
    ] },
    { titre: 'Ressources', liens: [
      { to: '/structure/annuaire', nom: "Voir l'annuaire", icone: 'carte' },
      { to: '/structure/aide', nom: 'Comprendre cet espace', icone: 'aide' },
    ] },
  ]
  return (
    <Shell titre="Structure d'accueil" groupes={groupes}>
      <Routes>
        <Route index element={<Structure vue="tableau" />} />
        <Route path="demandes" element={<Structure vue="demandes" />} />
        <Route path="fiche" element={<Structure vue="fiche" />} />
        <Route path="annuaire" element={<Annuaire />} />
        <Route path="aide" element={<Aide role="STRUCTURE" />} />
        <Route path="*" element={<Navigate to="/structure" replace />} />
      </Routes>
    </Shell>
  )
}

export function EspaceDecideur() {
  const groupes = [
    { titre: 'Pilotage', liens: [
      { to: '/carte', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/carte/carte', nom: 'Carte des zones', icone: 'carte' },
      { to: '/carte/zones', nom: 'Comparer les zones', icone: 'graphe' },
      { to: '/carte/actes', nom: 'Actes de naissance', icone: 'livre' },
    ] },
    { titre: 'Ressources', liens: [{ to: '/carte/aide', nom: 'Comprendre cet espace', icone: 'aide' }] },
  ]
  return (
    <Shell titre="Responsable régional" groupes={groupes}>
      <Routes>
        <Route index element={<Carte vue="tableau" />} />
        <Route path="carte" element={<Carte vue="carte" />} />
        <Route path="zones" element={<Carte vue="zones" />} />
        <Route path="actes" element={<Carte vue="actes" />} />
        <Route path="aide" element={<Aide role="DECIDEUR" />} />
        <Route path="*" element={<Navigate to="/carte" replace />} />
      </Routes>
    </Shell>
  )
}

export function EspaceAdmin() {
  const groupes = [
    { titre: 'Administration', liens: [
      { to: '/admin', nom: 'Coulisses', icone: 'accueil', fin: true },
      { to: '/admin/cles', nom: 'Recevoir les clés USB', icone: 'cle' },
      { to: '/admin/horloge', nom: 'Horloge de démonstration', icone: 'horloge' },
      { to: '/admin/acces', nom: 'Espaces et comptes', icone: 'bouclier' },
    ] },
    { titre: 'Voir comme…', liens: [
      { to: '/agent', nom: 'Agent de santé', icone: 'liste' },
      { to: '/mairie', nom: 'État civil', icone: 'livre' },
      { to: '/carte', nom: 'Responsable régional', icone: 'carte' },
    ] },
  ]
  return (
    <Shell titre="Administrateur" groupes={groupes}>
      <Routes>
        <Route index element={<Admin vue="services" />} />
        <Route path="cles" element={<Admin vue="cles" />} />
        <Route path="horloge" element={<Admin vue="horloge" />} />
        <Route path="acces" element={<Admin vue="acces" />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Shell>
  )
}
