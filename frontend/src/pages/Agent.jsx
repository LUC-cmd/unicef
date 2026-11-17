import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth, useReseau } from '../lib/contexte.jsx'
import {
  LIBELLE_PORTE, MESSAGE_PB, ageEnMois, ageLisible, aujourdhuiIso, classerPB, formaterDate,
} from '../lib/format.js'
import { ajouterDeclaration, ajouterPrenom, ajouterVisite, lireFile, noterEnvoi, nombreEnAttente, vider } from '../lib/offline.js'
import { Anneau } from '../components/Graphiques.jsx'
import { Squelette } from '../components/Chargement.jsx'
import FamillesEnregistrees from '../components/FamillesEnregistrees.jsx'
import CleUsb from '../components/CleUsb.jsx'
import Accouchement from '../components/Accouchement.jsx'
import NouveauNe from '../components/NouveauNe.jsx'
import ParcoursEnfant from '../components/ParcoursEnfant.jsx'
import Developpement from '../components/Developpement.jsx'
import Eveil from '../components/Eveil.jsx'
import Orienter from '../components/Orienter.jsx'
import Proches from '../components/Proches.jsx'
import RetraitConsentement from '../components/RetraitConsentement.jsx'
import Bandeau from '../components/Bandeau.jsx'
import GuideRole from '../components/GuideRole.jsx'

const CLE_LISTE = 'fildor.cache.visites'
const CLE_FICHE = (code) => `fildor.cache.fiche.${code}`

function lireCache(cle) {
  try { return JSON.parse(localStorage.getItem(cle) || 'null') } catch { return null }
}
function ecrireCache(cle, v) {
  try { localStorage.setItem(cle, JSON.stringify(v)) } catch { /* stockage plein : on continue sans cache */ }
}

function Pastille({ niveau, score }) {
  const libelle = { URGENT: 'Urgent', PRIORITAIRE: 'Prioritaire', NORMAL: 'Normal' }[niveau]
  return <span className={`pastille ${niveau.toLowerCase()}`}>{libelle} · {score}</span>
}

export default function Agent({ vue = 'visites' }) {
  const { enLigne, simuleHorsLigne, setSimuleHorsLigne } = useReseau()
  const { session } = useAuth()
  const [liste, setListe] = useState(() => lireCache(CLE_LISTE) || [])
  const [horsLigne, setHorsLigne] = useState(false)
  const [chargement, setChargement] = useState(liste.length === 0)
  const [filtre, setFiltre] = useState('')
  const [params] = useSearchParams()
  const [choisi, setChoisi] = useState(params.get('enfant'))
  const [attente, setAttente] = useState(0)
  const [envoisVersion, setEnvoisVersion] = useState(0)
  const [message, setMessage] = useState(null)
  const [erreur, setErreur] = useState('')

  const rafraichirAttente = useCallback(() => setAttente(nombreEnAttente(lireFile())), [])

  const charger = useCallback(async () => {
    if (!enLigne || session?.local) { setHorsLigne(true); setChargement(false); return }
    try {
      const l = await api.get('/api/agent/visites')
      setListe(l)
      ecrireCache(CLE_LISTE, l)
      setHorsLigne(false)
      setErreur('')
    } catch (e) {
      setErreur(e.message)
      setHorsLigne(e.statut === 0)
    } finally { setChargement(false) }
  }, [enLigne])

  const synchroniser = useCallback(async () => {
    const file = lireFile()
    if (nombreEnAttente(file) === 0) return
    if (session?.local) {
      setMessage({ ok: false, texte: "Vous êtes entré sans réseau : rien ne part sans compte. Copiez les saisies sur une clé USB, ou déconnectez-vous et connectez-vous avec votre compte quand le réseau est là." })
      return
    }
    try {
      const r = await api.post('/api/agent/sync', file)
      vider()
      rafraichirAttente()
      noterEnvoi({ le: new Date().toISOString(), resume: `${r.visitesCreees} visite(s), ${r.declarationsCreees} déclaration(s), ${r.inscriptionsCreees} inscription(s), ${r.accouchementsCrees} naissance(s), ${r.prenomsEnregistres ?? 0} nom(s) enregistrée(s) dans la base` })
      setEnvoisVersion((v) => v + 1)
      setMessage({
        ok: true,
        texte: `Synchronisé : ${r.visitesCreees} visite(s), ${r.declarationsCreees} déclaration(s), `
          + `${r.inscriptionsCreees} inscription(s), ${r.accouchementsCrees} naissance(s)`
          + (r.visitesDejaConnues + r.declarationsDejaConnues + r.inscriptionsDejaConnues + r.accouchementsDejaConnus
            ? `, ${r.visitesDejaConnues + r.declarationsDejaConnues + r.inscriptionsDejaConnues + r.accouchementsDejaConnus} déjà connue(s)` : '')
          + (r.inscriptions?.filter((i) => i.creee).length
            ? `. Codes attribués : ${r.inscriptions.filter((i) => i.creee).map((i) => `${i.codeFamille} (${i.codesEnfants.join(', ')})`).join(' ; ')}` : '')
          + (r.erreurs.length ? `. À revoir : ${r.erreurs.join(' ; ')}` : '.'),
      })
      await charger()
    } catch (e) {
      setMessage({ ok: false, texte: `Synchronisation impossible : ${e.message}. Rien n'est perdu, réessayez plus tard.` })
    }
  }, [charger, rafraichirAttente, session])

  // Au retour du réseau : on envoie ce qui attendait, puis on rafraîchit la liste.
  useEffect(() => {
    rafraichirAttente()
    if (enLigne && !session?.local) { synchroniser().then(charger) } else { setHorsLigne(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enLigne])

  const affichee = useMemo(
    () => liste.filter((l) => !filtre || l.codeEnfant.toLowerCase().includes(filtre.toLowerCase())
      || l.codeFamille.toLowerCase().includes(filtre.toLowerCase())),
    [liste, filtre],
  )
  const urgents = liste.filter((l) => l.priorite.niveau === 'URGENT').length

  const prioritaires = liste.filter((l) => l.priorite.niveau === 'PRIORITAIRE').length
  const normaux = liste.length - urgents - prioritaires
  const aVisiter = [...liste].sort((x, y) => y.priorite.score - x.priorite.score).slice(0, 6)
  const prochains = liste.filter((l) => l.prochainRdv).sort((x, y) => x.prochainRdv.localeCompare(y.prochainRdv)).slice(0, 6)
  const etatReseau = (
    <div className={`etat-reseau ${horsLigne ? 'hors' : 'en'}`} role="status">
      <span>
        <b>{horsLigne ? 'Hors ligne' : 'En ligne'}.</b>{' '}
        {horsLigne ? 'Vous pouvez tout saisir, ça partira au retour du réseau.' : 'Les saisies partent tout de suite.'}
        {attente > 0 && (
          <> {attente} élément(s) en attente. <button className="lien" disabled={!enLigne} onClick={synchroniser}>Synchroniser maintenant</button></>
        )}
      </span>
      <label className="interrupteur">
        <input type="checkbox" checked={simuleHorsLigne} onChange={(e) => setSimuleHorsLigne(e.target.checked)} />
        Simuler un village sans réseau
      </label>
    </div>
  )
  const retours = (
    <>
      {message && <p className={message.ok ? 'succes' : 'erreur'} role="status">{message.texte}</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </>
  )

  if (vue === 'tableau') {
    return (
      <main className="page">
        <Bandeau surtitre="Agent de santé" titre="Tableau de bord">
          Votre journée en un coup d'œil : qui visiter en premier, ce qui attend d'être envoyé.
        </Bandeau>
        {etatReseau}
        {retours}
        {chargement ? <Squelette /> : (<>
        <div className="tableau-kpi">
          <div className="tuile"><b>{liste.length}</b><span>enfants et grossesses suivis</span></div>
          <div className={`tuile ${urgents ? 'alerte' : ''}`}><b>{urgents}</b><span>à visiter en urgence</span></div>
          <div className="tuile"><b>{prioritaires}</b><span>prioritaires</span></div>
          <div className="tuile"><b>{attente}</b><span>saisie(s) en attente d'envoi</span></div>
        </div>
        <div className="raccourcis">
          <Link className="bouton" to="/agent/visites">Voir mes visites</Link>
          <Link className="bouton secondaire" to="/agent/inscription">Inscrire une famille</Link>
          <Link className="bouton secondaire" to="/agent/synchronisation">Synchronisation et clé USB</Link>
        </div>
        <div className="grille-deux">
          <section className="carte">
            <Anneau titre="Priorité des familles suivies" centre={liste.length}
                    parts={[{ nom: 'Urgent', valeur: urgents, couleur: '#e2231a' }, { nom: 'Prioritaire', valeur: prioritaires, couleur: '#f26a21' }, { nom: 'Normal', valeur: normaux, couleur: '#00833d' }]} />
          </section>
          <section className="carte">
            <h2>À visiter en premier</h2>
            <ul className="liste-visites">
              {aVisiter.map((l) => (
                <li key={l.codeEnfant}>
                  <Link className="ligne" to={`/agent/visites?enfant=${l.codeEnfant}`}>
                    <span className="ligne-texte">
                      <strong>{l.codeEnfant}</strong> <span className="petit">{l.codeFamille} · {l.zone}</span>
                      {l.priorite.raisons.length > 0 && <span className="raisons">{l.priorite.raisons[0]}</span>}
                    </span>
                    <Pastille niveau={l.priorite.niveau} score={l.priorite.score} />
                  </Link>
                </li>
              ))}
              {aVisiter.length === 0 && <li className="petit">Aucune famille pour le moment.</li>}
            </ul>
          </section>
        </div>
        <section className="carte">
          <h2>Prochains rendez-vous</h2>
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Date</th><th>Enfant</th><th>Famille</th><th>Zone</th></tr></thead>
              <tbody>
                {prochains.map((l) => (
                  <tr key={l.codeEnfant}><td>{formaterDate(l.prochainRdv)}</td><td><Link to={`/agent/visites?enfant=${l.codeEnfant}`}>{l.codeEnfant}</Link></td><td>{l.codeFamille}</td><td>{l.zone}</td></tr>
                ))}
                {prochains.length === 0 && <tr><td colSpan="4" className="petit">Aucun rendez-vous prévu.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        </>)}
      </main>
    )
  }

  if (vue === 'familles') {
    return (
      <main className="page">
        <Bandeau surtitre="Agent de santé" titre="Familles enregistrées"
                 actions={<Link className="bouton" to="/agent/inscription">Inscrire une famille</Link>}>
          Les familles de votre zone, les plus urgentes en premier.
        </Bandeau>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {chargement ? <Squelette /> : <FamillesEnregistrees liste={liste} />}
      </main>
    )
  }

  if (vue === 'synchronisation') {
    return (
      <main className="page">
        <Bandeau surtitre="Agent de santé" titre="Synchronisation et clé USB">
          Envoyez vos saisies dans la base, avec du réseau ou par une clé USB.
        </Bandeau>
        {etatReseau}
        {retours}
        <CleUsb key={envoisVersion} agent={session?.username} zone={session?.zone} enLigne={enLigne} onChange={rafraichirAttente} synchroniser={synchroniser} />
      </main>
    )
  }

  return (
    <main className="page">
      <Bandeau surtitre="Agent de santé" titre="Mes visites"
               actions={<Link className="bouton" to="/agent/inscription">Inscrire une famille</Link>}>
        Les familles dont un rappel est resté sans réponse remontent en premier.
      </Bandeau>
      {etatReseau}
      {retours}

      <div className="deux-colonnes">
        <section>
          <input className="recherche" placeholder="Chercher un code (ex. T045A, F-0045)" value={filtre}
                 onChange={(e) => setFiltre(e.target.value)} aria-label="Chercher un code enfant ou famille" />
          <ul className="liste-visites">
            {affichee.map((l) => (
              <li key={l.codeEnfant}>
                <button className={choisi === l.codeEnfant ? 'ligne choisie' : 'ligne'} onClick={() => setChoisi(l.codeEnfant)}>
                  <span>
                    <b>{l.codeEnfant}</b> <span className="petit">{l.codeFamille} · {l.zone}</span><br />
                    <span className="petit">
                      {l.statut === 'GROSSESSE' ? 'Grossesse' : ageLisible(l.dateNaissance)} · {LIBELLE_PORTE[l.porte]}
                      {l.prochainRdv && <> · prochain rdv {formaterDate(l.prochainRdv)}</>}
                    </span>
                    {l.priorite.raisons.length > 0 && <span className="raisons">{l.priorite.raisons[0]}</span>}
                  </span>
                  <Pastille niveau={l.priorite.niveau} score={l.priorite.score} />
                </button>
              </li>
            ))}
            {affichee.length === 0 && <li className="petit">Aucun enfant à afficher.</li>}
          </ul>
        </section>

        <section>
          {choisi
            ? <Fiche key={choisi} code={choisi} enLigne={enLigne} onChange={() => { rafraichirAttente(); if (enLigne) synchroniser().then(charger) }} />
            : <div className="carte"><p>Choisissez un enfant dans la liste pour voir sa fiche et saisir la visite.</p></div>}
        </section>
      </div>
    </main>
  )
}

function Fiche({ code, enLigne, onChange }) {
  const [fiche, setFiche] = useState(() => lireCache(CLE_FICHE(code)))
  const [version, setVersion] = useState(0)
  const rafraichir = () => setVersion((v) => v + 1)
  const [depuisCache, setDepuisCache] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    async function charger() {
      if (!enLigne) { setDepuisCache(true); return }
      try {
        const f = await api.get(`/api/agent/enfants/${encodeURIComponent(code)}`)
        if (!annule) { setFiche(f); ecrireCache(CLE_FICHE(code), f); setDepuisCache(false); setErreur('') }
      } catch (e) {
        if (!annule) { setErreur(e.message); setDepuisCache(true) }
      }
    }
    charger()
    return () => { annule = true }
  }, [code, enLigne, version])

  if (!fiche) {
    return <div className="carte">{erreur ? <p className="erreur">{erreur}</p> : <p>Chargement…</p>}
      {!enLigne && <p className="petit">Cette fiche n'a pas été ouverte avant le départ : elle n'est pas disponible hors ligne.</p>}</div>
  }

  return (
    <div className="carte fiche">
      <h2>{fiche.codeEnfant} <span className="petit">famille {fiche.codeFamille}</span></h2>
      <p className="petit">
        {fiche.zone} · {LIBELLE_PORTE[fiche.porte]} · {fiche.statut === 'GROSSESSE'
          ? `terme prévu le ${formaterDate(fiche.dateTermePrevue)}`
          : `né(e) le ${formaterDate(fiche.dateNaissance)} (${ageLisible(fiche.dateNaissance)})`}
      </p>
      {depuisCache && <p className="avertissement">Fiche enregistrée avant le départ : elle peut avoir changé depuis.</p>}

      <Pastille niveau={fiche.priorite.niveau} score={fiche.priorite.score} />
      {fiche.mereAdolescente && (
        <div className="carte jeune-mere">
          <h3>Jeune mère : accompagnement renforcé</h3>
          <ul>
            <li><b>Santé</b> : consultations prénatales et suivi du bébé sans faute ; orienter vers le centre de santé pour la planification familiale.</li>
            <li><b>École</b> : une jeune mère garde le droit d'étudier ; en parler au centre social.</li>
            <li><b>Protection</b> : en cas de violence ou de contrainte, prévenir le centre social tout de suite.</li>
          </ul>
          <div className="actions">
            <Link className="bouton secondaire petit-bouton" to="/agent/annuaire">Centres de santé et centres sociaux</Link>
            <Link className="bouton secondaire petit-bouton" to="/adolescents">Informations pour les adolescentes</Link>
          </div>
        </div>
      )}
      {fiche.priorite.raisons.length > 0 && (
        <ul className="raisons-liste">{fiche.priorite.raisons.map((r) => <li key={r}>{r}</li>)}</ul>
      )}

      <p><Link to={`/carnet/${fiche.codeFamille}`}>Imprimer le carnet illustré de la famille</Link></p>
      <p><Link to={fiche.statut === 'ENFANT' && fiche.dateNaissance ? `/agent/acte?naissance=${fiche.dateNaissance}` : '/agent/acte'}>Aider la famille à obtenir l'acte de naissance</Link></p>

      <h3>Rendez-vous</h3>
      <ul className="rdvs">
        {fiche.rendezVous.map((r) => (
          <li key={r.id} className={`rdv ${r.statut.toLowerCase()}`}>
            <span>{formaterDate(r.datePrevue)}</span> <span>{r.libelle}</span>
            <span className="petit">{r.statut === 'REALISE' ? '✓ fait' : r.statut === 'MANQUE' ? '✗ manqué' : 'à venir'}</span>
          </li>
        ))}
      </ul>

      {fiche.statut === 'GROSSESSE' && (
        <Accouchement fiche={fiche} enLigne={enLigne} onChange={() => { onChange(); rafraichir() }} />
      )}
      {fiche.statut === 'ENFANT' && <Naissance fiche={fiche} onChange={onChange} />}
      <ParcoursEnfant code={fiche.codeEnfant} enLigne={enLigne && !depuisCache} />
      {fiche.statut === 'ENFANT' && <NouveauNe code={fiche.codeEnfant} enLigne={enLigne && !depuisCache} ageMois={ageEnMois(fiche.dateNaissance)} />}
      {fiche.statut === 'ENFANT' && <Developpement code={fiche.codeEnfant} ageMois={ageEnMois(fiche.dateNaissance)} />}
      {fiche.statut === 'ENFANT' && <Eveil eveil={fiche.eveil} aujourdhui={aujourdhuiIso()} />}
      <Saisie fiche={fiche} onChange={onChange} />
      <Orienter codeFamille={fiche.codeFamille} demandes={fiche.demandes} enLigne={enLigne && !depuisCache} onChange={rafraichir} />
      <Proches codeFamille={fiche.codeFamille} enLigne={enLigne && !depuisCache} />
      <RetraitConsentement codeFamille={fiche.codeFamille} enLigne={enLigne && !depuisCache} onFait={onChange} />

      {fiche.visites.length > 0 && (
        <>
          <h3>Dernières mesures</h3>
          <ul>{fiche.visites.map((v, i) => (
            <li key={i}>{formaterDate(v.dateVisite)} : PB {v.muacMm ?? '—'} mm{v.poidsG ? `, ${v.poidsG} g` : ''}{v.signesDanger ? ' · signe de danger' : ''}</li>
          ))}</ul>
        </>
      )}
    </div>
  )
}

const SOURCES = [['AGENT', 'Agent de santé (moi)'], ['CENTRE_SANTE', 'Centre de santé'], ['HOPITAL', 'Hôpital ou maternité']]

/** Le nom de l'enfant se donne à partir du 8e jour : il complète le dossier déjà reçu par l'état civil. */
function PrenomEnfant({ fiche, onChange }) {
  const { enLigne } = useReseau()
  const [prenom, setPrenom] = useState('')
  const [fait, setFait] = useState(false)
  const [erreur, setErreur] = useState('')
  const attendu = new Date(fiche.dateNaissance); attendu.setDate(attendu.getDate() + 8)
  const reste = Math.ceil((attendu - new Date()) / 86400000)
  const quand = attendu.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  async function envoyer() {
    setErreur('')
    if (!enLigne) { ajouterPrenom({ codeEnfant: fiche.codeEnfant, prenom: prenom.trim() }); setFait('attente'); onChange(); return }
    try { await api.post(`/api/agent/naissances/${fiche.codeEnfant}/prenom`, { prenom: prenom.trim() }); setFait(true); onChange() }
    catch (e) { setErreur(e.message) }
  }
  if (fait) return <p className="succes">{fait === 'attente' ? 'Nom gardé sur cet appareil : il partira à l’état civil dès que le réseau ou une clé USB le permettra.' : 'Nom envoyé à l’état civil.'}</p>
  return (
    <div className="prenom-enfant">
      <div className="prenom-jours" aria-hidden="true"><b>{reste > 0 ? `J-${reste}` : 'Jour 8'}</b></div>
      <div>
        <b>Nom de l'enfant</b>
        {reste > 0 ? <p className="petit">À donner à partir du {quand}. L'état civil attend ce nom pour finir l'acte.</p> : (
          <>
            <p className="petit">Le huitième jour est passé : saisissez le nom donné par la famille.</p>
            <div className="formulaire-ligne">
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={60} autoComplete="off" aria-label="Prénom de l'enfant" />
              <button className="bouton" disabled={prenom.trim().length < 2} onClick={envoyer}>{enLigne ? 'Envoyer à l’état civil' : 'Enregistrer le nom'}</button>
            </div>
            {erreur && <p className="erreur" role="alert">{erreur}</p>}
          </>
        )}
      </div>
    </div>
  )
}

function Naissance({ fiche, onChange }) {
  const d = fiche.declaration
  const [lieu, setLieu] = useState('CENTRE_SANTE')
  const [certificat, setCertificat] = useState(true)
  const [source, setSource] = useState('AGENT')
  const [choix, setChoix] = useState('RIEN') // RIEN · MERE · DEUX
  const [mere, setMere] = useState('')
  const [pere, setPere] = useState('')
  const [prenom, setPrenom] = useState('')
  const [accord, setAccord] = useState(false)
  const [erreur, setErreur] = useState('')
  const [fait, setFait] = useState(false)

  if (d && d.statut !== 'REJETEE') {
    const libelle = { ENVOYEE: 'envoyée à la mairie', VALIDEE: 'validée par la mairie', BROUILLON: 'brouillon' }[d.statut]
    return (
      <>
        <h3>Déclaration de naissance</h3>
        <p>Déclaration {libelle}. Reçu <b>{d.numeroRecu}</b>{d.dansDelaiGratuit ? ' (dans le délai gratuit)' : ' (hors délai gratuit : jugement supplétif à 6 000 FCFA)'}.</p>
        <PrenomEnfant fiche={fiche} onChange={onChange} />
      </>
    )
  }
  if (d?.statut === 'REJETEE') {
    return (
      <>
        <h3>Déclaration de naissance</h3>
        <p className="erreur">Rejetée par la mairie : {d.motifRejet}. À corriger avec la famille et la mairie.</p>
      </>
    )
  }
  if (fait) {
    return <><h3>Déclaration de naissance</h3><p className="succes">Déclaration enregistrée sur ce téléphone. Elle partira à l'état civil dès que le réseau sera là.</p></>
  }

  function lancer() {
    setErreur('')
    const veutMere = choix === 'MERE' || choix === 'DEUX'
    const veutPere = choix === 'DEUX'
    if (veutMere && mere.trim().length < 2) return setErreur('Indiquez le nom et les prénoms de la mère, ou choisissez « rien pour l’instant ».')
    if (veutPere && pere.trim().length < 2) return setErreur('Indiquez le nom du père, ou choisissez « nom de la mère seulement ».')
    if ((veutMere || veutPere) && !accord) return setErreur('Les noms ne partent à l’état civil qu’avec l’accord de la famille : cochez la case une fois l’accord reçu.')
    ajouterDeclaration({
      codeEnfant: fiche.codeEnfant, lieuNaissance: lieu, certificatAccouchement: certificat, source,
      ...(veutMere ? { mereNom: mere.trim(), accordMere: true } : {}),
      ...(veutPere ? { pereNom: pere.trim(), accordPere: true } : {}),
      ...(veutMere && prenom.trim() ? { enfantPrenom: prenom.trim() } : {}),
    })
    setFait(true)
    onChange()
  }

  return (
    <>
      <h3>Déclaration de naissance</h3>
      <p className="petit">Gratuite dans les 45 jours. Au-delà, jugement supplétif (6 000 FCFA).</p>
      <div className="formulaire-ligne">
        <label>Lieu de naissance
          <select value={lieu} onChange={(e) => setLieu(e.target.value)}>
            <option value="CENTRE_SANTE">Centre de santé</option>
            <option value="DOMICILE">À domicile</option>
          </select>
        </label>
        <label>Qui envoie le dossier ?
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="case"><input type="checkbox" checked={certificat} onChange={(e) => setCertificat(e.target.checked)} /> Certificat d'accouchement vu</label>
      </div>

      <fieldset className="identite-acte">
        <legend>Noms à transmettre à l'état civil <em>(facultatif)</em></legend>
        <p className="petit">Fil d'Or ne garde aucun nom par défaut. La famille choisit ce qu'elle souhaite communiquer ; rien n'est envoyé sans son accord.</p>
        {[
          ['RIEN', 'Rien pour l’instant', 'Le dossier part avec le code de l’enfant seulement. La famille pourra donner les noms à l’état civil.'],
          ['MERE', 'Nom de la mère seulement', 'Le père n’est pas nommé (inconnu, absent ou non souhaité).'],
          ['DEUX', 'Nom de la mère et du père', 'Les deux parents sont nommés sur le dossier.'],
        ].map(([k, titre, aide]) => (
          <label key={k} className={`choix-identite ${choix === k ? 'choisi' : ''}`}>
            <input type="radio" name="identite" checked={choix === k} onChange={() => setChoix(k)} />
            <span><b>{titre}</b><small>{aide}</small></span>
          </label>
        ))}
        {choix !== 'RIEN' && (
          <div className="champs">
            <label className="champ"><span className="champ-titre">Nom et prénoms de la mère</span>
              <input value={mere} onChange={(e) => setMere(e.target.value)} autoComplete="off" maxLength={120} /></label>
            {choix === 'DEUX' && (
              <label className="champ"><span className="champ-titre">Nom et prénoms du père</span>
                <input value={pere} onChange={(e) => setPere(e.target.value)} autoComplete="off" maxLength={120} /></label>
            )}
            <label className="champ"><span className="champ-titre">Prénom de l'enfant <em>facultatif</em></span>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="off" maxLength={60} /></label>
          </div>
        )}
        {choix !== 'RIEN' && (
          <label className="case accord-identite"><input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} />
            La famille a donné son accord pour transmettre {choix === 'DEUX' ? 'ces noms' : 'ce nom'} à l'état civil, et sait qu'elle peut le retirer.</label>
        )}
      </fieldset>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <button className="bouton secondaire" onClick={lancer}>Envoyer la déclaration à l'état civil</button>
    </>
  )
}

function Saisie({ fiche, onChange }) {
  const [date, setDate] = useState(aujourdhuiIso())
  const [pb, setPb] = useState('')
  const [poids, setPoids] = useState('')
  const [danger, setDanger] = useState(false)
  const [realises, setRealises] = useState([])
  const [enregistre, setEnregistre] = useState(false)

  const classe = classerPB(pb)
  const aFaire = fiche.rendezVous.filter((r) => r.statut !== 'REALISE' && r.datePrevue <= aujourdhuiIso())

  const basculer = (id) => setRealises((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))

  function enregistrer(e) {
    e.preventDefault()
    ajouterVisite({
      codeEnfant: fiche.codeEnfant,
      dateVisite: date,
      muacMm: pb === '' ? null : Number(pb),
      poidsG: poids === '' ? null : Number(poids),
      signesDanger: danger,
      rendezVousRealises: realises,
    })
    setEnregistre(true)
    setPb(''); setPoids(''); setDanger(false); setRealises([])
    onChange()
  }

  return (
    <form onSubmit={enregistrer}>
      <h3>Saisir la visite</h3>
      <div className="formulaire-ligne">
        <label>Date <input type="date" value={date} max={aujourdhuiIso()} onChange={(e) => setDate(e.target.value)} required /></label>
        <label>Périmètre brachial (mm)
          <input type="number" min="60" max="250" inputMode="numeric" value={pb} onChange={(e) => setPb(e.target.value)} placeholder="ex. 128" />
        </label>
        <label>Poids (g)
          <input type="number" min="500" max="30000" inputMode="numeric" value={poids} onChange={(e) => setPoids(e.target.value)} />
        </label>
      </div>
      {classe !== 'NON_MESURE' && <p className={`pb ${classe.toLowerCase()}`} role="status">{MESSAGE_PB[classe]}</p>}
      <label className="case"><input type="checkbox" checked={danger} onChange={(e) => setDanger(e.target.checked)} /> Signe de danger observé (orienter vers le centre de santé)</label>

      {aFaire.length > 0 && (
        <fieldset>
          <legend>Rendez-vous faits pendant cette visite</legend>
          {aFaire.map((r) => (
            <label className="case" key={r.id}>
              <input type="checkbox" checked={realises.includes(r.id)} onChange={() => basculer(r.id)} />
              {formaterDate(r.datePrevue)} · {r.libelle}
            </label>
          ))}
        </fieldset>
      )}

      <button className="bouton">Enregistrer la visite</button>
      {enregistre && <p className="succes" role="status">Visite enregistrée sur ce téléphone.</p>}
    </form>
  )
}
