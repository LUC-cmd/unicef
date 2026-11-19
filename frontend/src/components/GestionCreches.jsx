import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const REGIONS = ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes']
const JOURS = [['LUN', 'Lun'], ['MAR', 'Mar'], ['MER', 'Mer'], ['JEU', 'Jeu'], ['VEN', 'Ven'], ['SAM', 'Sam'], ['DIM', 'Dim']]
const court = (nom) => nom.replace(/ \(.*\)/, '')
const identifiantDe = (nom) => 'creche.' + nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^creches?-/, '').slice(0, 28)

/** Les crèches : la liste, et la création complète (conditions d'accueil + compte du responsable). */
export default function GestionCreches({ geo, apres, base = '/api/decideur/gestion' }) {
  const [liste, setListe] = useState(null)
  const [erreur, setErreur] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [f, setF] = useState({ nom: '', zone: '', tel: '', lat: '', lon: '', capacite: 20, ageMin: 12, ageMax: 60, ouv: '07:00', fer: '17:00',
    jours: ['LUN', 'MAR', 'MER', 'JEU', 'VEN'], tarif: '', conditions: '', apporter: '', besoins: false, username: '', responsable: '' })
  const maj = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const [modifie, setModifie] = useState(false)
  const [compteDe, setCompteDe] = useState(null) // { code, nom, username }
  const [erreurCompte, setErreurCompte] = useState('')
  const changerNom = (v) => setF((x) => ({ ...x, nom: v, username: modifie || !v.trim() ? x.username : identifiantDe(v) }))

  async function creerCompte(e) {
    e.preventDefault(); setErreurCompte('')
    if (!/^[a-z0-9._-]{3,40}$/.test(compteDe.username)) return setErreurCompte('L’identifiant : 3 à 40 caractères, minuscules, chiffres, point ou tiret.')
    try {
      const r = await api.post(`${base}/comptes`, { username: compteDe.username, nomComplet: `Responsable, ${compteDe.nom}`, role: 'STRUCTURE', codeStructure: compteDe.code })
      apres({ titre: `Compte du responsable de « ${compteDe.nom} » : ${compteDe.username}`, motDePasseProvisoire: r.motDePasseProvisoire })
      setCompteDe(null); charger()
    } catch (err) { setErreurCompte(err.message) }
  }

  const charger = useCallback(() => { api.get(`${base}/creches`).then(setListe).catch((e) => setErreur(e.message)) }, [base])
  useEffect(charger, [charger])

  async function basculer(c) {
    try { await api.post(`${base}/creches/${encodeURIComponent(c.code)}/actif`, { actif: !c.actif }); charger() } catch { /* le retour s'affiche déjà */ }
  }

  async function envoyer(e) {
    e.preventDefault(); setErreur('')
    if (f.nom.trim().length < 3) return setErreur('Indiquez le nom de la crèche.')
    if (!f.zone) return setErreur('Choisissez la préfecture.')
    if (f.jours.length === 0) return setErreur('Choisissez au moins un jour d’ouverture.')
    if ((f.lat && !f.lon) || (!f.lat && f.lon)) return setErreur('Renseignez la latitude et la longitude ensemble, ou aucune des deux.')
    try {
      const r = await api.post(`${base}/creches`, {
        nom: f.nom.trim(), codeZone: f.zone, telephone: f.tel.trim() || null,
        latitude: f.lat ? Number(f.lat.replace(',', '.')) : null, longitude: f.lon ? Number(f.lon.replace(',', '.')) : null,
        capacite: Number(f.capacite), ageMinMois: Number(f.ageMin), ageMaxMois: Number(f.ageMax), ouverture: f.ouv, fermeture: f.fer,
        jours: JOURS.map(([k]) => k).filter((k) => f.jours.includes(k)).join(','), tarif: f.tarif, conditions: f.conditions,
        aApporter: f.apporter, besoinsSpecifiques: f.besoins, usernameResponsable: f.username.trim() || null, nomResponsable: f.responsable.trim() || null,
      })
      setOuvert(false); setF((x) => ({ ...x, nom: '', tel: '', lat: '', lon: '', tarif: '', conditions: '', apporter: '', username: '', responsable: '' })); charger()
      if (r.motDePasseProvisoire) apres({ titre: `Compte du responsable de « ${f.nom.trim()} » : ${r.username}`, motDePasseProvisoire: r.motDePasseProvisoire })
      else apres(null)
    } catch (err) { setErreur(err.message) }
  }

  return (
    <>
      <section className="carte">
        <div className="entete-liste">
          <h2>Crèches ({liste?.length ?? 0})</h2>
          {!ouvert && <button type="button" className="bouton" onClick={() => setOuvert(true)}>Ajouter une crèche</button>}
        </div>
        {erreur && !ouvert && <p className="erreur" role="alert">{erreur}</p>}
        <div className="tableau-conteneur">
          <table>
            <thead><tr><th>Crèche</th><th>Préfecture</th><th>Places</th><th>Âges</th><th>Horaires</th><th>Responsable</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {(liste ?? []).map((c) => (
                <tr key={c.code} className={c.actif ? '' : 'inactif'}>
                  <td><b>{c.nom}</b><br /><span className="petit">{c.code}{c.telephone ? ` · ${c.telephone}` : ''}</span></td>
                  <td>{court(c.nomZone)}</td><td>{c.capacite}</td><td>{c.ageMinMois} à {c.ageMaxMois} mois</td><td>{c.horaires || '—'}</td>
                  <td>{c.comptes > 0 ? <span className="etat ok">Compte créé</span>
                    : <><span className="etat off">Aucun compte</span><br /><button type="button" className="lien-bouton" onClick={() => setCompteDe({ code: c.code, nom: c.nom, username: identifiantDe(c.nom) })}>Créer le compte</button></>}</td>
                  <td className="actions-ligne"><button type="button" className="lien-bouton" onClick={() => basculer(c)}>{c.actif ? 'Masquer aux familles' : 'Réactiver'}</button></td>
                </tr>
              ))}
              {liste && liste.length === 0 && <tr><td colSpan="7" className="vide">Aucune crèche. Ajoutez la première.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {compteDe && (
        <form className="carte formulaire-compte" onSubmit={creerCompte} noValidate>
          <h3>Compte du responsable de « {compteDe.nom} »</h3>
          <p className="petit">Ce compte ouvre l’espace de la crèche : réservations des familles et fiche d’accueil. Un mot de passe provisoire vous sera montré une seule fois : remettez-le au responsable, qui le changera.</p>
          <label className="champ"><span className="champ-titre">Identifiant</span>
            <input value={compteDe.username} maxLength={40} autoCapitalize="none" onChange={(e) => setCompteDe({ ...compteDe, username: e.target.value.toLowerCase() })} /></label>
          {erreurCompte && <p className="erreur" role="alert">{erreurCompte}</p>}
          <div className="actions-formulaire">
            <button type="submit" className="bouton">Créer le compte</button>
            <button type="button" className="bouton secondaire" onClick={() => { setCompteDe(null); setErreurCompte('') }}>Annuler</button>
          </div>
        </form>
      )}

      {ouvert && (
        <form className="carte formulaire-compte" onSubmit={envoyer} noValidate>
          <h2>Ajouter une crèche</h2>
          <p className="petit">La crèche apparaît tout de suite dans la liste des familles de sa préfecture. Son responsable pourra ensuite mettre à jour les conditions et traiter les réservations.</p>
          <h3>La crèche</h3>
          <div className="champs">
            <label className="champ"><span className="champ-titre">Nom</span><input value={f.nom} maxLength={120} onChange={(e) => changerNom(e.target.value)} placeholder="Crèche communautaire de Kévé" /></label>
            <label className="champ"><span className="champ-titre">Préfecture</span>
              <select value={f.zone} onChange={(e) => maj('zone', e.target.value)}>
                <option value="">Choisir…</option>
                {REGIONS.map((r) => <optgroup key={r} label={`Région ${r}`}>{geo.filter((z) => z.region === r).map((z) => <option key={z.code} value={z.code}>{court(z.nom)}</option>)}</optgroup>)}
              </select></label>
            <label className="champ"><span className="champ-titre">Téléphone <em>facultatif</em></span><input value={f.tel} inputMode="tel" maxLength={30} onChange={(e) => maj('tel', e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Latitude <em>facultatif</em></span><input value={f.lat} inputMode="decimal" onChange={(e) => maj('lat', e.target.value)} placeholder="6.1375" /></label>
            <label className="champ"><span className="champ-titre">Longitude <em>facultatif</em></span><input value={f.lon} inputMode="decimal" onChange={(e) => maj('lon', e.target.value)} placeholder="1.2123" /></label>
            <label className="case"><input type="checkbox" checked={f.besoins} onChange={(e) => maj('besoins', e.target.checked)} /> Accueille des enfants à besoins spécifiques</label>
          </div>
          <h3>L’accueil</h3>
          <div className="champs">
            <label className="champ"><span className="champ-titre">Places</span><input type="number" min="1" max="200" value={f.capacite} onChange={(e) => maj('capacite', e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Âge minimum (mois)</span><input type="number" min="0" max="71" value={f.ageMin} onChange={(e) => maj('ageMin', e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Âge maximum (mois)</span><input type="number" min="1" max="72" value={f.ageMax} onChange={(e) => maj('ageMax', e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Ouverture</span><input type="time" value={f.ouv} onChange={(e) => maj('ouv', e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Fermeture</span><input type="time" value={f.fer} onChange={(e) => maj('fer', e.target.value)} /></label>
          </div>
          <fieldset className="jours-creche"><legend className="champ-titre">Jours d’ouverture</legend>
            {JOURS.map(([k, t]) => (
              <label key={k} className="case"><input type="checkbox" checked={f.jours.includes(k)} onChange={(e) => maj('jours', e.target.checked ? [...f.jours, k] : f.jours.filter((j) => j !== k))} /> {t}</label>
            ))}
          </fieldset>
          <label className="champ"><span className="champ-titre">Tarif <em>facultatif</em></span><input value={f.tarif} maxLength={200} onChange={(e) => maj('tarif', e.target.value)} placeholder="Participation libre, selon les moyens de la famille" /></label>
          <label className="champ"><span className="champ-titre">Conditions d’accueil <em>facultatif</em></span><textarea rows="2" maxLength={600} value={f.conditions} onChange={(e) => maj('conditions', e.target.value)} /></label>
          <label className="champ"><span className="champ-titre">À apporter <em>facultatif</em></span><textarea rows="2" maxLength={600} value={f.apporter} onChange={(e) => maj('apporter', e.target.value)} placeholder="Carnet de santé, change, eau" /></label>
          <h3>Le responsable</h3>
          <p className="petit">Le compte du responsable est créé avec la crèche : l’identifiant est proposé à partir du nom, vous pouvez le changer. Un mot de passe provisoire vous sera montré une seule fois. Videz l’identifiant pour créer la crèche sans compte.</p>
          <div className="champs">
            <label className="champ"><span className="champ-titre">Nom du responsable</span><input value={f.responsable} maxLength={100} onChange={(e) => maj('responsable', e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Identifiant</span><input value={f.username} maxLength={40} autoCapitalize="none" onChange={(e) => { setModifie(true); maj('username', e.target.value.toLowerCase()) }} placeholder="creche.keve" /></label>
          </div>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <div className="actions-formulaire">
            <button type="submit" className="bouton">Créer la crèche</button>
            <button type="button" className="bouton secondaire" onClick={() => { setOuvert(false); setErreur('') }}>Annuler</button>
          </div>
        </form>
      )}
    </>
  )
}
