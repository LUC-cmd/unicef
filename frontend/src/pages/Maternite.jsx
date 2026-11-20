import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { CENTRES, FACTEURS, MESSAGES_CONFIANCE, VILLAGES, aujourdhui, distanceKm, lienSms, rappelsNaissance, risqueGrossesse } from '../lib/parcours.js'

const CRECHES = [
  ['Crèche communautaire d’Agbélé (fictive)', 'Accueille les bébés dès 3 mois pendant les cours ou les travaux des mères'],
  ['Halte-garderie de Kpadapé (fictive)', 'Garde de jour, repas partagé, agente formée'],
]

function Risque() {
  const [age, setAge] = useState('')
  const [premiere, setPremiere] = useState(true)
  const [facteurs, setFacteurs] = useState([])
  const [village, setVillage] = useState('agbele')
  const r = risqueGrossesse({ age, premiere, facteurs })
  const centre = CENTRES.filter((c) => c.niveau >= r.lieu).map((c) => ({ ...c, km: distanceKm(village, c.village) })).sort((a, b) => a.km - b.km)[0]
  return (
    <section className="carte">
      <h2>Mon risque et mon lieu d’accouchement</h2>
      <p>Les premières causes de décès à l’accouchement sont connues : saignement, tension élevée, infection, travail bloqué. Plus le risque est repéré tôt, plus le lieu et le transport se préparent à l’avance. L’âge n’est pas conservé.</p>
      <div className="ado-champs">
        <label>Mon âge<input type="number" inputMode="numeric" min="10" max="55" value={age} onChange={(e) => setAge(e.target.value)} /></label>
        <label>Mon village<select value={village} onChange={(e) => setVillage(e.target.value)}>{VILLAGES.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}</select></label>
      </div>
      <label className="soin-case"><input type="checkbox" checked={premiere} onChange={(e) => setPremiere(e.target.checked)} /><span>C’est ma première grossesse</span></label>
      {FACTEURS.map(([id, lib]) => <label key={id} className="soin-case"><input type="checkbox" checked={facteurs.includes(id)} onChange={() => setFacteurs(facteurs.includes(id) ? facteurs.filter((x) => x !== id) : [...facteurs, id])} /><span>{lib}</span></label>)}
      <ResultatSoins niveau={r.niveau} titre={r.titre} texte={r.conseil}>
        {r.raisons.length > 0 && <p><b>Pourquoi :</b> {r.raisons.join(' ; ')}.</p>}
        {centre && <p><b>Lieu conseillé :</b> {centre.nom}, à environ {centre.km} km ({centre.services}).</p>}
      </ResultatSoins>
      <p className="petit">Règles simples à valider avec un professionnel. Cela ne remplace pas une consultation.</p>
    </section>
  )
}

function Preparer() {
  const [fait, setFait] = useState([])
  const ETAPES = ['Choisir le lieu d’accouchement avec la sage-femme', 'Décider du transport, et de qui conduit, avant le terme', 'Mettre de l’argent de côté, même un peu chaque semaine', 'Préparer le sac : carnet, linge propre, eau', 'Choisir une personne de confiance qui sera prévenue', 'Connaître les signes de danger et partir sans attendre']
  return (
    <section className="carte">
      <h2>Préparer l’accouchement</h2>
      <p>Beaucoup de décès viennent d’un retard : on part trop tard, ou on ne sait pas où aller. Ce plan se prépare bien avant le terme.</p>
      {ETAPES.map((e) => <label key={e} className="soin-case"><input type="checkbox" checked={fait.includes(e)} onChange={() => setFait(fait.includes(e) ? fait.filter((x) => x !== e) : [...fait, e])} /><span>{e}</span></label>)}
      <p><b>{fait.length} sur {ETAPES.length}</b> étapes préparées.</p>
      <p>Prévenir ma personne de confiance (ton téléphone choisit le contact, rien n’est enregistré) :</p>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        <a className="bouton secondaire" href={lienSms(MESSAGES_CONFIANCE.centre)}>Demander de l’aide pour aller au centre</a>
        <a className="bouton" href={lienSms(MESSAGES_CONFIANCE.urgence)}>URGENCE : prévenir maintenant</a>
      </p>
      <p>Besoin d’un avis pour savoir si c’est grave ? <Link to="/famille/adolescente">Mes signes de danger</Link>.</p>
    </section>
  )
}

function Apres() {
  const [naiss, setNaiss] = useState('')
  const r = naiss ? rappelsNaissance(naiss) : null
  return (
    <section className="carte">
      <h2>Après la naissance</h2>
      <p>La mère aussi doit être suivie : saignement, fièvre, tristesse qui dure. Un contrôle au centre dans les premiers jours protège la mère et le bébé.</p>
      <h3>Déclarer la naissance : délai de 45 jours</h3>
      <label>Date de naissance du bébé<input type="date" max={aujourdhui()} value={naiss} onChange={(e) => setNaiss(e.target.value)} /></label>
      {r && (
        <>
          <ResultatSoins niveau={r.niveau} titre={`Jour ${r.ecoules} sur 45`} texte={r.message} />
          <ul className="liste-coches">{r.jalons.map((j) => <li key={j.jour}>Rappel du jour {j.jour} ({j.date}) : {j.etat === 'passe' ? 'passé' : j.etat === 'aujourdhui' ? 'aujourd’hui' : 'à venir'}</li>)}</ul>
        </>
      )}
      <h3>Reprendre ses études, faire garder le bébé</h3>
      <p>Une jeune mère a le droit de poursuivre l’école. Une crèche communautaire permet de reprendre les cours ou un apprentissage.</p>
      <ul className="liste-coches">{CRECHES.map(([n, d]) => <li key={n}><b>{n}</b><br />{d}</li>)}</ul>
      <p><Link to="/nutrition">Trouver un nutritionniste ou une boutique partenaire</Link> pour la mère et le bébé.</p>
    </section>
  )
}

export default function Maternite() {
  const [onglet, setOnglet] = useState('risque')
  return (
    <>
      <Bandeau surtitre="De la grossesse à la reprise des études" titre="Un accouchement plus sûr">Repérer le risque tôt, préparer le lieu et le transport, suivre la mère et le bébé après la naissance.</Bandeau>
      <main className="page ado">
        <div className="borne-onglets" role="group" aria-label="Sections">
          {[['risque', 'Mon risque'], ['preparer', 'Préparer l’accouchement'], ['apres', 'Après la naissance']].map(([id, nom]) => <button key={id} type="button" className={onglet === id ? 'actif' : ''} aria-pressed={onglet === id} onClick={() => setOnglet(id)}>{nom}</button>)}
        </div>
        {onglet === 'risque' ? <Risque /> : onglet === 'preparer' ? <Preparer /> : <Apres />}
        <p className="petit">Démonstration avec des données fictives. Repères généraux, à valider par un professionnel de santé. Ce n’est pas un service officiel de l’UNICEF.</p>
      </main>
    </>
  )
}
