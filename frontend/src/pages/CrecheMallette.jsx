import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import Picto from '../components/Picto.jsx'
import { api } from '../lib/api.js'
import { A_VALIDER, GROUPES_AGE, HYGIENE, MENUS, MODULES, REGLES_REPAS, SIGNES_ALERTE, groupeDe } from '../lib/mallette.js'

const iso = (d) => d.toISOString().slice(0, 10)
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function lire(cle) { try { return JSON.parse(localStorage.getItem(cle) || '[]') } catch { return [] } }

/** La mallette de la crèche : le programme du jour selon les enfants présents, le menu, l'hygiène, les signes d'alerte. */
export default function CrecheMallette() {
  const aujourdhui = iso(new Date())
  const jour = JOURS_FR[new Date().getDay()]
  const [duJour, setDuJour] = useState(null)
  const cle = `fildor.mallette.${aujourdhui}`
  const [faits, setFaits] = useState(() => lire(cle))

  useEffect(() => {
    api.get(`/api/structure/creche/reservations?du=${aujourdhui}&au=${aujourdhui}`)
      .then((l) => setDuJour(l.filter((r) => r.statut === 'CONFIRMEE')))
      .catch(() => setDuJour([]))
  }, [aujourdhui])

  function basculer(i) {
    const suite = faits.includes(i) ? faits.filter((x) => x !== i) : [...faits, i]
    setFaits(suite)
    try { localStorage.setItem(cle, JSON.stringify(suite)) } catch { /* stockage indisponible */ }
  }

  const groupes = useMemo(() => {
    const n = {}
    ;(duJour ?? []).forEach((r) => { const g = groupeDe(r.ageMois); if (g) n[g.code] = (n[g.code] ?? 0) + 1 })
    return n
  }, [duJour])
  const presentsGroupes = GROUPES_AGE.filter((g) => groupes[g.code])
  const menu = MENUS.find((m) => m.jour === jour) ?? MENUS[0]
  const hygieneFaite = faits.length

  return (
    <>
      <Bandeau surtitre="Ma crèche" titre="La mallette de la crèche">
        Tout pour tenir la journée : les jeux selon l'âge des enfants présents, le menu, l'hygiène et les signes pour lesquels on oriente vers le centre de santé.
      </Bandeau>
      <div className="creche-gestion mallette">
        <section className="carte" aria-labelledby="m-jeux">
          <h2 id="m-jeux"><Picto nom="danse" /> Le programme d'aujourd'hui</h2>
          {duJour === null && <p className="petit" role="status">Chargement…</p>}
          {duJour && duJour.length === 0 && <p className="petit">Aucun enfant confirmé aujourd'hui. Voici tout de même les jeux de chaque âge.</p>}
          {duJour && duJour.length > 0 && <p className="petit">{duJour.length} enfant(s) attendu(s). Les jeux ci-dessous sont choisis selon leur âge.</p>}
          {(presentsGroupes.length ? presentsGroupes : GROUPES_AGE).map((g) => (
            <div key={g.code} className="mal-groupe">
              <h3>{g.nom}{groupes[g.code] ? <span className="mal-nb"> · {groupes[g.code]} enfant(s)</span> : null}</h3>
              <ul>{g.activites.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
            </div>
          ))}
          <Link className="bouton secondaire" to="/jeux">Ouvrir les chansons et les jeux d'éveil</Link>
        </section>

        <section className="carte" aria-labelledby="m-menu">
          <h2 id="m-menu"><Picto nom="bol" /> Le menu du {jour}</h2>
          <ul className="mal-menu">
            <li><b>Matin</b><span>{menu.matin}</span></li>
            <li><b>Midi</b><span>{menu.midi}</span></li>
            <li><b>Collation</b><span>{menu.collation}</span></li>
          </ul>
          <ul className="mal-regles">{REGLES_REPAS.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="petit">Menu à adapter aux prix et aux produits du marché du jour. {A_VALIDER}</p>
        </section>

        <section className="carte" aria-labelledby="m-hyg">
          <h2 id="m-hyg"><Picto nom="savon" /> L'hygiène du jour : {hygieneFaite} sur {HYGIENE.length}</h2>
          <div className="mal-progres" role="img" aria-label={`${hygieneFaite} gestes faits sur ${HYGIENE.length}`}><i style={{ width: `${(100 * hygieneFaite) / HYGIENE.length}%` }} /></div>
          {HYGIENE.map((h, i) => (
            <label className="case" key={h}><input type="checkbox" checked={faits.includes(i)} onChange={() => basculer(i)} /><span>{h}</span></label>
          ))}
        </section>

        <section className="carte attention" aria-labelledby="m-alerte">
          <h2 id="m-alerte"><Picto nom="alerte" /> Quand on n'attend pas</h2>
          <p>Si un enfant a l'un de ces signes, <b>prévenez la famille et orientez-le vers le centre de santé le jour même</b>. Notez son code enfant et l'heure.</p>
          <ul className="mal-regles">{SIGNES_ALERTE.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        <section className="carte" aria-labelledby="m-form">
          <h2 id="m-form"><Picto nom="conseil" /> Formation express : deux minutes par carte</h2>
          {MODULES.map((m) => (
            <details key={m.id} className="mal-module">
              <summary>{m.titre}</summary>
              <ol>{m.lignes.map((l) => <li key={l}>{l}</li>)}</ol>
            </details>
          ))}
        </section>
      </div>
    </>
  )
}
