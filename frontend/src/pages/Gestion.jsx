import { useCallback, useEffect, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { reseau } from '../lib/reseauClient.js'

const ROLES = { district: 'Responsable de district', agent: 'Agent de santé', centre: 'Centre de santé ou hôpital', ecole: 'Crèche, jardin d’enfants ou école' }
const ETATS = { 'a-activer': 'À activer', actif: 'Actif', suspendu: 'Suspendu' }
const LANGUES = ['Éwé', 'Kabiyè', 'Mina', 'Autre']

/** Qui crée quoi : comptes (avec code d'activation à usage unique), villages, établissements. Réservé au district et au national. */
export default function Gestion({ s }) {
  const [lieux, setLieux] = useState(null)
  const [comptes, setComptes] = useState(null)
  const [creables, setCreables] = useState([])
  const [f, setF] = useState({ role: 'agent', nom: '', ref: '' })
  const [fiche, setFiche] = useState(null)
  const [erreur, setErreur] = useState('')
  const charger = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([reseau.get('lieux'), reseau.get('comptes', s.jeton)])
      setLieux(l); setComptes(c.comptes); setCreables(c.creables); setErreur('')
    } catch (e) { setErreur(e.message) }
  }, [s.jeton])
  useEffect(() => { charger() }, [charger])

  const villages = lieux ? Object.entries(lieux.routes.villages) : []
  const options = !lieux ? [] : f.role === 'centre' ? lieux.lieux.filter((l) => ['hopital', 'centre'].includes(l.type))
    : f.role === 'ecole' ? lieux.lieux.filter((l) => ['creche', 'jardin', 'ecole'].includes(l.type)) : []
  const creer = async (e) => {
    e.preventDefault(); setErreur(''); setFiche(null)
    try {
      const r = await reseau.post('comptes', f, s.jeton)
      setFiche({ ...r.compte, code: r.codeActivation }); setF({ ...f, nom: '' }); charger()
    } catch (er) { setErreur(er.message) }
  }
  const nouveauCode = async (c) => { try { const r = await reseau.post(`comptes/${c.identifiant}/code`, {}, s.jeton); setFiche({ ...r.compte, code: r.codeActivation }); charger() } catch (er) { setErreur(er.message) } }
  const basculer = async (c) => { try { await reseau.patch(`comptes/${c.identifiant}`, { actif: c.etat === 'suspendu' }, s.jeton); charger() } catch (er) { setErreur(er.message) } }

  return (
    <>
      <Bandeau titre="Comptes, villages et établissements">Le {s.role === 'national' ? 'national crée les districts, le district crée' : 'district crée'} les accès des agents, des centres et des écoles. Chaque accès commence par un code d’activation à usage unique, remis en main propre ou par SMS : la personne choisit elle-même son mot de passe.</Bandeau>
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      <section className="carte">
        <h2>Ouvrir un accès</h2>
        <form onSubmit={creer} className="ado-champs">
          <label>Type de compte<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, ref: '' })}>{creables.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</select></label>
          <label>Nom de la personne ou du lieu<input value={f.nom} maxLength={80} onChange={(e) => setF({ ...f, nom: e.target.value })} required /></label>
          {(f.role === 'centre' || f.role === 'ecole') && <label>{f.role === 'centre' ? 'Centre ou hôpital' : 'Établissement'}<select value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} required><option value="">Choisir</option>{options.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}</select></label>}
          {f.role === 'agent' && <label>Village de rattachement<select value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })}><option value="">Tout le district</option>{villages.map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}</select></label>}
          <p><button className="bouton" type="submit">Créer l’accès</button></p>
        </form>
        {fiche && (
          <div className="fiche-acces" role="status">
            <h3>Fiche d’accès : à remettre une seule fois</h3>
            <p><b>Nom</b> : {fiche.nom}<br /><b>Identifiant</b> : <code>{fiche.identifiant}</code><br /><b>Code d’activation</b> : <code className="gros-code">{fiche.code}</code></p>
            <p className="petit">Valable 14 jours, utilisable une fois. La personne ouvre la page de connexion du réseau, choisit « Première connexion », saisit l’identifiant et ce code, puis choisit son mot de passe. Ce code ne sera plus affiché.</p>
            <p><button type="button" className="bouton secondaire petit-bouton" onClick={() => window.print()}>Imprimer la fiche</button></p>
          </div>
        )}
      </section>
      <section className="carte">
        <h2>Accès ouverts ({comptes?.length ?? 0})</h2>
        {comptes?.length === 0 && <p>Aucun accès créé pour le moment. Les comptes de démonstration ne figurent pas ici.</p>}
        <ul className="liste-coches">{(comptes ?? []).map((c) => (
          <li key={c.identifiant}><b>{c.nom}</b> · {ROLES[c.role]} · <code>{c.identifiant}</code> · <span className={`etat etat-${c.etat === 'actif' ? 'prise' : c.etat === 'suspendu' ? 'a-visiter' : 'envoyee'}`}>{ETATS[c.etat]}</span>
            {' '}{c.etat === 'a-activer' && <button type="button" className="bouton secondaire petit-bouton" onClick={() => nouveauCode(c)}>Nouveau code</button>}
            {c.etat !== 'a-activer' && <button type="button" className="bouton secondaire petit-bouton" onClick={() => basculer(c)}>{c.etat === 'actif' ? 'Suspendre' : 'Réactiver'}</button>}
          </li>
        ))}</ul>
      </section>
      <NouveauVillage villages={villages} jeton={s.jeton} onChange={charger} />
      <NouvelEtab villages={villages} jeton={s.jeton} onChange={charger} role={s.role} />
    </>
  )
}

function NouveauVillage({ villages, jeton, onChange }) {
  const [f, setF] = useState({ nom: '', x: '', y: '', langue: 'Éwé', enfants: '', relie: '' })
  const [msg, setMsg] = useState('')
  const envoyer = async (e) => {
    e.preventDefault(); setMsg('')
    try { await reseau.post('villages', { ...f, x: Number(f.x), y: Number(f.y), enfants: Number(f.enfants) || 0, relie: [f.relie] }, jeton); setMsg('Village ajouté : il apparaît sur la carte, avec sa route.'); setF({ nom: '', x: '', y: '', langue: f.langue, enfants: '', relie: '' }); onChange() } catch (er) { setMsg(er.message) }
  }
  return (
    <section className="carte">
      <h2>Ajouter un village</h2>
      <form onSubmit={envoyer} className="ado-champs">
        <label>Nom<input value={f.nom} maxLength={40} onChange={(e) => setF({ ...f, nom: e.target.value })} required /></label>
        <label>Langue parlée<select value={f.langue} onChange={(e) => setF({ ...f, langue: e.target.value })}>{LANGUES.map((l) => <option key={l}>{l}</option>)}</select></label>
        <label>Position est–ouest (km)<input type="number" step="0.1" value={f.x} onChange={(e) => setF({ ...f, x: e.target.value })} required /></label>
        <label>Position nord–sud (km)<input type="number" step="0.1" value={f.y} onChange={(e) => setF({ ...f, y: e.target.value })} required /></label>
        <label>Enfants de 0 à 5 ans (estimation)<input type="number" min="0" value={f.enfants} onChange={(e) => setF({ ...f, enfants: e.target.value })} /></label>
        <label>Relié par une piste à<select value={f.relie} onChange={(e) => setF({ ...f, relie: e.target.value })} required><option value="">Choisir</option>{villages.map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}</select></label>
        <p><button className="bouton" type="submit">Ajouter le village</button></p>
      </form>
      {msg && <p role="status">{msg}</p>}
      <p className="petit">Les positions sont des repères en kilomètres sur la carte de démonstration. Avec de vraies cartes, elles viendraient du GPS.</p>
    </section>
  )
}

function NouvelEtab({ villages, jeton, onChange }) {
  const [f, setF] = useState({ nom: '', village: 'agbele', type: 'centre', capacite: '' })
  const [msg, setMsg] = useState('')
  const envoyer = async (e) => {
    e.preventDefault(); setMsg('')
    try { await reseau.post('etablissements', { ...f, capacite: Number(f.capacite) || 0 }, jeton); setMsg('Établissement ajouté. Il reçoit désormais les alertes et apparaît dans les itinéraires. Ouvrez-lui ensuite un accès ci-dessus.'); setF({ ...f, nom: '', capacite: '' }); onChange() } catch (er) { setMsg(er.message) }
  }
  return (
    <section className="carte">
      <h2>Ajouter un centre, un hôpital, une crèche, un jardin d’enfants ou une école</h2>
      <form onSubmit={envoyer} className="ado-champs">
        <label>Nom<input value={f.nom} maxLength={80} onChange={(e) => setF({ ...f, nom: e.target.value })} required /></label>
        <label>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="centre">Centre de santé</option><option value="hopital">Hôpital</option><option value="creche">Crèche (0 à 3 ans)</option><option value="jardin">Jardin d’enfants (3 à 5 ans)</option><option value="ecole">École maternelle (4 à 5 ans)</option></select></label>
        <label>Village<select value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>{villages.map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}</select></label>
        <label>Places (enfants)<input type="number" min="0" value={f.capacite} onChange={(e) => setF({ ...f, capacite: e.target.value })} /></label>
        <p><button className="bouton" type="submit">Ajouter</button></p>
      </form>
      {msg && <p role="status">{msg}</p>}
    </section>
  )
}
