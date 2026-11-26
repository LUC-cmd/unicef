import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { reseau } from '../lib/reseauClient.js'
import { useDonnees } from './Suivi.jsx'

const depuis = (iso) => { const h = (Date.now() - new Date(iso).getTime()) / 3600000; return h < 1 ? 'il y a moins d’une heure' : h < 48 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} jours` }

/** Agent ou centre : les messages des filles à surveiller (sujets graves, signalements). Répondre en professionnelle, masquer ou rétablir. */
export default function Moderation({ s }) {
  const [d, erreur, recharger] = useDonnees('partages/moderation', s.jeton, 10000)
  const [textes, setTextes] = useState({})
  const [msg, setMsg] = useState('')
  if (!d) return <><Bandeau titre="Messages des filles">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const masquer = async (id, cache) => { try { await reseau.patch(`partages/${id}`, { cache }, s.jeton); recharger() } catch (e) { setMsg(e.message) } }
  const repondre = async (id) => {
    try { await reseau.post(`partages/${id}/commentaires`, { texte: textes[id] ?? '' }, s.jeton); setTextes({ ...textes, [id]: '' }); recharger() } catch (e) { setMsg(e.message) }
  }
  const graves = d.partages.filter((x) => x.sensible && !x.cache)
  return (
    <>
      <Bandeau titre="Messages des filles">Les messages qui parlent de violence, de pression ou de danger, et ceux que d’autres filles ont signalés. Répondez en professionnelle : la jeune fille voit votre réponse dans ses notifications. Aucun nom, aucune adresse.</Bandeau>
      <div className="tuiles">
        <div className={`tuile ${graves.length ? 'alerte' : ''}`}><b>{graves.length}</b><span>sujet{graves.length > 1 ? 's' : ''} grave{graves.length > 1 ? 's' : ''} à lire</span></div>
        <div className="tuile"><b>{d.partages.filter((x) => x.signale && !x.cache).length}</b><span>signalé{d.partages.length > 1 ? 's' : ''}</span></div>
        <div className="tuile"><b>{d.partages.filter((x) => x.cache).length}</b><span>masqué{d.partages.length > 1 ? 's' : ''}</span></div>
      </div>
      {msg && <p role="alert" className="erreur">{msg}</p>}
      {d.partages.length === 0 ? <section className="carte"><p>Rien à surveiller pour le moment.</p></section> : d.partages.map((x) => (
        <article key={x.id} className="partage">
          <header><b>{x.pseudo}</b><span className="petit">{x.themeLibelle} · {depuis(x.heure)}</span></header>
          <p>{x.texte}</p>
          <p className="petit">{x.sensible && <b className="pastille pastille-prioritaire">Sujet grave </b>} {x.signale > 0 && <b className="pastille pastille-prioritaire">{x.signale} signalement{x.signale > 1 ? 's' : ''} </b>} {x.cache && <b className="pastille">Masqué</b>}</p>
          {x.commentaires.map((k) => <p key={k.id} className={`partage-reponse${k.agent ? ' agent' : ''}`}><b>{k.pseudo}</b> <span className="petit">{depuis(k.heure)}</span><br />{k.texte}</p>)}
          {!x.cache && (
            <div className="ligne-code">
              <label>Votre réponse<input value={textes[x.id] ?? ''} maxLength={500} onChange={(e) => setTextes({ ...textes, [x.id]: e.target.value })} placeholder="Merci de l’avoir écrit. Passe nous voir au centre…" /></label>
              <button className="bouton" type="button" disabled={(textes[x.id] ?? '').trim().length < 5} onClick={() => repondre(x.id)}>Répondre</button>
            </div>
          )}
          <div className="partage-actions">
            <button type="button" className="bouton secondaire petit-bouton" onClick={() => masquer(x.id, !x.cache)}>{x.cache ? 'Rétablir ce message' : 'Masquer ce message'}</button>
          </div>
        </article>
      ))}
    </>
  )
}
