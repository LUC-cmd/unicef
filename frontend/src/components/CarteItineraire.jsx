import { useCallback, useEffect, useMemo, useState } from 'react'
import { reseau } from '../lib/reseauClient.js'
import { delaiLisible } from '../lib/suivi.js'

/**
 * Carte des lieux (hôpitaux, centres, crèches, jardins d'enfants, écoles, boutiques), des routes et des obstacles,
 * avec l'itinéraire par moto, voiture ou à pied. Les professionnels signalent un obstacle ; tout le monde le voit.
 */
const TYPES = {
  hopital: ['Hôpital', '#c8372b'], centre: ['Centre de santé', '#d9622b'], creche: ['Crèche', '#0e7c86'], jardin: ['Jardin d’enfants', '#2f8f5b'],
  ecole: ['École maternelle', '#2f8f5b'], boutique: ['Boutique partenaire', '#6a4fa3'], nutrition: ['Nutritionniste', '#6a4fa3'],
}
const FILTRES = [['tous', 'Tous les lieux'], ['soins', 'Hôpitaux et centres'], ['petite', 'Crèches, jardins et écoles'], ['nutri', 'Nutrition']]
const DANS = { soins: ['hopital', 'centre'], petite: ['creche', 'jardin', 'ecole'], nutri: ['boutique', 'nutrition'] }
const ICONE_MODE = { moto: 'M', voiture: 'V', pied: 'P' }
const OBSTACLES = { inondation: 'Route inondée', pont: 'Pont coupé', arbre: 'Arbre tombé', travaux: 'Travaux', boue: 'Piste boueuse', marche: 'Marché, route encombrée' }

export default function CarteItineraire({ jeton, role, departDefaut = 'agbele', versDefaut = '', titreDestination = 'Aller vers' }) {
  const [carte, setCarte] = useState(null)
  const [de, setDe] = useState(departDefaut)
  const [vers, setVers] = useState(versDefaut)
  const [filtre, setFiltre] = useState('tous')
  const [res, setRes] = useState(null)
  const [mode, setMode] = useState('')
  const [erreur, setErreur] = useState('')
  const [msg, setMsg] = useState('')
  const pro = ['agent', 'centre', 'district'].includes(role)

  const charger = useCallback(async () => { try { setCarte(await reseau.get('lieux')); setErreur('') } catch (e) { setErreur(e.message) } }, [])
  useEffect(() => { charger() }, [charger])
  const lieux = useMemo(() => (carte?.lieux ?? []).filter((l) => filtre === 'tous' || DANS[filtre].includes(l.type)), [carte, filtre])

  const calculer = useCallback(async (d, v) => {
    if (!v) { setRes(null); return }
    try { const r = await reseau.post('itineraire', { de: d, vers: v }); setRes(r); setMode((m) => (m && r.modes.find((x) => x.mode === m)?.possible ? m : r.recommande ?? '')); setErreur('') } catch (e) { setErreur(e.message) }
  }, [])
  useEffect(() => { calculer(de, vers) }, [de, vers, calculer, carte])

  const choisi = res?.modes.find((m) => m.mode === mode)
  const chemin = choisi?.etapes ?? []
  const villages = carte?.routes.villages ?? {}

  return (
    <div className="carte-itineraire">
      <section className="carte">
        <div className="ado-champs">
          <label>Je pars de<select value={de} onChange={(e) => setDe(e.target.value)}>{Object.entries(villages).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}</select></label>
          <label>{titreDestination}<select value={vers} onChange={(e) => setVers(e.target.value)}><option value="">Choisir un lieu</option>{lieux.map((l) => <option key={l.id} value={l.id}>{l.nom.replace(/ \(fictives?\)/, '')} · {TYPES[l.type]?.[0] ?? l.libelle}</option>)}</select></label>
        </div>
        <div className="filtres" role="group" aria-label="Type de lieu">{FILTRES.map(([k, n]) => <button key={k} type="button" className={`filtre${filtre === k ? ' actif' : ''}`} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{n}</button>)}</div>
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
      </section>

      <div className="carte-grille">
        <figure className="graphe carte-svg">
          {carte && <Carte carte={carte} lieux={carte.lieux} de={de} chemin={chemin} vers={res?.destination?.id} />}
          <p className="legende-carte">
            {Object.entries(TYPES).filter(([k]) => k !== 'ecole' && k !== 'nutrition').map(([k, [n, c]]) => <span key={k}><i style={{ background: c }} /> {n}</span>)}
            <span><i className="obst" /> Obstacle</span><span><i className="trait-plein" /> Goudron</span><span><i className="trait-tirets" /> Piste</span>
          </p>
        </figure>

        <div>
          {res ? (
            <section className="carte">
              <h2>Itinéraire vers {res.destination ? res.destination.nom.replace(/ \(fictives?\)/, '') : villages[vers]?.nom}</h2>
              <p className={res.recommande ? 'conseil' : 'erreur'}>{res.conseil}</p>
              <ul className="modes">
                {res.modes.map((m) => (
                  <li key={m.mode}>
                    <button type="button" disabled={!m.possible} className={`mode${mode === m.mode ? ' actif' : ''}${res.recommande === m.mode ? ' reco' : ''}`} aria-pressed={mode === m.mode} onClick={() => setMode(m.mode)}>
                      <span className="mode-pastille" aria-hidden="true">{ICONE_MODE[m.mode]}</span>
                      <span><b>{m.libelle}</b><small>{m.possible ? `${delaiLisible(m.minutes)} · ${m.km} km` : 'Impossible : route bloquée'}</small></span>
                      {res.recommande === m.mode && <em>Conseillé</em>}
                    </button>
                  </li>
                ))}
              </ul>
              {chemin.length > 1 && <p className="petit">Passe par : {chemin.map((k) => villages[k]?.nom).join(' → ')}.</p>}
              {choisi?.obstacles.length > 0 && (
                <ul className="liste-coches">{choisi.obstacles.map((o) => <li key={o.id}><b>{o.libelle}</b> entre {villages[o.de]?.nom} et {villages[o.vers]?.nom}{o.note ? ` : ${o.note}` : ''}</li>)}</ul>
              )}
              {choisi && choisi.obstacles.length === 0 && <p className="petit">Aucun obstacle signalé sur ce chemin.</p>}
            </section>
          ) : <section className="carte"><p>Choisissez où vous allez : l’itinéraire s’affiche sur la carte, avec le mode de transport conseillé.</p></section>}
        </div>
      </div>

      {pro && carte && <Obstacles carte={carte} jeton={jeton} onChange={() => { charger(); setMsg('Mis à jour.') }} msg={msg} />}
      {role === 'district' && <NouvelEtablissement jeton={jeton} villages={villages} onChange={charger} />}
    </div>
  )
}

function Carte({ carte, lieux, de, chemin, vers }) {
  const { segments, villages } = carte.routes
  const xs = Object.values(villages).map((v) => v.x), ys = Object.values(villages).map((v) => v.y)
  const [x0, x1, y0, y1] = [Math.min(...xs) - 5, Math.max(...xs) + 5, Math.min(...ys) - 6, Math.max(...ys) + 6]
  const W = 640, H = Math.round((W * (y1 - y0)) / (x1 - x0)) + 20
  const px = (x) => ((x - x0) / (x1 - x0)) * W
  const py = (y) => ((y - y0) / (y1 - y0)) * (H - 20) + 10
  const surChemin = (a, b) => chemin.some((k, i) => i > 0 && ((chemin[i - 1] === a && k === b) || (chemin[i - 1] === b && k === a)))
  const parVillage = {}
  lieux.forEach((l) => { (parVillage[l.village] ||= []).push(l) })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-carte" role="img" aria-label="Carte des villages, routes et lieux">
      {segments.map((s) => {
        const a = villages[s.de], b = villages[s.vers]
        const mx = (px(a.x) + px(b.x)) / 2, my = (py(a.y) + py(b.y)) / 2
        return (
          <g key={s.de + s.vers}>
            <line x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} className={`route ${s.surface}${surChemin(s.de, s.vers) ? ' choisie' : ''}`} />
            {s.obstacles.length > 0 && <g transform={`translate(${mx} ${my})`}><title>{s.obstacles.map((o) => o.libelle).join(', ')}</title><path d="M0 -11 L11 9 L-11 9 Z" className="obst-marque" /><text y="6" textAnchor="middle" className="obst-texte">!</text></g>}
          </g>
        )
      })}
      {Object.entries(villages).map(([k, v]) => (
        <g key={k} transform={`translate(${px(v.x)} ${py(v.y)})`}>
          <circle r={k === de ? 9 : 6} className={`village-point${k === de ? ' depart' : ''}`} />
          <text y="-14" textAnchor="middle" className="village-nom">{v.nom}</text>
          {(parVillage[k] ?? []).map((l, i) => (
            <rect key={l.id} x={-24 + i * 11} y="12" width="9" height="9" rx="2" fill={TYPES[l.type]?.[1] ?? '#555'} className={l.id === vers ? 'lieu-choisi' : ''}><title>{l.nom}</title></rect>
          ))}
        </g>
      ))}
    </svg>
  )
}

function Obstacles({ carte, jeton, onChange, msg }) {
  const segs = carte.routes.segments
  const [f, setF] = useState({ seg: 0, type: 'inondation', note: '' })
  const [erreur, setErreur] = useState('')
  const [liste, setListe] = useState([])
  const charger = useCallback(async () => { try { setListe((await reseau.get('obstacles')).obstacles) } catch { /* hors ligne */ } }, [])
  useEffect(() => { charger() }, [charger, carte])
  const nom = (k) => carte.routes.villages[k]?.nom
  const signaler = async (e) => {
    e.preventDefault(); setErreur('')
    const s = segs[f.seg]
    try { await reseau.post('obstacles', { de: s.de, vers: s.vers, type: f.type, note: f.note }, jeton); setF({ ...f, note: '' }); onChange() } catch (er) { setErreur(er.message) }
  }
  const lever = async (o) => { try { await reseau.patch(`obstacles/${o.id}`, {}, jeton); onChange() } catch (er) { setErreur(er.message) } }
  return (
    <section className="carte">
      <h2>Signaler un obstacle sur la route</h2>
      <form onSubmit={signaler} className="ado-champs">
        <label>Tronçon<select value={f.seg} onChange={(e) => setF({ ...f, seg: Number(e.target.value) })}>{segs.map((s, i) => <option key={i} value={i}>{nom(s.de)} – {nom(s.vers)} ({s.surface})</option>)}</select></label>
        <label>Obstacle<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(OBSTACLES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label>Précision (facultatif)<input value={f.note} maxLength={140} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <p><button className="bouton" type="submit">Signaler</button></p>
      </form>
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      {msg && <p role="status" className="petit">{msg}</p>}
      <h3>Obstacles en cours ({liste.length})</h3>
      {liste.length === 0 ? <p>Aucun obstacle signalé.</p> : (
        <ul className="liste-coches">{liste.map((o) => <li key={o.id}><b>{o.libelle}</b> : {nom(o.de)} – {nom(o.vers)}{o.note ? `. ${o.note}` : ''} <button type="button" className="bouton secondaire petit-bouton" onClick={() => lever(o)}>Route dégagée</button></li>)}</ul>
      )}
      <p className="petit">Les itinéraires des familles, des agents et des centres tiennent compte de ces obstacles tout de suite.</p>
    </section>
  )
}

function NouvelEtablissement({ jeton, villages, onChange }) {
  const [f, setF] = useState({ nom: '', village: 'agbele', type: 'creche', capacite: '' })
  const [msg, setMsg] = useState('')
  const creer = async (e) => {
    e.preventDefault(); setMsg('')
    try { await reseau.post('etablissements', { ...f, capacite: Number(f.capacite) || 0 }, jeton); setMsg('Établissement ajouté : il apparaît sur la carte et dans les itinéraires des familles.'); setF({ ...f, nom: '', capacite: '' }); onChange() } catch (er) { setMsg(er.message) }
  }
  return (
    <section className="carte">
      <h2>Ajouter une crèche, un jardin d’enfants ou une école</h2>
      <form onSubmit={creer} className="ado-champs">
        <label>Nom<input value={f.nom} maxLength={80} onChange={(e) => setF({ ...f, nom: e.target.value })} required /></label>
        <label>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="creche">Crèche (0 à 3 ans)</option><option value="jardin">Jardin d’enfants (3 à 5 ans)</option><option value="ecole">École maternelle (4 à 5 ans)</option></select></label>
        <label>Village<select value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>{Object.entries(villages).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}</select></label>
        <label>Places<input type="number" min="0" max="500" value={f.capacite} onChange={(e) => setF({ ...f, capacite: e.target.value })} /></label>
        <p><button className="bouton" type="submit">Ajouter</button></p>
      </form>
      {msg && <p role="status">{msg}</p>}
      <p className="petit">Le district crée l’établissement. Un compte pour son tableau de bord est ensuite ouvert par l’administrateur.</p>
    </section>
  )
}
