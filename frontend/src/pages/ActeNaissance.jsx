import { useSearchParams } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import CheminActe from '../components/CheminActe.jsx'

export default function ActeNaissance() {
  const [params] = useSearchParams()
  const naissance = /^\d{4}-\d{2}-\d{2}$/.test(params.get('naissance') || '') ? params.get('naissance') : ''
  return (
    <main className="page">
      <Bandeau surtitre="Droit à l'identité" titre="Obtenir un acte de naissance">
        Un enfant a droit à un nom et à une nationalité. Répondez à 3 questions : le site indique le bon chemin, sans demander aucun nom.
      </Bandeau>
      <CheminActe dateInitiale={naissance} />
    </main>
  )
}
