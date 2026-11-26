import { useEffect, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import Attestation from '../components/Attestation.jsx'
import { reseau } from '../lib/reseauClient.js'
import { useDonnees } from './Suivi.jsx'

/** Réduit l'image importée à 360 px au plus, pour qu'elle reste légère (cachets fournis par photo ou fichier). */
function lireImage(fichier) {
  return new Promise((ok, ko) => {
    const lecteur = new FileReader()
    lecteur.onerror = () => ko(new Error('Fichier illisible.'))
    lecteur.onload = () => {
      if (fichier.type === 'image/svg+xml') { ok(lecteur.result); return }
      const img = new Image()
      img.onerror = () => ko(new Error('Image illisible.'))
      img.onload = () => {
        const k = Math.min(1, 360 / Math.max(img.width, img.height))
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        ok(c.toDataURL('image/png'))
      }
      img.src = lecteur.result
    }
    lecteur.readAsDataURL(fichier)
  })
}

/** Hôpital ou centre : importer le cachet, établir une attestation tamponnée, la famille la retrouve dans son espace. */
export default function Attestations({ s }) {
  const [c, erreur, recharger] = useDonnees('centre/moi/cachet', s.jeton, 600000)
  const [liste, , rechargerListe] = useDonnees('centre/moi/attestations', s.jeton, 15000)
  const [image, setImage] = useState('')
  const [resp, setResp] = useState({ responsable: '', titre: '' })
  const [msg, setMsg] = useState(null)
  const [f, setF] = useState({ type: 'accouchement', famille: '', enfant: '', date: new Date().toISOString().slice(0, 10), note: '' })
  const [dernier, setDernier] = useState(null)
  const [num, setNum] = useState('')
  const [verif, setVerif] = useState(null)
  useEffect(() => { if (c?.cachet) { setImage(c.cachet.image); setResp({ responsable: c.cachet.responsable, titre: c.cachet.titre }) } }, [c])
  if (!c || !liste) return <><Bandeau titre="Cachet et attestations">Chargement…</Bandeau>{erreur && <p role="alert" className="erreur">{erreur}</p>}</>
  const choisir = async (e) => { try { setImage(await lireImage(e.target.files[0])); setMsg(null) } catch (er) { setMsg({ ok: false, texte: er.message }) } }
  const enregistrer = async (e) => {
    e.preventDefault()
    try { await reseau.post('centre/moi/cachet', { image, ...resp }, s.jeton); setMsg({ ok: true, texte: 'Cachet enregistré : il sera apposé sur les attestations.' }); recharger() }
    catch (er) { setMsg({ ok: false, texte: er.message }) }
  }
  const etablir = async (e) => {
    e.preventDefault(); setMsg(null)
    try { const a = await reseau.post('centre/moi/attestations', { ...f, famille: f.famille.trim().toUpperCase(), enfant: f.enfant.trim().toUpperCase() }, s.jeton); setDernier(a); setF({ ...f, famille: '', enfant: '', note: '' }); rechargerListe() }
    catch (er) { setMsg({ ok: false, texte: er.message }) }
  }
  const verifier = async (e) => { e.preventDefault(); try { setVerif(await reseau.get(`attestations/verifier/${encodeURIComponent(num.trim().toUpperCase())}`, '')) } catch (er) { setVerif({ valide: false }) } }
  const a_cachet = Boolean(c.cachet)
  return (
    <>
      <Bandeau titre="Cachet et attestations">Importez le cachet de l’établissement une fois. Chaque attestation (accouchement, naissance, prise en charge) en porte l’empreinte, et la famille la retrouve dans son espace pour l’imprimer.</Bandeau>
      <div className="tuiles">
        <div className={`tuile ${a_cachet ? '' : 'alerte'}`}><b>{a_cachet ? 'Oui' : 'Non'}</b><span>cachet enregistré</span></div>
        <div className="tuile"><b>{liste.attestations.length}</b><span>attestations établies</span></div>
      </div>
      {msg && <p role="status" className={msg.ok ? 'succes' : 'erreur'}>{msg.texte}</p>}
      <section className="carte">
        <h2>1. Le cachet de l’établissement</h2>
        <form className="ado-champs" onSubmit={enregistrer}>
          <label>Image du cachet (photo ou fichier)<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={choisir} /></label>
          {image && <img className="att-cachet" src={image} alt="Aperçu du cachet" />}
          <label>Nom du responsable qui signe<input value={resp.responsable} maxLength={60} onChange={(e) => setResp({ ...resp, responsable: e.target.value })} required /></label>
          <label>Fonction<input value={resp.titre} maxLength={60} placeholder="Médecin-chef" onChange={(e) => setResp({ ...resp, titre: e.target.value })} /></label>
          <p><button className="bouton" type="submit" disabled={!image}>Enregistrer le cachet</button></p>
        </form>
        <p className="petit">Astuce : tamponnez une feuille blanche, prenez-la en photo, importez la photo.</p>
      </section>
      <section className="carte">
        <h2>2. Établir une attestation</h2>
        <form className="ado-champs" onSubmit={etablir}>
          <label>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(liste.types).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <label>Code de la famille<input value={f.famille} placeholder="F-0001" maxLength={12} onChange={(e) => setF({ ...f, famille: e.target.value.toUpperCase() })} required /></label>
          <label>Code de l’enfant (facultatif)<input value={f.enfant} placeholder="T045A" maxLength={12} onChange={(e) => setF({ ...f, enfant: e.target.value.toUpperCase() })} /></label>
          <label>Date de l’événement<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label>Remarque (facultatif)<input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
          <p><button className="bouton" type="submit" disabled={!a_cachet}>Établir et tamponner</button>{!a_cachet && <span className="petit"> Enregistrez d’abord le cachet.</span>}</p>
        </form>
        {dernier && <><p className="succes" role="status">Attestation {dernier.numero} établie. La famille {dernier.famille} la voit dans son espace.</p><Attestation a={dernier} /></>}
      </section>
      <section className="carte">
        <h2>Attestations établies ({liste.attestations.length})</h2>
        {liste.attestations.length === 0 ? <p className="petit">Aucune pour l’instant.</p> : (
          <div className="tableau-conteneur"><table>
            <thead><tr><th>N°</th><th>Type</th><th>Famille</th><th>Date</th></tr></thead>
            <tbody>{liste.attestations.map((a) => <tr key={a.id}><th scope="row">{a.numero}</th><td>{a.libelle}</td><td>{a.famille}{a.enfant ? ` · ${a.enfant}` : ''}</td><td>{a.dateEvenement}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
      <section className="carte">
        <h2>Vérifier un numéro d’attestation</h2>
        <form className="ligne-code" onSubmit={verifier}>
          <label>Numéro<input value={num} placeholder="ATT-C4-0001" onChange={(e) => { setNum(e.target.value.toUpperCase()); setVerif(null) }} /></label>
          <button className="bouton secondaire" type="submit">Vérifier</button>
        </form>
        {verif && <p role="status" className={verif.valide ? 'succes' : 'erreur'}>{verif.valide ? `Valide : ${verif.type}, établie par ${verif.centre.replace(/ \(fictifs?\)| \(fictives?\)/, '')} le ${verif.date}.` : 'Ce numéro ne correspond à aucune attestation.'}</p>}
      </section>
    </>
  )
}
