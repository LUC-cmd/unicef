import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

// Contenus de repère à valider avec le ministère de la Santé et des spécialistes de la petite enfance.
const MODULES = [
  { id: 'sante', titre: 'Santé : reconnaître le danger', points: [
    'Fièvre, respiration rapide, refus de boire, convulsions, grande faiblesse : appeler la famille et conduire l’enfant au centre de santé sans attendre.',
    'Vérifier le carnet à l’arrivée : un vaccin en retard est signalé à la famille et à l’agent.',
    'Un enfant malade reste à la maison ou est confié au centre de santé ; on ne donne aucun médicament sans avis.'] },
  { id: 'nutrition', titre: 'Nutrition : bien nourrir', points: [
    'De 6 à 24 mois : bouillie enrichie (arachide, œuf, poisson, feuilles vertes), 3 à 4 repas par jour, avec le lait maternel.',
    'Mesurer le bras au ruban chaque mois : rouge ou orange, orienter vers le centre de santé.',
    'De l’eau propre à boire, des mains lavées avant chaque repas.'] },
  { id: 'eveil', titre: 'Éveil : jouer pour grandir', points: [
    'Un jeu par jour avec des objets de la maison : cacher et retrouver, trier des graines, empiler des boîtes.',
    'Parler, chanter, raconter une histoire en langue locale : c’est le meilleur exercice du langage.',
    'Jouer par terre, dehors si possible, avec un adulte qui regarde et répond.'] },
  { id: 'hygiene', titre: 'Hygiène : un lieu propre', points: [
    'Se laver les mains au savon : en arrivant, avant de manger, après les toilettes.',
    'Eau stockée dans un récipient couvert ; gobelets propres, jamais partagés au même moment.',
    'Un coin pour les couches et les pots, nettoyé chaque jour.'] },
  { id: 'protection', titre: 'Protection : un lieu sûr', points: [
    'Un enfant n’est remis qu’à un adulte connu de la famille. Aucune photo sans accord.',
    'Aucun châtiment corporel. Une marque, une peur, un silence inhabituel : en parler au centre social.',
    'Moins de 15 enfants par adulte formé, et jamais un enfant seul.'] },
]

const CLE = 'fildor.creche.modules'
function lire() { try { return JSON.parse(localStorage.getItem(CLE) || '[]') } catch { return [] } }

export default function Creches() {
  const [faits, setFaits] = useState(lire)
  const [ouvert, setOuvert] = useState('sante')
  function basculer(id) {
    const n = faits.includes(id) ? faits.filter((x) => x !== id) : [...faits, id]
    setFaits(n)
    try { localStorage.setItem(CLE, JSON.stringify(n)) } catch { /* sans stockage */ }
  }
  return (
    <>
      <Bandeau surtitre="Dans la communauté" titre="Crèches solidaires : formation des femmes leaders">
        Cinq fiches courtes sur la santé, la nutrition, l'éveil, l'hygiène et la protection. Elles se lisent sur un téléphone.
      </Bandeau>
      <main className="page">
        <section className="carte" aria-labelledby="t-progres-creche">
          <h2 id="t-progres-creche">Ma formation : {faits.length} fiche(s) sur {MODULES.length}</h2>
          <div className="rupture-barre"><i style={{ width: `${(100 * faits.length) / MODULES.length}%`, background: '#00833d' }} /></div>
          {faits.length === MODULES.length && <p><b>Bravo : toutes les fiches sont lues.</b> Montrez cette page à l'agent de santé pour le point de suivi.</p>}
        </section>
        {MODULES.map((m) => (
          <section className="carte" key={m.id}>
            <h2><button type="button" className="accordeon" aria-expanded={ouvert === m.id} onClick={() => setOuvert(ouvert === m.id ? '' : m.id)}>{m.titre}</button></h2>
            {ouvert === m.id && (
              <>
                <ul className="liste-coches">{m.points.map((p) => <li key={p}>{p}</li>)}</ul>
                <label className="case"><input type="checkbox" checked={faits.includes(m.id)} onChange={() => basculer(m.id)} /><span>J'ai lu et compris cette fiche</span></label>
              </>
            )}
          </section>
        ))}
        <section className="carte">
          <h2>Le cahier de la journée</h2>
          <p>Une feuille à imprimer chaque matin : le nombre d'enfants, les repas servis, les jeux faits, les enfants malades, et les 300 FCFA par enfant reçus. Aucun nom d'enfant : un numéro de carnet suffit.</p>
          <p><button type="button" className="bouton secondaire" onClick={() => window.print()}>Imprimer la page</button> <Link className="bouton secondaire" to="/annuaire">Trouver une crèche ou un jardin d'enfants</Link></p>
          <p className="petit">Ces fiches sont des repères et doivent être validées par le ministère de la Santé et des spécialistes de la petite enfance avant diffusion.</p>
        </section>
      </main>
    </>
  )
}
