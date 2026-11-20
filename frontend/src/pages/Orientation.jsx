import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { CAS, SIGNES, VILLAGES, signesDepuisTexte } from '../lib/parcours.js'
import { orienterAvecAssistant, prevenirCentre } from '../lib/reseauClient.js'

export default function Orientation() {
  const [cas, setCas] = useState('grossesse')
  const [village, setVillage] = useState('agbele')
  const [signes, setSignes] = useState([])
  const [texte, setTexte] = useState('')
  const [res, setRes] = useState(null)
  const [envoi, setEnvoi] = useState(null)
  const [attente, setAttente] = useState(false)

  const analyser = async () => {
    setAttente(true); setEnvoi(null)
    const reperes = signesDepuisTexte(cas, texte)
    const tous = [...new Set([...signes, ...reperes])]
    setSignes(tous)
    setRes(await orienterAvecAssistant({ cas, signes: tous, village, texte }))
    setAttente(false)
  }
  const prevenir = async () => setEnvoi(await prevenirCentre({ centreId: res.centre.id, cas, niveau: res.niveau === 'urgent' ? 'urgent' : 'surveiller', signes: res.signes, depuis: village }))

  return (
    <>
      <Bandeau surtitre="Agents de santé" titre="Orienter un cas urgent">L’agent décrit le cas. L’assistant repère les signes de danger, propose le centre adapté le plus proche et le prévient avant l’arrivée.</Bandeau>
      <main className="page ado">
        <section className="carte">
          <h2>Décrire le cas</h2>
          <div className="ado-champs">
            <label>Type de cas<select value={cas} onChange={(e) => { setCas(e.target.value); setSignes([]); setRes(null) }}>{Object.entries(CAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Village où se trouve la personne<select value={village} onChange={(e) => setVillage(e.target.value)}>{VILLAGES.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}</select></label>
          </div>
          <label style={{ display: 'grid', gap: '.3rem' }}>Décrire la situation avec ses mots (facultatif)
            <textarea rows="2" maxLength={400} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Elle saigne depuis ce matin et a de la fièvre" />
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend><b>Signes observés</b></legend>
            {SIGNES[cas].map(([id, lib, g]) => (
              <label key={id} className="soin-case"><input type="checkbox" checked={signes.includes(id)} onChange={() => setSignes(signes.includes(id) ? signes.filter((x) => x !== id) : [...signes, id])} /><span>{lib}{g === 'urgent' ? ' (danger)' : ''}</span></label>
            ))}
          </fieldset>
          <p><button type="button" className="bouton" onClick={analyser} disabled={attente}>{attente ? 'Analyse…' : 'Analyser et orienter'}</button></p>
          {res && (
            <ResultatSoins niveau={res.niveau === 'urgent' ? 'urgent' : res.niveau === 'bon' ? 'bon' : 'signaler'} titre={res.titre} texte={res.texte}>
              {res.centre && (
                <div>
                  <p><b>Centre conseillé :</b> {res.centre.nom}, à environ {res.centre.km} km ({res.centre.services}).</p>
                  {!envoi && <button type="button" className="bouton" onClick={prevenir}>Prévenir le centre</button>}
                  {envoi?.ok && <p><b>Centre prévenu.</b> Le cas apparaît en priorité dans son tableau de bord.</p>}
                  {envoi?.gardee && <p><b>Pas de réseau pour le moment.</b> L’alerte est gardée sur cet appareil et partira dès que la connexion revient. En attendant, prévenir le centre par téléphone ou par un messager.</p>}
                  {envoi?.refuse && <p role="alert">L’alerte n’a pas pu être envoyée : {envoi.erreur}</p>}
                </div>
              )}
            </ResultatSoins>
          )}
          {res?.assistant && res.assistant.niveau !== 'INCONNU' && (
            <section className="carte" aria-label="Réponse de l’assistant">
              <h3>Ce que dit l’assistant Fil d’Or</h3>
              <p>{res.assistant.reponse}</p>
              <p className="petit">{res.assistant.limite}</p>
            </section>
          )}
          {res && <p className="petit">{res.source === 'assistant' ? 'Analyse faite par le service assistant.' : 'Service non joignable : analyse faite sur cet appareil, avec les mêmes règles.'}</p>}
        </section>
        <p>Un centre de santé reçoit les alertes dans son espace : <Link to="/reseau">se connecter</Link>.</p>
        <p className="petit">Règles simples, pas un diagnostic. Données fictives. Les signes et les niveaux de centres sont à valider avec le ministère de la Santé.</p>
      </main>
    </>
  )
}
