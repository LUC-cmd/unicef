import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { SIGNES_ENFANT_ORANGE, SIGNES_ENFANT_ROUGE, SIGNES_NOUVEAU_NE, lireEnfantMalade, lireNouveauNe } from '../lib/adolescente.js'

function Liste({ signes, cochees, bascule }) {
  return <ul className="ado-signes">{signes.map((s) => <li key={s.id}><label className="soin-case"><input type="checkbox" checked={cochees.includes(s.id)} onChange={() => bascule(s.id)} /> {s.texte}</label></li>)}</ul>
}
/** Le résultat reste en haut de l'écran, visible dès qu'on coche un signe ; en cas d'urgence, un bouton mène au centre le plus proche. */
function ResultatEnHaut({ r, nb }) {
  const urgent = r.niveau === 'urgent' || r.niveau === 'rouge'
  return (
    <div className="resultat-collant">
      <ResultatSoins {...r}>
        <p className="petit">{nb === 0 ? 'Aucun signe coché pour l’instant.' : `${nb} signe${nb > 1 ? 's' : ''} coché${nb > 1 ? 's' : ''}.`}</p>
        {urgent && <Link className="bouton" to="/annuaire">Trouver le centre de santé le plus proche</Link>}
      </ResultatSoins>
    </div>
  )
}
function useCoches() {
  const [c, setC] = useState([])
  return [c, (id) => setC((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))]
}

/** Nouveau-né : un seul signe de danger suffit à partir tout de suite. */
export function SignesNouveauNe() {
  const [c, b] = useCoches()
  return (
    <>
      <Bandeau surtitre="Pour mon enfant" titre="Mon nouveau-né : signes de danger">Pendant le premier mois, un bébé peut s’aggraver très vite. Coche ce que tu vois chez ton bébé.</Bandeau>
      <main className="page soins">
        <ResultatEnHaut r={lireNouveauNe(c)} nb={c.length} />
        <section className="carte"><Liste signes={SIGNES_NOUVEAU_NE} cochees={c} bascule={b} /></section>
        <p className="petit">Repères courants (OMS), à faire valider par un professionnel de santé. Ce n’est pas un diagnostic.</p>
      </main>
    </>
  )
}

/** Enfant malade de 2 mois à 5 ans : repères inspirés de la PCIME. */
export function EnfantMalade() {
  const [c, b] = useCoches()
  return (
    <>
      <Bandeau surtitre="Pour mon enfant" titre="Mon enfant est malade">Pour un enfant de 2 mois à 5 ans. Quelques questions simples pour savoir s’il faut aller au centre de santé tout de suite.</Bandeau>
      <main className="page soins">
        <ResultatEnHaut r={lireEnfantMalade(c)} nb={c.length} />
        <section className="carte"><h2>Signes de danger</h2><Liste signes={SIGNES_ENFANT_ROUGE} cochees={c} bascule={b} /></section>
        <section className="carte"><h2>Autres signes</h2><Liste signes={SIGNES_ENFANT_ORANGE} cochees={c} bascule={b} /></section>
        <p className="petit">Repères inspirés de la PCIME (OMS et UNICEF), à faire valider par un professionnel de santé. Ce n’est pas un diagnostic et cela ne remplace pas l’agent de santé.</p>
      </main>
    </>
  )
}
