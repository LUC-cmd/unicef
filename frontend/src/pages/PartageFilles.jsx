import { useEffect, useMemo, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { lireCartePerso, lireFille, lireMesPartages, noterMonPartage, noterVus } from '../lib/fille.js'
import { reseau } from '../lib/reseauClient.js'

const depuis = (iso) => { const h = (Date.now() - new Date(iso).getTime()) / 3600000; return h < 1 ? 'il y a moins d’une heure' : h < 48 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} jours` }

function Message({ x, moi, maj, fille, code }) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [msg, setMsg] = useState(null)
  const agir = async (chemin, corps = {}) => { try { maj(await reseau.post(`partages/${x.id}/${chemin}`, { code, pseudo: fille.pseudo, ...corps }, '')); return true } catch (e) { setMsg(e.message); return false } }
  const repondre = async (e) => { e.preventDefault(); setMsg(null); if (await agir('commentaires', { texte })) setTexte('') }
  return (
    <article className={`partage${moi ? ' partage-moi' : ''}`}>
      <header><b>{x.pseudo}{moi ? ' (toi)' : ''}</b><span className="petit">{x.themeLibelle} · {depuis(x.heure)}</span></header>
      <p>{x.texte}</p>
      <div className="partage-actions">
        <button type="button" className="bouton secondaire petit-bouton" onClick={() => agir('moi-aussi')}>Moi aussi · {x.moiAussi}</button>
        <button type="button" className="bouton secondaire petit-bouton" onClick={() => setOuvert((o) => !o)}>{ouvert ? 'Masquer les réponses' : `Réponses (${x.commentaires.length}) et répondre`}</button>
        <button type="button" className="lien-bouton petit" onClick={() => { if (window.confirm('Signaler ce message à l’équipe ?')) agir('signaler') }}>Signaler</button>
      </div>
      {ouvert && (
        <div className="partage-reponses">
          {x.commentaires.map((k) => (
            <p key={k.id} className={`partage-reponse${k.agent ? ' agent' : ''}`}><b>{k.pseudo}{k.agent ? ' · professionnelle' : ''}</b> <span className="petit">{depuis(k.heure)}</span><br />{k.texte}</p>
          ))}
          <form onSubmit={repondre} className="ligne-code">
            <label>Ta réponse : comment as-tu fait ?<input value={texte} maxLength={500} onChange={(e) => setTexte(e.target.value)} placeholder="Moi, ce qui m’a aidé…" required /></label>
            <button className="bouton" type="submit">Répondre</button>
          </form>
          {msg && <p role="alert" className="erreur">{msg}</p>}
        </div>
      )}
    </article>
  )
}

/** Parler entre filles : anonyme, sans numéro ni adresse, modéré. On écrit un message, les autres répondent avec leur expérience. */
export default function PartageFilles() {
  const fille = lireFille()
  const code = lireCartePerso()
  const [d, setD] = useState(null)
  const [theme, setTheme] = useState('')
  const [f, setF] = useState({ theme: 'regles', texte: '' })
  const [msg, setMsg] = useState(null)
  const mes = lireMesPartages()
  const charger = () => reseau.get('partages', '').then(setD).catch((e) => setMsg({ ok: false, texte: e.message }))
  useEffect(() => { charger() }, [])
  useEffect(() => { // ce que j'ai déjà lu : plus de notification pour ces réponses
    if (mes.length) reseau.post('partages/suivi', { ids: mes }, '').then((r) => noterVus(r.suivi)).catch(() => {})
  }, [d]) // eslint-disable-line react-hooks/exhaustive-deps
  const liste = useMemo(() => (d?.partages ?? []).filter((x) => !theme || x.theme === theme), [d, theme])
  if (!d) return <><Bandeau titre="Parler entre filles">Chargement…</Bandeau>{msg && <p role="alert" className="erreur">{msg.texte}</p>}</>
  const maj = (x) => setD((e) => ({ ...e, partages: e.partages.map((y) => (y.id === x.id ? x : y)) }))
  const poster = async (e) => {
    e.preventDefault(); setMsg(null)
    try {
      const r = await reseau.post('partages', { code, pseudo: fille.pseudo, ...f }, '')
      noterMonPartage(r.partage.id); setF({ ...f, texte: '' }); setD((e2) => ({ ...e2, partages: [r.partage, ...e2.partages] }))
      setMsg({ ok: true, texte: r.soutien || 'Ton message est publié. D’autres filles pourront te répondre.' })
    } catch (er) { setMsg({ ok: false, texte: er.message }) }
  }
  return (
    <>
      <Bandeau titre="Parler entre filles">Tu n’es pas seule. Écris ce qui te préoccupe, d’autres filles répondent avec ce qui les a aidées. Personne ne connaît ton nom.</Bandeau>
      <section className="carte partage-regles">
        <p><b>Pour rester en sécurité :</b> pas de numéro de téléphone, pas d’adresse, pas de nom complet, pas de photo. Une équipe de santé lit les messages signalés. Si tu es en danger, va au centre de santé ou parle à une personne de confiance.</p>
      </section>
      <section className="carte">
        <h2>Écrire un message</h2>
        <form onSubmit={poster} className="ado-champs">
          <label>Sujet<select value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })}>{Object.entries(d.themes).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <label>Ton message (sous le surnom {fille.pseudo})<textarea rows="3" maxLength={600} value={f.texte} onChange={(e) => setF({ ...f, texte: e.target.value })} placeholder="Je voudrais en parler parce que…" required /></label>
          <p><button className="bouton" type="submit">Publier</button></p>
        </form>
        {msg && <p role="status" className={msg.ok ? 'succes' : 'erreur'}>{msg.texte}</p>}
      </section>
      <div className="filtres" role="group" aria-label="Sujet">
        <button type="button" className={`filtre${theme === '' ? ' actif' : ''}`} onClick={() => setTheme('')}>Tout</button>
        {Object.entries(d.themes).map(([k, n]) => <button key={k} type="button" className={`filtre${theme === k ? ' actif' : ''}`} onClick={() => setTheme(k)}>{n}</button>)}
      </div>
      {liste.length === 0 ? <p className="petit">Aucun message sur ce sujet pour le moment. Écris le premier.</p> : liste.map((x) => <Message key={x.id} x={x} moi={mes.includes(x.id)} maj={maj} fille={fille} code={code} />)}
    </>
  )
}
