import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { Tendance } from '../components/GraphesDistrict.jsx'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'
import { delaiLisible } from '../lib/suivi.js'
import { ETATS_REF } from '../lib/suivi.js'
import { useDonnees } from './Suivi.jsx'

const maj = (t) => (t ? t[0].toUpperCase() + t.slice(1) : '')
const jour = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')
const ORIGINES = { alerte: 'Alertes directes', visite: 'Visites des agents', agent: 'Références des agents', ecole: 'Écoles et crèches' }

/** Tableau de bord du centre de santé ou de l'hôpital : ce qui arrive, ce qui est sur place, ce qui est pris en charge. */
export function TableauCentre({ s }) {
  const [c, erreur] = useDonnees('centre/moi', s.jeton, 6000)
  if (!c) return <><Bandeau titre="Tableau de bord">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const max = Math.max(1, ...c.provenance.map((p) => p.total))
  return (
    <>
      <Bandeau surtitre={c.hopital ? 'Hôpital' : 'Centre de santé'} titre={c.nom.replace(' (fictif)', '')}>{c.hopital ? 'L’hôpital reçoit les cas graves envoyés par les centres, les agents et les écoles : césarienne, urgences, nouveau-né.' : 'Le centre reçoit les cas simples et envoie à l’hôpital ce qu’il ne peut pas prendre en charge.'} Services : {c.services.toLowerCase()}.</Bandeau>
      <div className="tuiles">
        <div className={`tuile ${c.urgentsEnRoute ? 'alerte' : ''}`}><b>{c.urgentsEnRoute}</b><span>urgence{c.urgentsEnRoute > 1 ? 's' : ''} en route</span></div>
        <div className="tuile"><b>{c.attendus}</b><span>cas attendu{c.attendus > 1 ? 's' : ''}</span></div>
        <div className="tuile"><b>{c.surPlace}</b><span>sur place, à prendre en charge</span></div>
        <div className="tuile"><b>{c.prises}</b><span>pris en charge</span></div>
        <div className="tuile"><b>{c.delaiMedianMin == null ? '–' : delaiLisible(c.delaiMedianMin)}</b><span>délai médian</span></div>
      </div>
      <p><Link className="bouton" to="/reseau/references">Traiter les cas qui arrivent</Link></p>
      <div className="grille-graphes">
        <Tendance donnees={c.tendance} />
        <figure className="graphe">
          <figcaption><b>D’où viennent les cas</b></figcaption>
          <ul className="barres" aria-label="Provenance par village">
            {c.provenance.map((p) => <li key={p.village}><span className="barre-nom">{maj(p.village)}</span><span className="barre-piste"><span className="barre-val barre-delai" style={{ width: `${(100 * p.total) / max}%` }} /></span><span className="barre-pct">{p.total}</span></li>)}
          </ul>
          <ul className="legende-liste">{Object.entries(c.parOrigine).map(([k, v]) => <li key={k}>{ORIGINES[k]} <b>{v}</b></li>)}</ul>
        </figure>
      </div>
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
    </>
  )
}

/** Tableau de bord d'un jardin d'enfants, d'une école maternelle ou d'une crèche. */
export function TableauEcole({ s }) {
  const [v, erreur, recharger] = useDonnees('structures/moi', s.jeton, 10000)
  const [presents, setPresents] = useState('')
  const [f, setF] = useState({ code: '', motif: 'absent' })
  const [msg, setMsg] = useState('')
  if (!v) return <><Bandeau titre="Mon établissement">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const noter = async (e) => {
    e.preventDefault(); setMsg('')
    try { await reseau.post('structures/moi/presence', { presents: Number(presents) }, s.jeton); setPresents(''); setMsg('Présence enregistrée.'); recharger() } catch (er) { setMsg(er.message) }
  }
  const signaler = async (e) => {
    e.preventDefault(); setMsg('')
    const r = await envoyerOuGarder('structures/moi/signalement', { code: f.code.toUpperCase(), motif: f.motif })
    if (r.ok) { setMsg(`Signalement envoyé à ${r.donnees.centre ?? 'un centre'}.`); setF({ ...f, code: '' }); recharger() }
    else setMsg(r.gardee ? 'Pas de réseau : le signalement est gardé et partira au retour de la connexion.' : r.erreur)
  }
  const max = Math.max(v.inscrits, 1)
  return (
    <>
      <Bandeau surtitre={v.type} titre={v.nom.replace(/ \(fictives?\)/, '')}>Suivez la présence et les vaccins des enfants, et prévenez le centre de santé quand un enfant inquiète. Seul un code enfant est utilisé : jamais de nom.</Bandeau>
      <div className="tuiles">
        <div className="tuile"><b>{v.inscrits}</b><span>enfants inscrits</span></div>
        <div className="tuile"><b>{v.presenceAujourdhui ?? '–'}</b><span>présents aujourd’hui</span></div>
        <div className="tuile"><b>{v.presenceMoyennePct ?? '–'} %</b><span>présence sur la semaine</span></div>
        <div className={`tuile ${v.vaccinesPct < 80 ? 'alerte' : ''}`}><b>{v.vaccinesPct} %</b><span>vaccins à jour ({v.vaccinesAJour} sur {v.inscrits})</span></div>
        <div className="tuile"><b>{v.repas}</b><span>repas servis par jour</span></div>
      </div>
      <div className="grille-graphes">
        <figure className="graphe">
          <figcaption><b>Présence cette semaine</b></figcaption>
          <ul className="barres" aria-label="Présence par jour">
            {v.semaine.map((j) => <li key={j.jour}><span className="barre-nom">{jour(j.jour)}</span><span className="barre-piste">{j.presents != null && <span className="barre-val" style={{ width: `${(100 * j.presents) / max}%` }} />}</span><span className="barre-pct">{j.presents ?? '–'}</span></li>)}
          </ul>
        </figure>
        <section className="carte">
          <h2>Noter la présence du jour</h2>
          <form onSubmit={noter} className="ado-champs">
            <label>Enfants présents<input type="number" inputMode="numeric" min="0" max={v.inscrits} value={presents} onChange={(e) => setPresents(e.target.value)} required /></label>
            <p><button className="bouton" type="submit">Enregistrer</button></p>
          </form>
        </section>
      </div>
      <section className="carte">
        <h2>Prévenir le centre de santé</h2>
        <form onSubmit={signaler} className="ado-champs">
          <label>Code de l’enfant<input value={f.code} placeholder="AG-0042" maxLength={12} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} required /></label>
          <label>Pourquoi<select value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })}>{v.motifs.map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}</select></label>
          <p><button className="bouton" type="submit">Envoyer au centre</button></p>
        </form>
        {msg && <p role="status">{msg}</p>}
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
        <p className="petit">Le centre le plus proche reçoit une référence, et l’agent de santé du village la suit jusqu’à la prise en charge.</p>
      </section>
      <section className="carte">
        <h2>Mes signalements ({v.signalements})</h2>
        {v.suivi.length === 0 ? <p>Aucun signalement pour le moment.</p> : (
          <ul className="liste-coches">{v.suivi.map((r) => <li key={r.id}><span className={`etat etat-${r.etat}`}>{ETATS_REF[r.etat]}</span>{r.retard && <b className="pastille pastille-prioritaire"> En retard</b>} · {delaiLisible(Math.round(r.ageH * 60))}</li>)}</ul>
        )}
      </section>
    </>
  )
}

/** Vue de l'agent ou du district : toutes les structures d'accueil des 0-5 ans. */
export function Structures({ s }) {
  const [d, erreur] = useDonnees('structures', s.jeton)
  const liste = d?.structures ?? []
  return (
    <>
      <Bandeau titre="Crèches, jardins d’enfants et écoles">Les établissements qui accueillent les enfants de 0 à 5 ans : présence, vaccins à jour et signalements envoyés aux centres.</Bandeau>
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      <ul className="villages-grille">
        {liste.map((e) => (
          <li key={e.id} className={`village ${e.vaccinesPct < 80 ? 'village-renforcer' : 'village-bonne'}`}>
            <div />
            <div>
              <h3>{e.nom.replace(/ \(fictives?\)/, '')}</h3>
              <p className="petit">{e.type} · {maj(e.village)}</p>
              <dl className="chiffres">
                <div><dt>Inscrits</dt><dd>{e.inscrits}</dd></div>
                <div><dt>Présence moyenne</dt><dd>{e.presenceMoyennePct ?? '–'} %</dd></div>
                <div><dt>Vaccins à jour</dt><dd>{e.vaccinesPct} %</dd></div>
                <div><dt>Signalements</dt><dd>{e.signalements} ({e.signalementsPris} pris en charge)</dd></div>
              </dl>
            </div>
          </li>
        ))}
      </ul>
      <p className="petit">Données fictives de démonstration. Aucun nom d’enfant.</p>
    </>
  )
}
