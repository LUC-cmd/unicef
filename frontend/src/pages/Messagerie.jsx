import { useCallback, useEffect, useRef, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'

const ROLES = { national: 'National', district: 'District', agent: 'Agent', centre: 'Centre ou hôpital', ecole: 'Crèche ou école', boutique: 'Boutique', technicien: 'Technicien' }
const heure = (t) => { try { const d = new Date(t); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) } catch { return '' } }

/** Réduit une photo choisie à 960 px de large, en JPEG, pour qu'elle passe même avec un réseau faible (190 Ko au plus). */
export function reduirePhoto(fichier, max = 960) {
  return new Promise((resolve, reject) => {
    if (!fichier.type.startsWith('image/')) { reject(new Error('Choisissez une image.')); return }
    const img = new Image(); const url = URL.createObjectURL(fichier)
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')) }
    img.onload = () => {
      URL.revokeObjectURL(url)
      let q = 0.75, l = Math.min(1, max / img.width)
      for (let essai = 0; essai < 6; essai += 1) {
        const c = document.createElement('canvas'); c.width = Math.round(img.width * l); c.height = Math.round(img.height * l)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        const data = c.toDataURL('image/jpeg', q)
        if (data.length <= 250000) { resolve(data); return }
        q -= 0.1; l *= 0.85
      }
      reject(new Error('Photo trop lourde, choisissez-en une autre.'))
    }
    img.src = url
  })
}

/** Messagerie entre les comptes du réseau : texte, photo, message urgent. Jamais de nom d'enfant : un code suffit. */
export default function Messagerie({ s }) {
  const [fils, setFils] = useState([])
  const [contacts, setContacts] = useState([])
  const [avec, setAvec] = useState('')
  const [conv, setConv] = useState(null)
  const [texte, setTexte] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [photo, setPhoto] = useState('')
  const [msg, setMsg] = useState('')
  const [recherche, setRecherche] = useState('')
  const fin = useRef(null)
  const champ = useRef(null)
  const charger = useCallback(async () => {
    try {
      const f = await reseau.get('messages', s.jeton); setFils(f.fils)
      if (avec) { const c = await reseau.get(`messages/${avec}`, s.jeton); setConv(c) }
    } catch { /* hors ligne */ }
  }, [s.jeton, avec])
  useEffect(() => { reseau.get('contacts', s.jeton).then((r) => setContacts(r.contacts)).catch(() => {}) }, [s.jeton])
  useEffect(() => { charger(); const t = setInterval(charger, 6000); return () => clearInterval(t) }, [charger])
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [conv?.messages?.length])
  const nomDe = (id) => contacts.find((c) => c.identifiant === id)?.nom ?? fils.find((f) => f.avec === id)?.nom ?? id
  const envoyer = async (e) => {
    e.preventDefault()
    if (!avec || (!texte.trim() && !photo)) return
    const r = await envoyerOuGarder('messages', { a: avec, texte: texte.trim(), urgent, photo })
    if (r.ok || r.gardee) {
      setMsg(r.gardee ? 'Pas de réseau : le message est gardé et partira dès que la connexion revient.' : '')
      if (r.gardee) setConv((c) => ({ ...(c ?? { avec, messages: [] }), messages: [...(c?.messages ?? []), { id: 'attente-' + Date.now(), moi: true, texte: texte.trim(), photo, urgent, heure: new Date().toISOString(), lu: false, attente: true }] }))
      setTexte(''); setUrgent(false); setPhoto(''); charger()
    } else setMsg(r.erreur)
  }
  const choisirPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { setPhoto(await reduirePhoto(f)); setMsg('') } catch (er) { setMsg(er.message) }
  }
  const ouverts = new Set(fils.map((f) => f.avec))
  const autres = contacts.filter((c) => !ouverts.has(c.identifiant) && c.nom.toLowerCase().includes(recherche.toLowerCase()))
  return (
    <>
      <Bandeau titre="Messagerie">Écrire à un collègue, un centre, un district. Joindre une photo. Marquer un message urgent quand il faut agir tout de suite. Pas de nom d’enfant : écrivez son code.</Bandeau>
      <div className="messagerie">
        <aside className="msg-liste" aria-label="Conversations">
          <h2>Conversations</h2>
          {fils.length === 0 && <p className="petit">Aucune conversation. Choisissez quelqu’un ci-dessous.</p>}
          {fils.map((f) => (
            <button key={f.avec} type="button" className={`msg-fil${avec === f.avec ? ' actif' : ''}${f.urgent ? ' urgent' : ''}`} onClick={() => setAvec(f.avec)}>
              <span><b>{f.nom}</b><small>{ROLES[f.role] ?? ''} · {heure(f.heure)}</small><em>{f.dernier}</em></span>
              {f.nonLus > 0 && <i className="cloche-badge">{f.nonLus}</i>}
            </button>
          ))}
          <h2>Nouvelle conversation</h2>
          <label className="petit">Chercher une personne<input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou lieu" /></label>
          <div className="msg-contacts">
            {autres.slice(0, 12).map((c) => <button key={c.identifiant} type="button" className="msg-contact" onClick={() => setAvec(c.identifiant)}><b>{c.nom}</b><small>{ROLES[c.role] ?? c.role}</small></button>)}
            {autres.length === 0 && <p className="petit">Personne d’autre à afficher.</p>}
          </div>
        </aside>
        <section className="msg-fenetre" aria-live="polite">
          {!avec ? <p className="msg-vide">Choisissez une conversation à gauche pour écrire.</p> : (
            <>
              <header><h2>{nomDe(avec)}</h2></header>
              <div className="msg-fil-liste">
                {(conv?.messages ?? []).length === 0 && <p className="petit">Pas encore de message. Écrivez le premier.</p>}
                {(conv?.messages ?? []).map((m) => (
                  <div key={m.id} className={`msg-bulle${m.moi ? ' moi' : ''}${m.urgent ? ' urgent' : ''}`}>
                    {m.urgent && <strong className="msg-urg">Urgent</strong>}
                    {m.photo && <img src={m.photo} alt="Photo jointe" />}
                    {m.texte && <p>{m.texte}</p>}
                    <small>{heure(m.heure)}{m.moi ? (m.attente ? ' · en attente de réseau' : m.lu ? ' · lu' : ' · envoyé') : ''}</small>
                  </div>
                ))}
                <div ref={fin} />
              </div>
              <form onSubmit={envoyer} className="msg-envoi">
                {photo && <div className="msg-apercu"><img src={photo} alt="Photo à envoyer" /><button type="button" className="bouton secondaire petit-bouton" onClick={() => setPhoto('')}>Retirer la photo</button></div>}
                <textarea value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={1000} rows={2} placeholder="Votre message (un code d’enfant, jamais un nom)" aria-label="Votre message" />
                <div className="boutons-ligne">
                  <button type="submit" className="bouton" disabled={!texte.trim() && !photo}>Envoyer</button>
                  <button type="button" className="bouton secondaire" onClick={() => champ.current?.click()}>Joindre une photo</button>
                  <label className="msg-urgent-case"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> Message urgent</label>
                  <input ref={champ} type="file" accept="image/*" capture="environment" hidden onChange={choisirPhoto} />
                </div>
                {msg && <p role="status" className="petit"><b>{msg}</b></p>}
              </form>
            </>
          )}
        </section>
      </div>
    </>
  )
}
