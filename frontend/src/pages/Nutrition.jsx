import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { itineraireVers, positionActuelle, trierParDistance } from '../lib/proximite.js'
import { BORNES, CONSEILS_ALIMENTAIRES, POINTS_NUTRITION, POUR, POUR_BOUTIQUE, VILLAGES, distanceKm } from '../lib/parcours.js'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'

const nomPoint = (id) => POINTS_NUTRITION.find((p) => p.id === id)?.nom ?? id

export default function Nutrition() {
  const [village, setVillage] = useState('agbele')
  const [pour, setPour] = useState('grossesse')
  const [conseil, setConseil] = useState('grossesse')
  const [produits, setProduits] = useState(null)
  const [envoi, setEnvoi] = useState(null)
  useEffect(() => { reseau.get('produits').then((r) => setProduits(r.produits)).catch(() => setProduits([])) }, [])
  const proches = POINTS_NUTRITION.map((p) => ({ ...p, km: distanceKm(village, p.village) })).sort((a, b) => a.km - b.km)
  const [moi, setMoi] = useState(null)
  const [geoErreur, setGeoErreur] = useState('')
  const localiser = () => { setGeoErreur(''); positionActuelle().then(setMoi).catch((e) => setGeoErreur(e.message)) }
  const prochesGeo = moi ? trierParDistance(moi, [...POINTS_NUTRITION, ...BORNES.map((b) => ({ ...b, offre: 'Produits de la carte, conseils, sans nom' }))]) : null
  const demander = async (p) => setEnvoi({ point: p.id, ...(await envoyerOuGarder('demandes', { pointId: p.id, pour, village })) })
  const valides = (produits ?? []).filter((x) => x.pour === conseil)
  return (
    <>
      <Bandeau surtitre="Bien manger pour grandir" titre="Réseau nutrition">Une femme enceinte ou un enfant est orienté vers un nutritionniste ou une boutique partenaire. Les produits des boutiques sont validés et contrôlés par les agents de santé.</Bandeau>
      <main className="page ado">
        <section className="carte">
          <h2>Trouver un point près de chez moi</h2>
          <div className="ado-champs">
            <label>Mon village<select value={village} onChange={(e) => setVillage(e.target.value)}>{VILLAGES.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}</select></label>
            <label>C’est pour<select value={pour} onChange={(e) => setPour(e.target.value)}>{Object.entries(POUR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <ul className="liste-coches">{proches.map((p) => <li key={p.id}><b>{p.nom}</b> · {p.type} · {p.km} km<br />{p.offre}<br /><button type="button" className="bouton secondaire" onClick={() => demander(p)}>Demander un suivi ici</button></li>)}</ul>
          <div className="geo-bloc">
            <button type="button" className="bouton" onClick={localiser}>Me localiser et trouver le plus proche</button>
            {geoErreur && <p role="alert">{geoErreur}</p>}
            {prochesGeo && (
              <ul className="liste-coches" aria-label="Lieux classés par distance">
                {prochesGeo.map((p) => <li key={p.id}><b>{p.nom}</b> · {p.type} · à {p.km} km à vol d’oiseau<br />{p.offre}<br /><a className="bouton secondaire" href={itineraireVers(p)} target="_blank" rel="noopener noreferrer">M’y rendre à pied</a></li>)}
              </ul>
            )}
            <p className="petit">Ta position reste sur ton téléphone : elle sert seulement à classer les lieux et n’est jamais envoyée. Positions des lieux fictives dans cette démonstration.</p>
          </div>
          {envoi?.ok && <p role="status"><b>Demande envoyée</b> à {nomPoint(envoi.point)}. Sans nom : seulement le village et la raison.</p>}
          {envoi?.gardee && <p role="status"><b>Pas de réseau pour le moment.</b> Ta demande est gardée sur ce téléphone et partira dès que la connexion revient.</p>}
          {envoi?.refuse && <p role="alert">La demande n’a pas pu partir : {envoi.erreur}</p>}
        </section>
        <section className="carte">
          <h2>Quoi manger, et où l’acheter</h2>
          <label>Pour<select value={conseil} onChange={(e) => setConseil(e.target.value)}>{Object.entries(POUR_BOUTIQUE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <h3>Repères alimentaires</h3>
          <ul className="liste-coches">{CONSEILS_ALIMENTAIRES[conseil].map((x) => <li key={x}>{x}</li>)}</ul>
          <h3>Produits validés par les agents de santé</h3>
          {produits === null ? <p>Chargement…</p> : valides.length === 0 ? <p>Aucun produit validé pour l’instant{produits.length === 0 ? ' (ou pas de réseau)' : ''}.</p> : (
            <ul className="liste-coches">{valides.map((x) => <li key={x.id}><b>{x.nom}</b> · {x.prix || 'prix non indiqué'}<br />{x.description}<br /><small>{nomPoint(x.pointId)}</small></li>)}</ul>
          )}
          <p className="petit">Repères alimentaires généraux. Le nutritionniste adapte selon la personne. Les produits proposés par une boutique n’apparaissent ici qu’après validation d’un agent de santé.</p>
        </section>
        <p>Vous tenez une boutique ou vous êtes agent de santé ? <Link to="/reseau">Ouvrir votre espace</Link>.</p>
        <p className="petit">Démonstration avec des données fictives. Points et boutiques inventés pour montrer le fonctionnement.</p>
      </main>
    </>
  )
}
