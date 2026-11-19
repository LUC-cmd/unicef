import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { Squelette } from './Chargement.jsx'
import GestionCreches from './GestionCreches.jsx'

const ROLES = [
  { code: 'AGENT', nom: 'Agent de santé', aide: 'Inscrit les familles et suit les enfants d’une préfecture, même sans réseau.', rattache: 'prefecture' },
  { code: 'STRUCTURE', nom: 'Centre de santé', aide: 'Répond aux demandes des familles pour sa structure.', rattache: 'structure' },
  { code: 'MAIRIE', nom: 'État civil (mairie)', aide: 'Reçoit les déclarations de naissance de sa préfecture et les valide.', rattache: 'prefecture' },
  { code: 'DECIDEUR', nom: 'Responsable régional', aide: 'Voit les taux de sa région, jamais un enfant.', rattache: 'region' },
  { code: 'ADMIN', nom: 'Administrateur', aide: 'Crée les comptes, reçoit les clés USB, suit la plateforme.', rattache: 'aucun' },
]
const NOM_ROLE = Object.fromEntries(ROLES.map((r) => [r.code, r.nom]))
const TYPES = { CENTRE_SANTE: 'Centre de santé', CRECHE: 'Crèche', CENTRE_SOCIAL: 'Centre social', ETAT_CIVIL: 'État civil' }
const REGIONS = ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes']

const sansAccent = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const court = (nom) => nom.replace(/ \(.*\)/, '')

function MotDePasse({ info, fermer }) {
  const [copie, setCopie] = useState(false)
  async function copier() {
    try { await navigator.clipboard.writeText(info.motDePasseProvisoire); setCopie(true) } catch { setCopie(false) }
  }
  return (
    <div className="mdp-carte" role="status">
      <div>
        <b>{info.titre}</b>
        <p className="petit">Notez ce mot de passe maintenant : il ne sera plus affiché. Donnez-le de vive voix. La personne le changera à sa première connexion.</p>
      </div>
      <div className="mdp-ligne">
        <code>{info.motDePasseProvisoire}</code>
        <button type="button" className="bouton secondaire petit-bouton" onClick={copier}>{copie ? 'Copié' : 'Copier'}</button>
        <button type="button" className="bouton secondaire petit-bouton" onClick={fermer}>Fermer</button>
      </div>
    </div>
  )
}

function FormulaireCompte({ geo, structures, apres }) {
  const [role, setRole] = useState('AGENT')
  const [nom, setNom] = useState('')
  const [identifiant, setIdentifiant] = useState('')
  const [zone, setZone] = useState('')
  const [region, setRegion] = useState('Maritime')
  const [structure, setStructure] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const def = ROLES.find((r) => r.code === role)
  const pilotes = geo.filter((z) => z.pilote)
  const parRegion = useMemo(() => REGIONS.map((r) => [r, geo.filter((z) => z.region === r)]), [geo])
  const zoneChoisie = geo.find((z) => z.code === zone)
  const structuresZone = structures.filter((s) => !zone || s.codeZone === zone).filter((s) => role !== 'STRUCTURE' || s.type === 'CENTRE_SANTE')

  function suggerer(r, z, n) {
    if (!n) return
    const base = { AGENT: 'agent', MAIRIE: 'mairie', STRUCTURE: 'structure', DECIDEUR: 'region', ADMIN: 'admin' }[r]
    const lieu = z ? sansAccent(court(geo.find((g) => g.code === z)?.nom ?? '')) : ''
    setIdentifiant((id) => id && id !== suggerer.dernier ? id : `${base}${lieu ? `.${lieu}` : ''}`)
  }

  async function envoyer(e) {
    e.preventDefault()
    setErreur('')
    if (!nom.trim()) return setErreur('Indiquez le nom du compte (par exemple « Agent de santé de Vo »).')
    if (!/^[a-z0-9._-]{3,40}$/.test(identifiant)) return setErreur('L’identifiant : 3 à 40 caractères, minuscules, chiffres, point ou tiret.')
    if (def.rattache === 'prefecture' && !zone) return setErreur('Choisissez la préfecture de rattachement.')
    if (def.rattache === 'structure' && !structure) return setErreur('Choisissez la structure, ou créez-la d’abord dans l’onglet Structures.')
    setEnvoi(true)
    try {
      const r = await api.post('/api/admin/comptes', {
        username: identifiant, nomComplet: nom.trim(), role,
        codeZone: def.rattache === 'prefecture' ? zone : null,
        region: def.rattache === 'region' ? region : null,
        codeStructure: def.rattache === 'structure' ? structure : null,
      })
      apres({ titre: `Compte « ${identifiant} » créé`, motDePasseProvisoire: r.motDePasseProvisoire })
      setNom(''); setIdentifiant(''); setZone(''); setStructure('')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="carte formulaire-compte" onSubmit={envoyer} noValidate>
      <h2>Créer un compte</h2>
      <fieldset className="choix-roles">
        <legend className="champ-titre">Qui est cette personne ?</legend>
        <div className="roles-grille">
          {ROLES.map((r) => (
            <label key={r.code} className={`role-carte ${role === r.code ? 'choisi' : ''}`}>
              <input type="radio" name="role" value={r.code} checked={role === r.code} onChange={() => { setRole(r.code); setStructure('') }} />
              <b>{r.nom}</b>
              <span>{r.aide}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="champs">
        {def.rattache === 'prefecture' && (
          <label className="champ">
            <span className="champ-titre">Préfecture de rattachement</span>
            <select value={zone} onChange={(e) => { setZone(e.target.value); suggerer(role, e.target.value, 1) }}>
              <option value="">Choisir…</option>
              {parRegion.map(([r, liste]) => (
                <optgroup key={r} label={`Région ${r}${liste.some((z) => z.pilote) ? ' (pilote)' : ''}`}>
                  {liste.map((z) => <option key={z.code} value={z.code}>{court(z.nom)}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="champ-aide">{zoneChoisie ? `Région ${zoneChoisie.region}, chef-lieu ${zoneChoisie.chefLieu}.` : `${geo.length} préfectures dans 5 régions. Le pilote : ${pilotes.length} préfectures de la Maritime.`}</span>
          </label>
        )}
        {def.rattache === 'region' && (
          <label className="champ">
            <span className="champ-titre">Région</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <span className="champ-aide">Cette personne ne verra que les préfectures de sa région.</span>
          </label>
        )}
        {def.rattache === 'structure' && (
          <label className="champ">
            <span className="champ-titre">Centre de santé</span>
            <select value={structure} onChange={(e) => setStructure(e.target.value)}>
              <option value="">Choisir…</option>
              {structuresZone.map((s) => <option key={s.code} value={s.code}>{s.nom} · {court(s.nomZone)}</option>)}
            </select>
            <span className="champ-aide">Pas dans la liste ? Créez-le dans l’onglet Structures.</span>
          </label>
        )}
        <label className="champ">
          <span className="champ-titre">Nom du compte</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={role === 'MAIRIE' ? 'État civil de Vo' : 'Agent de santé de Vo'} maxLength={100} />
          <span className="champ-aide">Affiché en haut du tableau de bord.</span>
        </label>
        <label className="champ">
          <span className="champ-titre">Identifiant de connexion</span>
          <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value.toLowerCase())} placeholder="agent.vo" autoCapitalize="none" autoComplete="off" />
          <span className="champ-aide">Sans espace ni accent. La personne le saisira pour se connecter.</span>
        </label>
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <div className="actions-formulaire">
        <button type="submit" className="bouton" disabled={envoi}>{envoi ? 'Création…' : 'Créer le compte'}</button>
        <span className="petit">Un mot de passe provisoire est généré. Il ne sera montré qu’une fois.</span>
      </div>
    </form>
  )
}

function FormulaireStructure({ geo, apres }) {
  const [type, setType] = useState('CENTRE_SANTE')
  const [nom, setNom] = useState('')
  const [zone, setZone] = useState('')
  const [tel, setTel] = useState('')
  const [erreur, setErreur] = useState('')
  async function envoyer(e) {
    e.preventDefault(); setErreur('')
    if (!nom.trim() || !zone) return setErreur('Indiquez le nom de la structure et sa préfecture.')
    try {
      await api.post('/api/admin/structures', { type, nom: nom.trim(), codeZone: zone, telephone: tel.trim() || null })
      setNom(''); setTel(''); apres()
    } catch (err) { setErreur(err.message) }
  }
  return (
    <form className="carte formulaire-compte" onSubmit={envoyer} noValidate>
      <h2>Ajouter une structure</h2>
      <p className="petit">Pour une crèche, utilisez l’onglet « Crèches » : il demande aussi les conditions d’accueil.</p>
      <div className="champs">
        <label className="champ"><span className="champ-titre">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(TYPES).filter(([k]) => k !== 'CRECHE').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="champ"><span className="champ-titre">Préfecture</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">Choisir…</option>
            {REGIONS.map((r) => <optgroup key={r} label={`Région ${r}`}>{geo.filter((z) => z.region === r).map((z) => <option key={z.code} value={z.code}>{court(z.nom)}</option>)}</optgroup>)}
          </select></label>
        <label className="champ"><span className="champ-titre">Nom</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Centre de santé de Kévé" maxLength={120} /></label>
        <label className="champ"><span className="champ-titre">Téléphone <em>facultatif</em></span>
          <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" maxLength={30} /></label>
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <div className="actions-formulaire"><button type="submit" className="bouton">Ajouter la structure</button></div>
    </form>
  )
}

export default function GestionComptes() {
  const [onglet, setOnglet] = useState('comptes')
  const [comptes, setComptes] = useState(null)
  const [structures, setStructures] = useState([])
  const [geo, setGeo] = useState([])
  const [mdp, setMdp] = useState(null)
  const [filtre, setFiltre] = useState('TOUS')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(() => {
    api.get('/api/admin/comptes').then(setComptes).catch((e) => setErreur(e.message))
    api.get('/api/admin/structures').then(setStructures).catch(() => {})
    api.get('/api/decideur/geographie').then(setGeo).catch(() => {})
  }, [])
  useEffect(charger, [charger])

  async function basculer(c) {
    try { await api.post(`/api/admin/comptes/${c.id}/actif`, { actif: !c.actif }); charger() } catch { /* le retour s'affiche déjà */ }
  }
  async function reinitialiser(c) {
    try {
      const r = await api.post(`/api/admin/comptes/${c.id}/reinitialiser`)
      setMdp({ titre: `Nouveau mot de passe pour « ${c.username} »`, motDePasseProvisoire: r.motDePasseProvisoire })
    } catch { /* idem */ }
  }

  if (!comptes && !erreur) return <Squelette tuiles={3} cartes={2} />
  const liste = (comptes ?? []).filter((c) => filtre === 'TOUS' || c.role === filtre)
  const compte = (r) => (comptes ?? []).filter((c) => c.role === r).length
  const rattachement = (c) => c.nomStructure ?? (c.nomZone ? court(c.nomZone) : (c.region ? `Région ${c.region}` : (c.role === 'DECIDEUR' ? 'Tout le Togo' : 'Toute la plateforme')))

  return (
    <>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <div className="onglets-pro" role="tablist" aria-label="Comptes et structures">
        <button role="tab" aria-selected={onglet === 'comptes'} className={onglet === 'comptes' ? 'actif' : ''} onClick={() => setOnglet('comptes')}>Comptes ({comptes?.length ?? 0})</button>
        <button role="tab" aria-selected={onglet === 'structures'} className={onglet === 'structures' ? 'actif' : ''} onClick={() => setOnglet('structures')}>Structures ({structures.length})</button>
        <button role="tab" aria-selected={onglet === 'creches'} className={onglet === 'creches' ? 'actif' : ''} onClick={() => setOnglet('creches')}>Crèches ({structures.filter((x) => x.type === 'CRECHE').length})</button>
      </div>
      {mdp && <MotDePasse info={mdp} fermer={() => setMdp(null)} />}

      {onglet === 'comptes' ? (
        <>
          <div className="filtres-comptes" role="group" aria-label="Filtrer par rôle">
            {[['TOUS', `Tous (${comptes?.length ?? 0})`], ...ROLES.map((r) => [r.code, `${r.nom} (${compte(r.code)})`])].map(([k, t]) => (
              <button key={k} type="button" className={`filtre ${filtre === k ? 'actif' : ''}`} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{t}</button>
            ))}
          </div>
          <section className="carte">
            <div className="tableau-conteneur">
              <table className="table-comptes">
                <thead><tr><th>Compte</th><th>Rôle</th><th>Rattaché à</th><th>État</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {liste.map((c) => (
                    <tr key={c.id} className={c.actif ? '' : 'inactif'}>
                      <td><b>{c.nomComplet}</b><br /><span className="petit">{c.username}</span></td>
                      <td><span className={`badge role-${c.role.toLowerCase()}`}>{NOM_ROLE[c.role]}</span></td>
                      <td>{rattachement(c)}</td>
                      <td>{c.actif ? <span className="etat ok">Actif</span> : <span className="etat off">Désactivé</span>}</td>
                      <td className="actions-ligne">
                        <button type="button" className="lien-bouton" onClick={() => reinitialiser(c)}>Nouveau mot de passe</button>
                        <button type="button" className="lien-bouton" onClick={() => basculer(c)}>{c.actif ? 'Désactiver' : 'Réactiver'}</button>
                      </td>
                    </tr>
                  ))}
                  {liste.length === 0 && <tr><td colSpan="5" className="vide">Aucun compte pour ce rôle. Créez-le ci-dessous.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <FormulaireCompte geo={geo} structures={structures} apres={(info) => { setMdp(info); charger() }} />
        </>
      ) : onglet === 'creches' ? (
        <GestionCreches geo={geo} apres={(info) => { if (info) setMdp(info); charger() }} />
      ) : (
        <>
          <section className="carte">
            <div className="tableau-conteneur">
              <table>
                <thead><tr><th>Structure</th><th>Type</th><th>Préfecture</th><th>Région</th></tr></thead>
                <tbody>
                  {structures.map((s) => (
                    <tr key={s.code}><td><b>{s.nom}</b><br /><span className="petit">{s.code}</span></td><td>{TYPES[s.type]}</td><td>{court(s.nomZone)}</td><td>{s.region}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <FormulaireStructure geo={geo} apres={charger} />
        </>
      )}
    </>
  )
}
