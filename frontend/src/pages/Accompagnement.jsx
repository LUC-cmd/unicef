import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { reseau } from '../lib/reseauClient.js'
import { useDonnees } from './Suivi.jsx'

const maj = (t) => (t ? t[0].toUpperCase() + t.slice(1) : '')
const depuis = (iso) => { const h = (Date.now() - new Date(iso).getTime()) / 3600000; return h < 1 ? 'il y a moins d’une heure' : h < 48 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} jours` }

/** Agent de santé ou centre : les jeunes filles qui ont accepté d'être contactées. Les autres restent anonymes. */
export default function Accompagnement({ s }) {
  const [d, erreur, recharger] = useDonnees('accompagnement', s.jeton, 8000)
  const [msg, setMsg] = useState('')
  if (!d) return <><Bandeau titre="Filles à contacter">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const attente = d.contacts.filter((x) => x.etat === 'a-contacter')
  const faites = d.contacts.filter((x) => x.etat !== 'a-contacter')
  const fait = async (id) => { try { await reseau.patch(`accompagnement/${id}`, {}, s.jeton); recharger() } catch (e) { setMsg(e.message) } }
  return (
    <>
      <Bandeau titre="Filles à contacter">Ces jeunes filles ont choisi de donner leur prénom et ont dit comment être contactées. Les autres restent anonymes : ne cherchez jamais à les identifier.</Bandeau>
      <div className="tuiles">
        <div className={`tuile ${attente.length ? 'alerte' : ''}`}><b>{attente.length}</b><span>à contacter</span></div>
        <div className="tuile"><b>{faites.length}</b><span>déjà contactées</span></div>
      </div>
      <section className="carte">
        <h2>À contacter ({attente.length})</h2>
        {attente.length === 0 ? <p className="petit">Personne n’attend. Bravo.</p> : (
          <ul className="liste-enfants">
            {attente.map((x) => (
              <li key={x.id}>
                <b>{x.prenom}{x.nom ? ` ${x.nom}` : ''}</b>
                <span className="petit">{d.motifs[x.motif]} · {d.canaux[x.canal]}{x.telephone ? ` : ${x.telephone}` : ''}{x.village ? ` · ${maj(x.village)}` : ''} · {depuis(x.heure)}</span>
                <button className="bouton" onClick={() => fait(x.id)}>C’est fait : contactée</button>
              </li>
            ))}
          </ul>
        )}
        {msg && <p role="alert" className="erreur">{msg}</p>}
      </section>
      {faites.length > 0 && (
        <section className="carte">
          <h2>Déjà contactées ({faites.length})</h2>
          <ul className="liste-coches">{faites.map((x) => <li key={x.id}>{x.prenom} · {d.motifs[x.motif]} · {depuis(x.heure)}</li>)}</ul>
        </section>
      )}
      <p className="petit">Ces informations ne sont données qu’avec l’accord de la jeune fille, qui peut le retirer à tout moment : sa fiche disparaît alors de cette liste.</p>
    </>
  )
}
