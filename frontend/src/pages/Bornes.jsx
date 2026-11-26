import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'
import { useDonnees } from './Suivi.jsx'

const ETATS = { ok: ['En ordre', 'ok'], 'stock-bas': ['Stock bas', 'moyen'], 'a-visiter': ['À visiter', 'urgent'] }
const PROBLEMES = { regles: 'Règles douloureuses ou sans protection', protection: 'Se protéger', produits: 'Produits introuvables près de chez elle', info: 'Manque d’informations', autre: 'Autre' }
const UTILE = { oui: 'Oui', peu: 'Un peu', non: 'Non' }
const LIEUX = { lycee: 'Lycée ou université', gare: 'Gare routière', pharmacie: 'Pharmacie', marche: 'Marché', quartier: 'Commerce de quartier', jeunes: 'Maison des jeunes', toilettes: 'Toilettes publiques', centre: 'Centre de santé', ecole: 'École' }
const VILLES = ['Lomé', 'Tsévié', 'Aného', 'Kpalimé', 'Atakpamé', 'Sokodé', 'Bassar', 'Kara', 'Dapaong']
const VILLAGES = [['agbele', 'Agbélé'], ['davie', 'Davié'], ['kpadape', 'Kpadapé'], ['tovegan', 'Tovégan'], ['zogbedji', 'Zogbédji']]
const RESEAU = { aucun: 'Aucun réseau : relève sur place ou par fichier', '2G': 'Réseau 2G', '3G': 'Réseau 3G' }

/** Barres horizontales fines : une ligne par réponse, avec le nombre et la part. */
function Repartition({ titre, valeurs, noms }) {
  const total = Object.values(valeurs).reduce((a, b) => a + b, 0) || 1
  const lignes = Object.entries(valeurs).sort((a, b) => b[1] - a[1])
  return (
    <figure className="repartition">
      <figcaption><b>{titre}</b></figcaption>
      {lignes.map(([k, n]) => (
        <div key={k} className="rep-ligne"><span>{noms[k] ?? k}</span><i style={{ '--p': `${Math.round((100 * n) / total)}%` }} aria-hidden="true" /><b>{Math.round((100 * n) / total)} % <small>({n})</small></b></div>
      ))}
    </figure>
  )
}

function Borne({ b, produits, jeton, fin }) {
  const [mode, setMode] = useState('')
  const [stock, setStock] = useState(b.stock)
  const [retraits, setRetraits] = useState(0)
  const [ajout, setAjout] = useState({})
  const [msg, setMsg] = useState('')
  const [ep, setEp] = useState(false)
  const envoyer = async (action, corps) => {
    setEp(true)
    const r = await envoyerOuGarder(`bornes/${b.id}/${action}`, corps)
    setEp(false)
    setMsg(r.ok ? 'Enregistré.' : r.gardee ? 'Pas de réseau : gardé sur cet appareil, il partira dès que la connexion revient (ou par fichier chiffré).' : r.erreur)
    if (r.ok) { setMode(''); fin() }
  }
  const [lib, cl] = ETATS[b.etat]
  return (
    <article className={`borne-carte ${cl}`}>
      <header>
        <h3>{b.nom}</h3>
        <span className={`pastille-b ${cl}`}>{lib}</span>
      </header>
      <p className="petit">{b.lieu} · {b.zone === 'ville' ? 'en ville' : 'village'} de {b.village} · {RESEAU[b.reseau]} · dernière relève il y a {b.ageReleveJours < 1 ? 'moins d’un jour' : `${Math.round(b.ageReleveJours)} jour(s)`}</p>
      <ul className="stock-barres">
        {Object.entries(produits).map(([k, nom]) => (
          <li key={k} className={b.stock[k] <= 10 ? 'bas' : ''}><span>{nom}</span><i style={{ '--p': `${Math.min(100, b.stock[k])}%` }} aria-hidden="true" /><b>{b.stock[k]}</b></li>
        ))}
      </ul>
      {b.alertes.length > 0 && <ul className="liste-coches alerte-liste">{b.alertes.map((a) => <li key={a}>{a}</li>)}</ul>}
      <div className="boutons-ligne">
        <button type="button" className="bouton" onClick={() => { setMode(mode === 'releve' ? '' : 'releve'); setMsg('') }}>Enregistrer une relève</button>
        <button type="button" className="bouton secondaire" onClick={() => { setMode(mode === 'recharge' ? '' : 'recharge'); setMsg('') }}>Recharger le stock</button>
      </div>
      {mode === 'releve' && (
        <form className="ado-champs" onSubmit={(e) => { e.preventDefault(); envoyer('releve', { stock, retraits: Number(retraits) || 0 }) }}>
          <p className="petit">Ce que la borne affiche en trappe d’entretien : le stock restant et le nombre de retraits depuis la dernière relève. Aucune donnée personnelle.</p>
          {Object.entries(produits).map(([k, nom]) => <label key={k}>{nom} restants<input type="number" min="0" value={stock[k]} onChange={(e) => setStock({ ...stock, [k]: Number(e.target.value) })} /></label>)}
          <label>Retraits depuis la dernière relève<input type="number" min="0" value={retraits} onChange={(e) => setRetraits(e.target.value)} /></label>
          <p><button type="submit" className="bouton" disabled={ep}>Envoyer la relève</button></p>
        </form>
      )}
      {mode === 'recharge' && (
        <form className="ado-champs" onSubmit={(e) => { e.preventDefault(); envoyer('recharge', { ajout }) }}>
          {Object.entries(produits).map(([k, nom]) => <label key={k}>{nom} à ajouter<input type="number" min="0" value={ajout[k] ?? 0} onChange={(e) => setAjout({ ...ajout, [k]: Number(e.target.value) })} /></label>)}
          <p><button type="submit" className="bouton" disabled={ep}>Valider la recharge</button></p>
        </form>
      )}
      {msg && <p role="status"><b>{msg}</b></p>}
    </article>
  )
}

/** Poser une borne : au village comme en ville, là où une fille peut venir sans être remarquée. */
function InstallerBorne({ jeton, fin }) {
  const [f, setF] = useState({ nom: '', lieu: 'lycee', zone: 'ville', localite: 'Lomé' })
  const [msg, setMsg] = useState(null)
  const changerZone = (zone) => setF({ ...f, zone, localite: zone === 'ville' ? VILLES[0] : VILLAGES[0][0] })
  const envoyer = async (e) => {
    e.preventDefault(); setMsg(null)
    try { const b = await reseau.post('bornes', f, jeton); setMsg({ ok: true, texte: `${b.nom} est installée, avec un stock de départ.` }); setF({ ...f, nom: '' }); fin() }
    catch (er) { setMsg({ ok: false, texte: er.message }) }
  }
  return (
    <section className="carte" id="installer">
      <h2>Installer une borne</h2>
      <p className="petit">Partout où une fille peut venir sans qu’on la remarque : lycée, gare, pharmacie, marché, quartier. Pas seulement au village.</p>
      <form className="ado-champs" onSubmit={envoyer}>
        <label>Nom de la borne<input value={f.nom} maxLength={80} placeholder="Borne du lycée de Kpalimé" onChange={(e) => setF({ ...f, nom: e.target.value })} required /></label>
        <label>Type de lieu<select value={f.lieu} onChange={(e) => setF({ ...f, lieu: e.target.value })}>{Object.entries(LIEUX).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label>Zone<select value={f.zone} onChange={(e) => changerZone(e.target.value)}><option value="ville">En ville</option><option value="village">Au village</option></select></label>
        <label>{f.zone === 'ville' ? 'Ville' : 'Village'}<select value={f.localite} onChange={(e) => setF({ ...f, localite: e.target.value })}>{f.zone === 'ville' ? VILLES.map((v) => <option key={v} value={v}>{v}</option>) : VILLAGES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <p><button className="bouton" type="submit">Installer la borne</button></p>
      </form>
      {msg && <p role="status" className={msg.ok ? 'succes' : 'erreur'}>{msg.texte}</p>}
    </section>
  )
}

/** Technicien : l'état de chaque borne, ce qu'il faut recharger, où passer. Partenaire et district : totaux seulement. */
export default function Bornes({ s }) {
  const [d, erreur, recharger] = useDonnees('bornes', s.jeton, 20000)
  if (!d) return <><Bandeau titre="Les bornes">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const detail = s.role === 'technicien' || s.role === 'district'
  const total = (cle) => d.bornes.reduce((a, b) => { for (const [k, n] of Object.entries(b.sondage[cle])) a[k] = (a[k] ?? 0) + n; return a }, {})
  const ORDRE = { 'a-visiter': 0, 'stock-bas': 1, ok: 2 }
  const retraitsPar = (cle) => d.bornes.reduce((a, b) => { const k = cle(b); a[k] = (a[k] ?? 0) + b.retraits; return a }, {})
  const aVisiter = d.bornes.filter((b) => b.etat === 'a-visiter').length
  const bas = d.bornes.filter((b) => b.stockBas > 0).length
  return (
    <>
      <Bandeau titre="Les bornes">{s.role === 'technicien' ? 'Où passer, quoi recharger, ce que disent les utilisatrices. Sans réseau, la relève est gardée sur ton téléphone et part toute seule.' : 'État des bornes du pays, en totaux. Aucun détail de lieu, aucune personne.'}</Bandeau>
      <div className="tuiles">
        <div className="tuile"><b>{d.bornes.length}</b><span>bornes en service</span></div>
        <div className={`tuile ${aVisiter ? 'alerte' : ''}`}><b>{aVisiter}</b><span>à visiter (sans relève depuis plus de 7 jours)</span></div>
        <div className={`tuile ${bas ? 'alerte' : ''}`}><b>{bas}</b><span>avec un produit presque épuisé</span></div>
        <div className="tuile"><b>{d.bornes.reduce((a, b) => a + b.retraits, 0)}</b><span>retraits au total</span></div>
      </div>
      {s.role === 'technicien' && <InstallerBorne jeton={s.jeton} fin={recharger} />}
      <section className="carte">
        <h2>Où les bornes servent le plus</h2>
        <p className="petit">En ville, une fille évite d’acheter ces produits au vu de tous : la borne discrète répond à ce besoin (données de démonstration).</p>
        <div className="repartitions">
          <Repartition titre="Retraits par zone" valeurs={retraitsPar((b) => b.zone)} noms={{ ville: 'En ville', village: 'Au village' }} />
          {detail && <Repartition titre="Retraits par type de lieu" valeurs={retraitsPar((b) => b.lieu)} noms={{}} />}
        </div>
      </section>
      {detail && <section className="borne-liste">{[...d.bornes].sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat]).map((b) => <Borne key={b.id} b={b} produits={d.produits} jeton={s.jeton} fin={recharger} />)}</section>}
      {!detail && (
        <section className="carte"><h2>État par borne</h2>
          <div className="table-defile"><table className="table-references"><thead><tr><th>Lieu</th><th>Zone</th><th>Réseau</th><th>État</th><th>Retraits</th></tr></thead>
            <tbody>{d.bornes.map((b) => <tr key={b.id}><td>{b.village}</td><td>{b.zone === 'ville' ? 'Ville' : 'Village'}</td><td>{b.reseau === 'aucun' ? 'aucun' : b.reseau}</td><td><span className={`pastille-b ${ETATS[b.etat][1]}`}>{ETATS[b.etat][0]}</span></td><td>{b.retraits}</td></tr>)}</tbody></table></div>
        </section>
      )}
      <section className="carte">
        <h2>Ce que disent les utilisatrices</h2>
        <p className="petit">Réponses anonymes aux questions de la borne, pour savoir quels problèmes sont les plus fréquents et si la borne aide.</p>
        <div className="repartitions"><Repartition titre="Leur plus gros problème" valeurs={total('probleme')} noms={PROBLEMES} /><Repartition titre="La borne les a-t-elle aidées ?" valeurs={total('utile')} noms={UTILE} /></div>
      </section>
    </>
  )
}
