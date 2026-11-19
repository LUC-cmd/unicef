import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'

const QUESTIONS = ['Au cours du dernier mois, vous êtes-vous sentie souvent triste, sans énergie ou sans espoir ?', 'Au cours du dernier mois, avez-vous eu peu d’intérêt ou de plaisir à faire les choses que vous aimez ?']

/** Deux questions pour les mères : une mère épuisée ne peut pas toujours jouer et veiller sur son enfant. Rien n'est enregistré. */
export default function BienEtreMere() {
  const [rep, setRep] = useState({})
  const fini = QUESTIONS.every((_, i) => rep[i] !== undefined)
  const oui = QUESTIONS.some((_, i) => rep[i] === true)
  return (
    <>
      <Bandeau surtitre="Pour moi" titre="Comment je vais, moi ?">Après une naissance, beaucoup de mères sont fatiguées ou tristes. En parler aide la mère, et aide l’enfant. Vos réponses ne sont pas enregistrées.</Bandeau>
      <main className="page soins">
        <section className="carte">
          <ul className="soin-questions">
            {QUESTIONS.map((q, i) => (
              <li key={q}>
                <p>{q}</p>
                <div className="soin-choix" role="group" aria-label={q}>
                  <button type="button" className={rep[i] === true ? 'actif' : ''} aria-pressed={rep[i] === true} onClick={() => setRep({ ...rep, [i]: true })}>Oui</button>
                  <button type="button" className={rep[i] === false ? 'actif' : ''} aria-pressed={rep[i] === false} onClick={() => setRep({ ...rep, [i]: false })}>Non</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        {fini && (oui
          ? <ResultatSoins niveau="signaler" titre="Parlez-en à quelqu’un" texte="Ce que vous ressentez est fréquent et peut s’améliorer. Parlez-en à votre agent de santé ou à une personne de confiance de votre famille. Si vous pensez à vous faire du mal, ou si vous ne vous sentez pas en sécurité, allez tout de suite au centre de santé le plus proche ou appelez un proche pour qu’il vienne." />
          : <ResultatSoins niveau="bon" titre="Prenez soin de vous aussi" texte="Reposez-vous quand votre enfant dort, mangez bien et demandez de l’aide à votre entourage. Si cela change, revenez ici ou parlez-en à votre agent de santé." />)}
        <p className="petit">Deux questions de repérage courantes, à faire valider par un professionnel de santé. Ce n’est pas un diagnostic.</p>
      </main>
    </>
  )
}
