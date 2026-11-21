import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { Couverture, DelaiCentres, ParCas, Tendance } from '../components/GraphesDistrict.jsx'
import { CAS, SIGNES } from '../lib/parcours.js'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'
import { delaiLisible, ETATS_REF, PRIORITES, anneau, heureCourte } from '../lib/suivi.js'

/** Charge une liste du service et la rafraîchit toutes les 8 secondes. */
export function useDonnees(chemin, jeton, delai = 8000) {
  const [d, setD] = useState(null)
  const [erreur, setErreur] = useState('')
  const [n, setN] = useState(0)
  useEffect(() => {
    let vivant = true
    const charger = async () => { try { const r = await reseau.get(chemin, jeton); if (vivant) { setD(r); setErreur('') } } catch (e) { if (vivant) setErreur(e.message) } }
    charger(); const t = setInterval(charger, delai)
    return () => { vivant = false; clearInterval(t) }
  }, [chemin, jeton, delai, n])
  return [d, erreur, () => setN((x) => x + 1)]
}

function Anneau({ pct, prio }) {
  const { r, c, reste } = anneau(pct)
  return (
    <svg className={`anneau anneau-${prio}`} viewBox="0 0 64 64" role="img" aria-label={`${pct} % des enfants vus`}>
      <circle cx="32" cy="32" r={r} className="anneau-fond" />
      <circle cx="32" cy="32" r={r} className="anneau-val" strokeDasharray={c} strokeDashoffset={reste} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle">{pct} %</text>
    </svg>
  )
}

export function Villages({ s }) {
  const [d, erreur] = useDonnees('villages', s.jeton)
  const liste = d?.villages ?? []
  const prioritaires = liste.filter((v) => v.priorite === 'prioritaire')
  return (
    <>
      <Bandeau titre="Les villages en un coup d’œil">Pour chaque village : la part des enfants vus ce mois-ci, les références en attente et les familles à visiter. Les villages à voir en premier sont en tête.</Bandeau>
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      {d && (
        <p className="resume-villages" role="status">
          {prioritaires.length === 0 ? 'Aucun village prioritaire pour le moment.' : `${prioritaires.length} village${prioritaires.length > 1 ? 's' : ''} à voir en premier : ${prioritaires.map((v) => v.nom).join(', ')}.`}
        </p>
      )}
      <ul className="villages-grille">
        {liste.map((v) => (
          <li key={v.id} className={`village village-${v.priorite}`}>
            <Anneau pct={v.couverture} prio={v.priorite} />
            <div>
              <h3>{v.nom} <span className={`pastille pastille-${v.priorite}`}>{PRIORITES[v.priorite]}</span></h3>
              <p className="petit">{v.raison} · centre : {v.centre}</p>
              <dl className="chiffres">
                <div><dt>Enfants suivis</dt><dd>{v.vus} / {v.enfants}</dd></div>
                <div><dt>Sans visite</dt><dd>{v.sansVisite}</dd></div>
                <div><dt>Références en attente</dt><dd>{v.referencesOuvertes}{v.referencesEnRetard > 0 && <em> dont {v.referencesEnRetard} en retard</em>}</dd></div>
                <div><dt>Familles à visiter</dt><dd>{v.famillesAVisiter}</dd></div>
              </dl>
            </div>
          </li>
        ))}
      </ul>
      <p className="petit">Chiffres fictifs de démonstration. Aucun nom d’enfant n’apparaît ici.</p>
    </>
  )
}

export function District({ s }) {
  const [d, erreur] = useDonnees('district', s.jeton)
  if (!d) return <><Bandeau titre="Vue d’ensemble du district">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const r = d.references
  return (
    <>
      <Bandeau titre="Vue d’ensemble du district">Où en est la couverture, combien de références sont arrivées au centre, et où agir en premier.</Bandeau>
      <div className="tuiles">
        <div className="tuile"><b>{d.couverture} %</b><span>des enfants vus ({d.vus} sur {d.enfants})</span></div>
        <div className="tuile"><b>{r.taux} %</b><span>des références prises en charge</span></div>
        <div className={`tuile ${r.enRetard ? 'alerte' : ''}`}><b>{r.enRetard}</b><span>référence{r.enRetard > 1 ? 's' : ''} en retard (plus de 24 h)</span></div>
        <div className="tuile"><b>{r.delaiMedianMin == null ? '–' : delaiLisible(r.delaiMedianMin)}</b><span>délai médian jusqu’à la prise en charge</span></div>
        <div className="tuile"><b>{Math.round(d.structures.filter((x) => x.eveilIndice != null).reduce((a, x) => a + x.eveilIndice, 0) / Math.max(1, d.structures.filter((x) => x.eveilIndice != null).length))} %</b><span>éveil et apprentissage moyen (crèches et écoles)</span></div>
        <div className={`tuile ${d.appels.aVisiter ? 'alerte' : ''}`}><b>{d.appels.aVisiter}</b><span>famille{d.appels.aVisiter > 1 ? 's' : ''} injoignable{d.appels.aVisiter > 1 ? 's' : ''} par téléphone : visite à prévoir</span></div>
      </div>
      <div className="grille-graphes">
        <Tendance donnees={d.tendance} />
        <Couverture villages={d.villages} />
        <DelaiCentres centres={d.parCentre} delaiLisible={delaiLisible} />
        <ParCas donnees={d.parCas} />
      </div>
      <section className="carte">
        <h2>Chaque référence, de l’envoi à la prise en charge</h2>
        <ol className="entonnoir">
          <li><b>{r.total}</b> envoyées</li>
          <li><b>{r.arrivees + r.prises}</b> arrivées au centre</li>
          <li><b>{r.prises}</b> prises en charge</li>
        </ol>
        <p><Link to="/reseau/references" className="bouton secondaire">Voir chaque référence</Link> <Link to="/reseau/villages" className="bouton secondaire">Voir les villages</Link></p>
      </section>
      <section className="carte">
        <h2>Crèches, jardins d’enfants et écoles</h2>
        <ul className="liste-coches">{d.structures.map((e) => <li key={e.id}><b>{e.nom.replace(/ \(fictives?\)/, '')}</b> : {e.inscrits} enfants, présence {e.presenceMoyennePct ?? '–'} %, vaccins à jour {e.vaccinesPct} %, {e.signalements} signalement{e.signalements > 1 ? 's' : ''}.</li>)}</ul>
        <p><Link to="/reseau/structures" className="bouton secondaire">Voir les établissements</Link></p>
      </section>
      <section className="carte">
        <h2>Où agir en premier</h2>
        {d.prioritaires.length === 0 ? <p>Aucun village prioritaire.</p> : (
          <ul className="liste-coches">{d.villages.filter((v) => v.priorite === 'prioritaire').map((v) => <li key={v.id}><b>{v.nom}</b> : {v.raison.toLowerCase()} ({v.couverture} % vus, {v.referencesOuvertes} référence{v.referencesOuvertes > 1 ? 's' : ''} en attente).</li>)}</ul>
        )}
      </section>
    </>
  )
}

export function References({ s }) {
  const [d, erreur, recharger] = useDonnees('references', s.jeton)
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ village: 'agbele', cas: 'enfant', signe: '' })
  const centre = s.role === 'centre'
  const agent = s.role === 'agent'
  const liste = d?.references ?? []
  const avancer = async (r, etat) => { setMsg(''); try { await reseau.patch(`references/${r.id}`, { etat }, s.jeton); recharger() } catch (e) { setMsg(e.message) } }
  const creer = async (e) => {
    e.preventDefault(); setMsg('')
    const res = await envoyerOuGarder('references', { village: f.village, cas: f.cas, signes: f.signe ? [f.signe] : [] })
    setMsg(res.ok ? 'Référence envoyée au centre.' : res.gardee ? 'Pas de réseau : la référence est gardée et partira dès le retour de la connexion.' : res.erreur)
    if (res.ok) recharger()
  }
  return (
    <>
      <Bandeau titre="Chaque référence jusqu’à sa prise en charge">Une référence est suivie de l’envoi à la prise en charge, puis à la visite à la maison. Une référence qui attend depuis plus de 24 h est signalée en retard.</Bandeau>
      {agent && (
        <section className="carte">
          <h2>Envoyer une référence</h2>
          <form onSubmit={creer} className="ado-champs">
            <label>Village<select value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>{['agbele', 'kpadape', 'zogbedji', 'davie', 'tovegan'].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></label>
            <label>Type de cas<select value={f.cas} onChange={(e) => setF({ ...f, cas: e.target.value, signe: '' })}>{Object.entries(CAS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label>Signe principal<select value={f.signe} onChange={(e) => setF({ ...f, signe: e.target.value })}><option value="">Aucun signe de danger</option>{(SIGNES[f.cas] ?? []).map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
            <p><button className="bouton" type="submit">Envoyer</button></p>
          </form>
        </section>
      )}
      {msg && <p role="status">{msg}</p>}
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      <section className="carte">
        <div className="table-defile">
          <table className="table-references">
            <caption className="sr-only">Références et leur état</caption>
            <thead><tr><th>Cas</th><th>Village</th><th>Centre</th><th>État</th><th>Attente</th><th>Action</th></tr></thead>
            <tbody>
              {liste.length === 0 && <tr><td colSpan="6">Aucune référence.</td></tr>}
              {liste.map((r) => (
                <tr key={r.id} className={r.retard ? 'ligne-retard' : ''}>
                  <td>{CAS[r.cas]}{r.niveau === 'urgent' && <b className="pastille pastille-prioritaire"> Urgent</b>}</td>
                  <td>{r.village[0].toUpperCase() + r.village.slice(1)}</td>
                  <td>{r.centreId}</td>
                  <td><span className={`etat etat-${r.etat}`}>{ETATS_REF[r.etat]}</span>{r.retard && <b className="pastille pastille-prioritaire"> En retard</b>}</td>
                  <td>{delaiLisible(Math.round(r.ageH * 60))}</td>
                  <td>
                    {r.etat !== 'prise' && r.etat !== 'suivie' && <Link className="bouton secondaire petit-bouton" to={`/reseau/carte?de=${r.village}&vers=${r.centreId}`}>Itinéraire</Link>}{' '}
                    {centre && r.etat === 'envoyee' && <button type="button" className="bouton secondaire petit-bouton" onClick={() => avancer(r, 'arrivee')}>Marquer arrivée</button>}
                    {centre && r.etat === 'arrivee' && <button type="button" className="bouton secondaire petit-bouton" onClick={() => avancer(r, 'prise')}>Prise en charge</button>}
                    {agent && r.etat === 'prise' && <button type="button" className="bouton secondaire petit-bouton" onClick={() => avancer(r, 'suivie')}>Visite faite</button>}
                    {agent && r.retard && <button type="button" className="bouton secondaire petit-bouton" onClick={() => avancer(r, 'relance')}>Relancer</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="petit">Aucun nom : seulement le type de cas, le village et l’heure. <span title="Dernière mise à jour">{heureCourte(new Date().toISOString())}</span></p>
      </section>
    </>
  )
}

const LIBELLES_APPEL = { 'en-attente': 'À rappeler', joint: 'Famille jointe', 'a-visiter': 'Visite à domicile nécessaire' }

export function Appels({ s }) {
  const [d, erreur, recharger] = useDonnees('appels', s.jeton)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ famille: '', sujet: 'vaccination', village: 'agbele' })
  const [sujets] = useState({ vaccination: 'Rappel de vaccination', naissance: 'Déclaration de naissance', 'rendez-vous': 'Rendez-vous de consultation', nutrition: 'Conseil de nutrition', croissance: 'Mesure de croissance' })
  const agent = s.role === 'agent'
  const liste = d?.appels ?? []
  const tenter = async (a, reponse) => { setMsg(''); try { await reseau.post(`appels/${a.id}/tenter`, { reponse }, s.jeton); recharger() } catch (e) { setMsg(e.message) } }
  const ajouter = async (e) => {
    e.preventDefault(); setMsg('')
    try { await reseau.post('appels', f, s.jeton); setF({ ...f, famille: '' }); setMsg('Famille ajoutée à la file d’appels.'); recharger() } catch (er) { setMsg(er.message) }
  }
  return (
    <>
      <Bandeau titre="Le téléphone de la famille">Une famille sans smartphone reçoit un appel vocal dans sa langue. Après trois essais sans réponse, un agent est envoyé à domicile. Rien n’est enregistré à part un code famille.</Bandeau>
      <section className="carte telephone-simule">
        <h2>Composer le code sur un téléphone simple</h2>
        <p className="petit">Une famille peut aussi appeler elle-même, sans internet.</p>
        <div className="cadran" aria-label="Téléphone simple">
          <output className="cadran-ecran">{code || '*123#'}</output>
          <div className="cadran-touches">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((t) => <button key={t} type="button" onClick={() => setCode((c) => (c === '*123#' ? '' : c) + t)}>{t}</button>)}
          </div>
          <button type="button" className="bouton secondaire petit-bouton" onClick={() => setCode('*123#')}>*123#</button>
          <button type="button" className="bouton secondaire petit-bouton" onClick={() => setCode('')}>Effacer</button>
        </div>
        {code === '*123#' && (
          <div className="menu-vocal" role="status">
            <b>Menu vocal Fil d’Or</b>
            <ol><li>Rappel de vaccination</li><li>Déclarer une naissance</li><li>Prendre un rendez-vous</li><li>Parler à un agent</li></ol>
            <p className="petit">La voix répond dans la langue du village (éwé, kabiyè ou mina). Démonstration : aucun appel réel n’est passé.</p>
          </div>
        )}
      </section>
      {agent && (
        <section className="carte">
          <h2>Ajouter une famille à rappeler</h2>
          <form onSubmit={ajouter} className="ado-champs">
            <label>Code famille<input value={f.famille} placeholder="FAM-7K2Q" maxLength={8} onChange={(e) => setF({ ...f, famille: e.target.value.toUpperCase() })} required /></label>
            <label>Sujet<select value={f.sujet} onChange={(e) => setF({ ...f, sujet: e.target.value })}>{Object.entries(sujets).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label>Village<select value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>{['agbele', 'kpadape', 'zogbedji', 'davie', 'tovegan'].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></label>
            <p><button className="bouton" type="submit">Ajouter</button></p>
          </form>
        </section>
      )}
      {msg && <p role="status">{msg}</p>}
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      <section className="carte">
        <h2>File d’appels vocaux</h2>
        {liste.length === 0 && <p>Aucun appel en attente.</p>}
        <ul className="liste-coches">
          {liste.map((a) => (
            <li key={a.id}>
              <b>{a.famille}</b> · {a.libelle} · {a.village[0].toUpperCase() + a.village.slice(1)} ({a.langue}) · <span className={`etat etat-${a.etat}`}>{LIBELLES_APPEL[a.etat]}</span>
              <br /><small>{a.tentatives} essai{a.tentatives > 1 ? 's' : ''} sur 3 · demandé à {heureCourte(a.heure)}</small>
              {agent && a.etat === 'en-attente' && (
                <div>
                  <button type="button" className="bouton secondaire petit-bouton" onClick={() => tenter(a, true)}>Famille jointe</button>{' '}
                  <button type="button" className="bouton secondaire petit-bouton" onClick={() => tenter(a, false)}>Pas de réponse</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
