import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { Anneaux, Evolution, Tendance } from '../components/GraphesDistrict.jsx'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'
import { delaiLisible } from '../lib/suivi.js'
import { ETATS_REF } from '../lib/suivi.js'
import { useDonnees } from './Suivi.jsx'

const maj = (t) => (t ? t[0].toUpperCase() + t.slice(1) : '')
const jour = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')
const ORIGINES = { alerte: 'Alertes directes', visite: 'Visites des agents', agent: 'Références des agents', ecole: 'Écoles et crèches', accueil: 'Arrivés directement' }
const agePhrase = (m) => (m < 24 ? `${m} mois` : `${Math.floor(m / 12)} ans`)

/** Tableau de bord du centre de santé ou de l'hôpital : ce qui arrive, ce qui est sur place, ce qui est pris en charge. */
export function TableauCentre({ s }) {
  const [c, erreur, recharger] = useDonnees('centre/moi', s.jeton, 6000)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  if (!c) return <><Bandeau titre="Tableau de bord">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const max = Math.max(1, ...c.provenance.map((p) => p.total))
  const accueillir = async (e) => {
    e.preventDefault(); setMsg(null)
    try {
      const r = await reseau.post('centre/moi/accueil', { code: code.trim().toUpperCase() }, s.jeton)
      setMsg({ ok: true, texte: r.doublon ? `${r.enfant.code} est déjà sur place.` : `${r.enfant.code} (${agePhrase(r.enfant.ageMois)}, ${maj(r.enfant.village)}) est enregistré sur place.` })
      setCode(''); recharger()
    } catch (er) { setMsg({ ok: false, texte: er.message }) }
  }
  const prendre = async (id) => { try { await reseau.patch(`references/${id}`, { etat: 'prise' }, s.jeton); recharger() } catch (er) { setMsg({ ok: false, texte: er.message }) } }
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
      <section className="carte" id="accueil">
        <h2>Enfants sur place ({c.surPlaceListe.length})</h2>
        <form onSubmit={accueillir} className="ligne-code">
          <label>Un enfant arrive : tapez son code<input value={code} placeholder="AG-0001" maxLength={12} autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase())} required /></label>
          <button className="bouton" type="submit">Enregistrer son arrivée</button>
        </form>
        {msg && <p role="status" className={msg.ok ? 'succes' : 'erreur'}>{msg.texte}</p>}
        {c.surPlaceListe.length === 0 ? <p className="petit">Aucun enfant sur place pour le moment.</p> : (
          <ul className="liste-enfants">
            {c.surPlaceListe.map((x) => (
              <li key={x.id}>
                <b>{x.code ?? 'Enfant envoyé'}</b>
                <span className="petit">{maj(x.village)} · {x.cas}{x.niveau === 'urgent' ? ' · urgent' : ''}</span>
                <button className="bouton secondaire petit-bouton" onClick={() => prendre(x.id)}>Prendre en charge</button>
              </li>
            ))}
          </ul>
        )}
        <p><Link className="petit" to="/reseau/references">Voir aussi les cas annoncés (en route)</Link></p>
      </section>
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
const NOTES = [[1, 'À stimuler'], [2, 'En progrès'], [3, 'Acquis'], [4, 'Très à l’aise']]

/** Suivi d'éveil et d'apprentissage : quatre domaines, évolution sur 6 mois, enfants à stimuler et activités conseillées. */
function Eveil({ v, s, recharger }) {
  const e = v.eveil
  const [f, setF] = useState({ code: '', ageMois: '', langage: 3, motricite: 3, social: 3, cognition: 3 })
  const [msg, setMsg] = useState('')
  const [conseils, setConseils] = useState([])
  const envoyer = async (ev) => {
    ev.preventDefault(); setMsg(''); setConseils([])
    const r = await envoyerOuGarder('structures/moi/observation', { ...f, code: f.code.toUpperCase(), ageMois: Number(f.ageMois) || 0 })
    if (r.ok) {
      setMsg(r.donnees.signalement ? 'Observation enregistrée. Plusieurs domaines sont faibles : le centre de santé a été prévenu pour une évaluation.' : 'Observation enregistrée.')
      setConseils(r.donnees.conseils ?? []); setF({ ...f, code: '' }); recharger()
    } else setMsg(r.gardee ? 'Pas de réseau : l’observation est gardée et partira au retour de la connexion.' : r.erreur)
  }
  return (
    <>
      <div className="grille-graphes">
        <Anneaux titre="Éveil et apprentissage" aide={`${e.observes} enfants observés, dernière observation de chacun.`} items={e.domaines.map((d) => ({ id: d.id, nom: d.libelle, pct: d.pct }))} />
        <Evolution titre="Évolution sur 6 mois" donnees={e.evolution.map((x) => ({ etiquette: x.mois.slice(5) + '/' + x.mois.slice(2, 4), pct: x.pct }))} />
      </div>
      <section className="carte">
        <h2>Enfants à stimuler ({e.aStimuler.length})</h2>
        {e.aStimuler.length === 0 ? <p>Aucun enfant à stimuler en ce moment.</p> : (
          <ul className="liste-coches">{e.aStimuler.map((x) => <li key={x.code}><b>{x.code}</b> : {x.domaines.join(', ')}</li>)}</ul>
        )}
        <details>
          <summary>Activités conseillées par domaine</summary>
          <ul className="liste-coches">{e.domaines.map((d) => <li key={d.id}><b>{d.libelle}</b> : {d.activite}</li>)}</ul>
        </details>
      </section>
      <section className="carte">
        <h2>Noter l’éveil d’un enfant</h2>
        <form onSubmit={envoyer} className="ado-champs">
          <label>Code de l’enfant<input value={f.code} placeholder="AG-0042" maxLength={12} onChange={(ev) => setF({ ...f, code: ev.target.value.toUpperCase() })} required /></label>
          <label>Âge en mois<input type="number" min="0" max="71" value={f.ageMois} onChange={(ev) => setF({ ...f, ageMois: ev.target.value })} /></label>
          {e.domaines.map((d) => (
            <label key={d.id}>{d.libelle}<select value={f[d.id]} onChange={(ev) => setF({ ...f, [d.id]: Number(ev.target.value) })}>{NOTES.map(([n, l]) => <option key={n} value={n}>{l}</option>)}</select></label>
          ))}
          <p><button className="bouton" type="submit">Enregistrer</button></p>
        </form>
        {msg && <p role="status">{msg}</p>}
        {conseils.length > 0 && <ul className="liste-coches">{conseils.map((c) => <li key={c}>{c}</li>)}</ul>}
        <p className="petit">Une observation par enfant et par mois suffit. Pas un diagnostic : un repère pour agir tôt.</p>
      </section>
    </>
  )
}

/** Liste des enfants de l'établissement : on tape le code, l'enfant déjà sur Fil d'Or apparaît, un clic l'ajoute. */
function MesEnfants({ v, s, recharger, signaler }) {
  const [code, setCode] = useState('')
  const [fiche, setFiche] = useState(null)
  const [inconnu, setInconnu] = useState(false)
  const [age, setAge] = useState('')
  const [msg, setMsg] = useState(null)
  const remettre = () => { setCode(''); setFiche(null); setInconnu(false); setAge('') }
  const chercher = async (e) => {
    e.preventDefault(); setMsg(null); setFiche(null); setInconnu(false)
    try { setFiche(await reseau.get(`structures/moi/enfant/${encodeURIComponent(code.trim().toUpperCase())}`, s.jeton)) }
    catch (er) { if (er.statut === 404) setInconnu(true); else setMsg({ ok: false, texte: er.message }) }
  }
  const ajouter = async () => {
    try {
      const r = await reseau.post('structures/moi/enfants', { code: code.trim().toUpperCase(), ageMois: age === '' ? undefined : Number(age) }, s.jeton)
      setMsg({ ok: true, texte: r.doublon ? 'Cet enfant est déjà dans votre liste.' : `${code.trim().toUpperCase()} ajouté à votre liste.` })
      remettre(); recharger()
    } catch (er) { setMsg({ ok: false, texte: er.message }) }
  }
  const retirer = async (c) => { try { await reseau.post(`structures/moi/enfants/${c}/retirer`, {}, s.jeton); recharger() } catch (er) { setMsg({ ok: false, texte: er.message }) } }
  return (
    <section className="carte" id="enfants">
      <h2>Mes enfants ({v.enfants.length})</h2>
      <form onSubmit={chercher} className="ligne-code">
        <label>Ajouter un enfant : tapez son code<input value={code} placeholder="AG-0001" maxLength={12} autoComplete="off" onChange={(e) => { setCode(e.target.value.toUpperCase()); setFiche(null); setInconnu(false) }} required /></label>
        <button className="bouton" type="submit">Chercher</button>
      </form>
      {fiche && (
        <div className="fiche-enfant">
          <p><b>{fiche.code}</b> · {agePhrase(fiche.ageMois)} · village de {maj(fiche.village)}</p>
          <p className="petit">{fiche.soinsAFaire.length ? `À faire : ${fiche.soinsAFaire.join(', ').toLowerCase()}` : 'Soins à jour'} · déjà connu de Fil d’Or</p>
          {fiche.dejaInscrit ? <p className="succes">Déjà dans votre liste.</p> : <button className="bouton" onClick={ajouter}>Ajouter à ma liste</button>}
        </div>
      )}
      {inconnu && (
        <div className="fiche-enfant">
          <p>Ce code n’est pas encore sur Fil d’Or. Vous pouvez l’ajouter avec son âge.</p>
          <label>Âge en mois<input type="number" min="0" max="143" value={age} onChange={(e) => setAge(e.target.value)} /></label>
          <button className="bouton" onClick={ajouter} disabled={age === ''}>Ajouter comme nouvel enfant</button>
        </div>
      )}
      {msg && <p role="status" className={msg.ok ? 'succes' : 'erreur'}>{msg.texte}</p>}
      {v.enfants.length === 0 ? <p className="petit">Aucun enfant dans la liste : tapez un code ci-dessus.</p> : (
        <div className="tableau-conteneur">
          <table>
            <thead><tr><th>Code</th><th>Âge</th><th>Village</th><th>Vaccins et soins</th><th>Éveil</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {v.enfants.map((e) => (
                <tr key={e.code}>
                  <th scope="row">{e.code}</th>
                  <td>{agePhrase(e.ageMois)}</td>
                  <td>{maj(e.village)}</td>
                  <td>{!e.connu ? 'Non suivi' : e.soinsAFaire.length ? <b className="pastille pastille-prioritaire">{e.soinsAFaire.length} à faire</b> : 'À jour'}</td>
                  <td>{e.aStimuler.length ? <b className="pastille pastille-prioritaire">À stimuler</b> : 'Bien'}</td>
                  <td className="actions">
                    <button className="bouton secondaire petit-bouton" onClick={() => signaler(e.code)}>Prévenir le centre</button>{' '}
                    <button className="bouton secondaire petit-bouton" onClick={() => retirer(e.code)}>Retirer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="petit">Un code, jamais un nom. L’enfant déjà suivi par un agent est reconnu tout de suite.</p>
    </section>
  )
}

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
      <MesEnfants v={v} s={s} recharger={recharger} signaler={(c) => { setF({ code: c, motif: 'absent' }); document.getElementById('signaler')?.scrollIntoView({ behavior: 'smooth' }) }} />
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
      <Eveil v={v} s={s} recharger={recharger} />
      <section className="carte" id="signaler">
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
                <div><dt>Éveil</dt><dd>{e.eveilIndice ?? '–'} %{e.eveilAStimuler > 0 && <em> dont {e.eveilAStimuler} à stimuler</em>}</dd></div>
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
