import Bandeau from '../components/Bandeau.jsx'
import GuideRole from '../components/GuideRole.jsx'

/** Page « Comprendre cet espace » : qui se connecte, ce qu'il saisit, ce qu'il voit, où partent les données. */
export default function Aide({ role }) {
  return (
    <main className="page">
      <Bandeau surtitre="Aide" titre="Comprendre cet espace">Ce que vous enregistrez, ce que vous voyez, et où partent les données.</Bandeau>
      <GuideRole role={role} />
    </main>
  )
}
