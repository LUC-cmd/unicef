import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

const SIGNES = [
  'Un enfant frappé, brûlé ou blessé de façon répétée, ou qui a peur d’un adulte',
  'Un enfant laissé seul trop longtemps, ou qui ne mange pas à sa faim',
  'Un enfant qui ne va plus à l’école ou qui est forcé de travailler',
  'Une fille ou un garçon victime de gestes ou de paroles à caractère sexuel',
  'Un mariage ou une grossesse forcés',
]

export default function Signalement() {
  return (
    <>
      <Bandeau surtitre="Protection de l'enfant" titre="Une situation inquiétante ?">
        Un enfant en danger ne doit pas attendre. Voici quoi faire, et qui prévenir.
      </Bandeau>
      <main className="page">
        <section className="carte attention">
          <h2>Danger immédiat</h2>
          <p>Mettre l'enfant à l'abri, puis appeler la police ou la gendarmerie, ou se rendre au centre de santé le plus proche si l'enfant est blessé.</p>
          <p>Ligne verte de protection de l'enfant au Togo : <b>Allô 1011</b>. <span className="petit">Numéro à confirmer auprès du ministère avant la mise en service.</span></p>
        </section>

        <section className="carte">
          <h2>Quels signes doivent alerter ?</h2>
          <ul className="liste-coches">{SIGNES.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        <section className="carte">
          <h2>Que fait un agent de santé ?</h2>
          <ol>
            <li>Il écoute l'enfant ou la famille sans juger, et sans promettre de garder le secret.</li>
            <li>Il note les faits, sans nom dans les messages : un code enfant suffit.</li>
            <li>Il prévient le centre social de la zone, qui est chargé de la protection de l'enfant.</li>
            <li>Il garde le lien avec la famille et vérifie que l'enfant est bien suivi.</li>
          </ol>
          <p className="petit">Le signalement enregistré dans Fil d'Or, relié au centre social de la zone, est prévu dans la prochaine version. La circuit exact doit être fixé avec le ministère chargé de la protection de l'enfant.</p>
        </section>

        <p><Link className="bouton" to="/annuaire">Trouver le centre social de la zone</Link></p>
      </main>
    </>
  )
}
