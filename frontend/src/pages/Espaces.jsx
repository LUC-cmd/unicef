import { Navigate, Route, Routes } from 'react-router-dom'
import Shell from '../components/Shell.jsx'
import Agent from './Agent.jsx'
import CarteFamille from './CarteFamille.jsx'
import Inscription from './Inscription.jsx'
import Annuaire from './Annuaire.jsx'
import Mairie from './Mairie.jsx'
import Structure from './Structure.jsx'
import CrecheGestion from './CrecheGestion.jsx'
import CrecheTableau from './CrecheTableau.jsx'
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import Carte from './Carte.jsx'
import Admin from './Admin.jsx'
import Aide from './Aide.jsx'
import ActeNaissance from './ActeNaissance.jsx'
import Fragiles from './Fragiles.jsx'
import VerifierQr from './VerifierQr.jsx'

/** Chaque rôle a son espace : un menu vertical, une barre en haut, et des vues qui marchent. */

export function EspaceAgent() {
  const groupes = [
    { titre: 'Mon travail', liens: [
      { to: '/agent', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/agent/visites', nom: 'Mes visites', icone: 'liste' },
      { to: '/agent/familles', nom: 'Familles', icone: 'carnet' },
      { to: '/agent/inscription', nom: 'Inscrire une famille', icone: 'plus' },
      { to: '/agent/carte', nom: 'Carnet de famille', icone: 'carnet' },
      { to: '/agent/fragiles', nom: 'Nouveau-nés fragiles', icone: 'bouclier' },
      { to: '/agent/acte', nom: 'Actes de naissance', icone: 'livre' },
    ] },
    { titre: 'Outils', liens: [
      { to: '/agent/verifier-qr', nom: 'Vérifier un QR', icone: 'bouclier' },
      { to: '/agent/annuaire', nom: 'Annuaire', icone: 'batiment' },
    ] },
    { titre: 'Hors réseau', liens: [{ to: '/agent/synchronisation', nom: 'Clé USB et envoi', icone: 'cle' }] },
  ]
  return (
    <Shell titre="Agent de santé" teinte="vert" groupes={groupes}>
      <Routes>
        <Route index element={<Agent vue="tableau" />} />
        <Route path="visites" element={<Agent vue="visites" />} />
        <Route path="familles" element={<Agent vue="familles" />} />
        <Route path="inscription" element={<Inscription />} />
        <Route path="carte" element={<CarteFamille />} />
        <Route path="synchronisation" element={<Agent vue="synchronisation" />} />
        <Route path="annuaire" element={<Annuaire />} />
        <Route path="acte" element={<ActeNaissance />} />
        <Route path="fragiles" element={<Fragiles />} />
        <Route path="verifier-qr" element={<VerifierQr />} />
        <Route path="*" element={<Navigate to="/agent" replace />} />
      </Routes>
    </Shell>
  )
}

export function EspaceMairie() {
  const groupes = [
    { titre: 'État civil', liens: [
      { to: '/mairie', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/mairie/declarations', nom: 'Déclarations', icone: 'liste' },
      { to: '/mairie/actes', nom: 'Actes à retirer', icone: 'livre' },
      { to: '/mairie/nationalite', nom: 'Nationalité', icone: 'bouclier' },
      { to: '/mairie/preuve', nom: 'Vérifier une preuve', icone: 'bouclier' },
    ] },
    { titre: 'Ressources', liens: [
      { to: '/mairie/acte', nom: 'Sans acte de naissance', icone: 'aide' },
      { to: '/mairie/annuaire', nom: 'Annuaire', icone: 'batiment' },
    ] },
  ]
  return (
    <Shell titre="État civil" teinte="bleu" groupes={groupes}>
      <Routes>
        <Route index element={<Mairie vue="tableau" />} />
        <Route path="declarations" element={<Mairie vue="declarations" />} />
        <Route path="actes" element={<Mairie vue="actes" />} />
        <Route path="nationalite" element={<Mairie vue="nationalite" />} />
        <Route path="preuve" element={<Mairie vue="preuve" />} />
        <Route path="annuaire" element={<Annuaire />} />
        <Route path="acte" element={<ActeNaissance />} />
        <Route path="*" element={<Navigate to="/mairie" replace />} />
      </Routes>
    </Shell>
  )
}

/** Un compte de crèche voit le tableau de bord de la crèche ; les autres structures gardent le leur. */
function AccueilStructure() {
  const [creche, setCreche] = useState(null)
  useEffect(() => { api.get('/api/structure/creche').then(() => setCreche(true)).catch(() => setCreche(false)) }, [])
  if (creche === null) return null
  return creche ? <CrecheTableau /> : <Structure vue="tableau" />
}

export function EspaceStructure() {
  const groupes = [
    { titre: 'Ma structure', liens: [
      { to: '/structure', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/structure/demandes', nom: 'Demandes des familles', icone: 'boite' },
      { to: '/structure/creche', nom: 'Réservations', icone: 'boite' },
      { to: '/structure/fiche', nom: 'Mes informations', icone: 'batiment' },
    ] },
    { titre: 'Outils', liens: [
      { to: '/structure/verifier-qr', nom: 'Vérifier un QR', icone: 'bouclier' },
      { to: '/structure/annuaire', nom: "Voir l'annuaire", icone: 'carte' },
    ] },
  ]
  return (
    <Shell titre="Structure d'accueil" teinte="orange" groupes={groupes}>
      <Routes>
        <Route index element={<AccueilStructure />} />
        <Route path="demandes" element={<Structure vue="demandes" />} />
        <Route path="creche" element={<CrecheGestion />} />
        <Route path="fiche" element={<Structure vue="fiche" />} />
        <Route path="verifier-qr" element={<VerifierQr />} />
        <Route path="annuaire" element={<Annuaire />} />
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
      { to: '/carte/ruptures', nom: 'Ruptures de parcours', icone: 'graphe' },
      { to: '/carte/actes', nom: 'Actes de naissance', icone: 'livre' },
    ] },
  ]
  return (
    <Shell titre="Responsable régional" teinte="cyan" groupes={groupes}>
      <Routes>
        <Route index element={<Carte vue="tableau" />} />
        <Route path="carte" element={<Carte vue="carte" />} />
        <Route path="zones" element={<Carte vue="zones" />} />
        <Route path="actes" element={<Carte vue="actes" />} />
        <Route path="ruptures" element={<Carte vue="ruptures" />} />
        <Route path="*" element={<Navigate to="/carte" replace />} />
      </Routes>
    </Shell>
  )
}

export function EspaceAdmin() {
  const groupes = [
    { titre: 'Administration', liens: [
      { to: '/admin', nom: 'Tableau de bord', icone: 'accueil', fin: true },
      { to: '/admin/cles', nom: 'Clés USB', icone: 'cle' },
      { to: '/admin/horloge', nom: 'Horloge', icone: 'horloge' },
      { to: '/admin/acces', nom: 'Comptes', icone: 'bouclier' },
      { to: '/admin/langues', nom: 'Messages et langues', icone: 'livre' },
      { to: '/admin/securite', nom: 'Cybersécurité', icone: 'bouclier' },
    ] },
    { titre: 'Voir comme…', liens: [
      { to: '/agent', nom: 'Agent de santé', icone: 'liste' },
      { to: '/mairie', nom: 'État civil', icone: 'livre' },
      { to: '/carte', nom: 'Responsable régional', icone: 'carte' },
    ] },
  ]
  return (
    <Shell titre="Administrateur" teinte="nuit" groupes={groupes}>
      <Routes>
        <Route index element={<Admin vue="services" />} />
        <Route path="cles" element={<Admin vue="cles" />} />
        <Route path="horloge" element={<Admin vue="horloge" />} />
        <Route path="acces" element={<Admin vue="acces" />} />
        <Route path="langues" element={<Admin vue="langues" />} />
        <Route path="securite" element={<Admin vue="securite" />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Shell>
  )
}
