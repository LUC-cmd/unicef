import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import ActionsRapides from '../components/ActionsRapides.jsx'
import Shell from '../components/Shell.jsx'
import { CAS, CENTRES, POINTS_CONTROLE, POINTS_NUTRITION, POUR, POUR_BOUTIQUE, VILLAGES } from '../lib/parcours.js'
import { MDP_DEMO } from '../lib/config.js'
import { Appels, District, References, Villages } from './Suivi.jsx'
import Messagerie from './Messagerie.jsx'
import CarteReseau from './CarteReseau.jsx'
import Campagne from './Campagne.jsx'
import Gestion from './Gestion.jsx'
import Manques from './Manques.jsx'
import National from './National.jsx'
import Bornes from './Bornes.jsx'
import Accompagnement from './Accompagnement.jsx'
import Enfants from './Enfants.jsx'
import Attestations from './Attestations.jsx'
import Partenaire from './Partenaire.jsx'
import Synchro from './Synchro.jsx'
import QuiFaitQuoi from './QuiFaitQuoi.jsx'
import { LIAISONS } from '../lib/quiFaitQuoi.js'
import { Structures, TableauCentre, TableauEcole } from './Structures.jsx'
import { ecrireSessionReseau, lireSessionReseau, reseau } from '../lib/reseauClient.js'

const nomVillage = (id) => VILLAGES.find((v) => v.id === id)?.nom ?? id
const nomCentre = (id) => CENTRES.find((c) => c.id === id)?.nom ?? id
const nomPoint = (id) => POINTS_NUTRITION.find((p) => p.id === id)?.nom ?? id
const ETATS_DEMANDE = { demande: 'Demande reçue', visite: 'Visite prévue', suivi: 'Suivi en cours' }
const ETATS_PRODUIT = { attente: 'En attente de validation', valide: 'Validé : conseillé aux familles', refuse: 'Refusé' }
const ETATS_ALERTE = { 'en-route': 'En route', arrive: 'Arrivée', pris: 'Prise en charge' }
const COMPTES_DEMO = [['boutique.agbele', 'Boutique d’Agbélé'], ['boutique.zogbedji', 'Boutique de Zogbédji'], ['agent.nutrition', 'Agent de santé (nutrition)'], ['centre.davie', 'Hôpital de Davié'], ['centre.kpadape', 'Centre de Kpadapé'], ['district.togo', 'Responsable de district'], ['national.togo', 'Responsable national'], ['ecole.agbele', 'Jardin d’enfants et maternelle d’Agbélé'], ['ecole.davie', 'École primaire de Davié'], ['ecole.zogbedji', 'Crèche de Zogbédji']]

/** Charge une liste du service et la rafraîchit toutes les 8 secondes : un cas urgent apparaît sans recharger la page. */
function useListe(chemin, cle, jeton, delai = 8000) {
  const [liste, setListe] = useState(null)
  const [erreur, setErreur] = useState('')
  const charger = useCallback(async () => {
    if (!chemin) return
    try { const r = await reseau.get(chemin, jeton); setListe(r[cle]); setErreur('') } catch (e) { setErreur(e.message) }
  }, [chemin, cle, jeton])
  useEffect(() => { charger(); const t = setInterval(charger, delai); return () => clearInterval(t) }, [charger, delai])
  return [liste, erreur, charger]
}

function Activation({ retour }) {
  const [f, setF] = useState({ identifiant: '', code: '', mdp: '', mdp2: '' })
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const envoyer = async (e) => {
    e.preventDefault(); setMsg('')
    if (f.mdp !== f.mdp2) { setMsg('Les deux mots de passe ne sont pas identiques.'); return }
    try { await reseau.post('activer', { identifiant: f.identifiant, code: f.code, mdp: f.mdp }); setOk(true) } catch (er) { setMsg(er.message) }
  }
  if (ok) return <p role="status">Accès activé. <button type="button" className="bouton" onClick={retour}>Me connecter</button></p>
  return (
    <form onSubmit={envoyer} style={{ display: 'grid', gap: '.8rem', maxWidth: 420 }}>
      <label>Identifiant (donné par votre responsable)<input value={f.identifiant} onChange={(e) => setF({ ...f, identifiant: e.target.value })} autoComplete="username" required /></label>
      <label>Code d’activation<input value={f.code} maxLength={12} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} required /></label>
      <label>Choisissez un mot de passe (8 caractères au moins)<input type="password" value={f.mdp} onChange={(e) => setF({ ...f, mdp: e.target.value })} autoComplete="new-password" minLength={8} required /></label>
      <label>Répétez-le<input type="password" value={f.mdp2} onChange={(e) => setF({ ...f, mdp2: e.target.value })} autoComplete="new-password" required /></label>
      {msg && <p role="alert" className="erreur">{msg}</p>}
      <p><button className="bouton" type="submit">Activer mon accès</button> <button type="button" className="bouton secondaire" onClick={retour}>Retour</button></p>
    </form>
  )
}

function Connexion({ onOk }) {
  const [activer, setActiver] = useState(false)
  const [identifiant, setIdentifiant] = useState('boutique.agbele')
  const [mdp, setMdp] = useState(MDP_DEMO)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const envoyer = async (e) => {
    e.preventDefault(); setErreur(''); setAttente(true)
    try { onOk(await reseau.post('connexion', { identifiant, mdp })) } catch (er) { setErreur(er.message) } finally { setAttente(false) }
  }
  return (
    <>
      <Bandeau surtitre="Boutiques, agents de santé et centres" titre="Espace du réseau Fil d’Or">Une boutique propose ses produits, l’agent de santé les valide et la contrôle, et le centre voit arriver les cas urgents.</Bandeau>
      <main className="page ado">
        <section className="carte">
          <h2>{activer ? 'Première connexion' : 'Se connecter'}</h2>
          {activer ? <Activation retour={() => setActiver(false)} /> : <>
          <form onSubmit={envoyer} style={{ display: 'grid', gap: '.8rem', maxWidth: 420 }}>
            <label>Identifiant<input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" required /></label>
            <label>Mot de passe<input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required /></label>
            {erreur && <p role="alert" className="erreur">{erreur}</p>}
            <button className="bouton" type="submit" disabled={attente}>{attente ? 'Connexion…' : 'Se connecter'}</button>
          </form>
          <details open style={{ marginTop: '1rem' }}>
            <summary>Comptes de démonstration</summary>
            <ul className="liste-coches">{COMPTES_DEMO.map(([id, nom]) => <li key={id}><button type="button" className="bouton secondaire petit-bouton" onClick={() => { setIdentifiant(id); setMdp(MDP_DEMO) }}>{id}</button> {nom}</li>)}</ul>
            <p className="petit">Un clic pré-remplit le compte. Comptes fictifs de démonstration, à ne pas utiliser en production.</p>
          </details>
          <p><button type="button" className="bouton secondaire" onClick={() => setActiver(true)}>Première connexion : activer mon accès</button></p>
          </>}
        </section>
        <p className="petit">Les familles, elles, n’ont pas besoin de compte : <Link to="/nutrition">trouver une boutique</Link>.</p>
      </main>
    </>
  )
}

const Tuile = ({ n, titre, alerte }) => <div className={`reseau-tuile${alerte ? ' alerte' : ''}`}><b>{n ?? '…'}</b><span>{titre}</span></div>

function Tableau({ s }) {
  const [produits] = useListe(s.role === 'centre' ? null : 'produits', 'produits', s.jeton)
  const [demandes] = useListe(s.role === 'centre' ? 'alertes' : 'demandes', s.role === 'centre' ? 'alertes' : 'demandes', s.jeton)
  const [controles] = useListe(s.role === 'centre' ? null : 'controles', 'controles', s.jeton, 15000)
  const [questions] = useListe(s.role === 'agent' ? 'questions' : null, 'questions', s.jeton, 15000)
  const dernier = controles?.[0]
  const t = []
  if (s.role === 'boutique') t.push(['Produits validés', produits?.filter((p) => p.etat === 'valide').length], ['En attente de validation', produits?.filter((p) => p.etat === 'attente').length, true], ['Demandes de familles', demandes?.filter((d) => d.etat === 'demande').length])
  if (s.role === 'agent') t.push(['Produits à valider', produits?.filter((p) => p.etat === 'attente').length, true], ['Demandes sans visite', demandes?.filter((d) => d.etat === 'demande').length], ['Questions sans réponse', questions?.filter((q) => !q.reponse).length], ['Boutiques à corriger', controles ? new Set(controles.filter((c, i, a) => a.findIndex((x) => x.pointId === c.pointId) === i && !c.conforme).map((c) => c.pointId)).size : undefined])
  if (s.role === 'centre') t.push(['Cas en route', demandes?.filter((a) => a.etat === 'en-route').length, true], ['Dont urgents', demandes?.filter((a) => a.etat === 'en-route' && a.niveau === 'urgent').length, true], ['Pris en charge', demandes?.filter((a) => a.etat === 'pris').length])
  return (
    <>
      <Bandeau titre="Tableau de bord">{s.nom}</Bandeau>
      <div className="reseau-tuiles">{t.map(([titre, n, a]) => <Tuile key={titre} titre={titre} n={n} alerte={a && n > 0} />)}</div>
      <section className="carte reseau-afaire">
        <h2>À traiter maintenant</h2>
        {s.role === 'agent' && <ul className="liste-coches">
          {(produits ?? []).filter((p) => p.etat === 'attente').map((p) => <li key={p.id}>Valider « {p.nom} » ({nomPoint(p.pointId)}). <Link to="/reseau/produits">Ouvrir</Link></li>)}
          {(questions ?? []).filter((q) => !q.reponse).map((q) => <li key={q.id}>Répondre à une question anonyme : « {q.texte.slice(0, 70)} ». <Link to="/reseau/questions">Ouvrir</Link></li>)}
          {(demandes ?? []).filter((d) => d.etat === 'demande').map((d) => <li key={d.id}>Planifier une visite à {nomPoint(d.pointId)}. <Link to="/reseau/demandes">Ouvrir</Link></li>)}
        </ul>}
        {s.role === 'boutique' && <ul className="liste-coches">
          {(produits ?? []).filter((p) => p.etat === 'attente').map((p) => <li key={p.id}>« {p.nom} » attend la validation d’un agent de santé.</li>)}
          {(produits ?? []).filter((p) => p.etat === 'refuse').map((p) => <li key={p.id}>« {p.nom} » refusé : {p.motif || 'voir avec l’agent'}.</li>)}
          {(demandes ?? []).filter((d) => d.etat === 'demande').map((d) => <li key={d.id}>Une famille de {VILLAGES.find((v) => v.id === d.village)?.nom ?? d.village} a demandé un suivi ({POUR[d.pour] ?? d.pour}).</li>)}
        </ul>}
        {s.role === 'centre' && <ul className="liste-coches">
          {(demandes ?? []).filter((a) => a.etat === 'en-route').map((a) => <li key={a.id}><b>{a.niveau === 'urgent' ? 'URGENT' : 'À surveiller'}</b> · {(CAS[a.cas] ?? a.cas)} depuis {VILLAGES.find((v) => v.id === a.depuis)?.nom ?? a.depuis} : {(a.signes ?? []).join(', ') || 'signes non précisés'}. <Link to="/reseau/alertes">Ouvrir</Link></li>)}
        </ul>}
      </section>
      {s.role === 'boutique' && <section className="carte"><h2>Dernier contrôle de ma boutique</h2>{dernier ? <p><b>{dernier.date}</b> · {dernier.conforme ? 'Conforme' : `À corriger : ${dernier.n} points sur ${POINTS_CONTROLE.length}`}</p> : <p>Aucun contrôle pour l’instant.</p>}</section>}
      <p className="petit">Données fictives de démonstration. Mise à jour automatique toutes les 8 secondes.</p>
    </>
  )
}

function Produits({ s }) {
  const agent = s.role === 'agent'
  const [liste, erreur, recharger] = useListe('produits', 'produits', s.jeton)
  const [f, setF] = useState({ nom: '', pour: 'petit', prix: '', description: '' })
  const [msg, setMsg] = useState('')
  const [motifs, setMotifs] = useState({})
  const ajouter = async (e) => {
    e.preventDefault(); setMsg('')
    try { await reseau.post('produits', f, s.jeton); setF({ nom: '', pour: f.pour, prix: '', description: '' }); setMsg('Produit envoyé. Un agent de santé doit le valider avant qu’il soit conseillé aux familles.'); recharger() } catch (er) { setMsg(er.message) }
  }
  const decider = async (id, etat) => { try { await reseau.patch(`produits/${id}`, { etat, motif: motifs[id] ?? '' }, s.jeton); recharger() } catch (er) { setMsg(er.message) } }
  const visibles = liste ?? []
  return (
    <>
      <Bandeau titre={agent ? 'Produits à valider' : 'Mes produits'}>{agent ? 'Un produit validé est conseillé aux familles. Refusez ce qui ne convient pas, avec un motif.' : 'Ajoutez les produits que vous vendez pour les enfants, les femmes enceintes et les jeunes filles. Un agent de santé les valide.'}</Bandeau>
      {!agent && (
        <section className="carte">
          <h2>Ajouter un produit</h2>
          <form onSubmit={ajouter} style={{ display: 'grid', gap: '.7rem' }}>
            <div className="ado-champs">
              <label>Nom du produit<input value={f.nom} maxLength={80} onChange={(e) => setF({ ...f, nom: e.target.value })} required /></label>
              <label>Conseillé pour<select value={f.pour} onChange={(e) => setF({ ...f, pour: e.target.value })}>{Object.entries(POUR_BOUTIQUE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
              <label>Prix indicatif<input value={f.prix} maxLength={40} placeholder="700 FCFA" onChange={(e) => setF({ ...f, prix: e.target.value })} /></label>
            </div>
            <label>Pourquoi il convient<textarea rows="2" maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <p><button className="bouton" type="submit">Envoyer pour validation</button></p>
          </form>
          {msg && <p role="status">{msg}</p>}
        </section>
      )}
      <section className="carte">
        <h2>{agent ? 'Tous les produits' : 'Mes produits'}</h2>
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
        {liste?.length === 0 && <p>Aucun produit.</p>}
        <ul className="liste-coches">
          {visibles.map((p) => (
            <li key={p.id}><b>{p.nom}</b> · {POUR_BOUTIQUE[p.pour]} · {p.prix || 'prix non indiqué'}{agent ? ` · ${nomPoint(p.pointId)}` : ''}<br />{p.description}<br /><i>{ETATS_PRODUIT[p.etat]}{p.motif ? ` : ${p.motif}` : ''}</i>
              {agent && p.etat === 'attente' && (
                <div style={{ display: 'grid', gap: '.4rem', marginTop: '.4rem' }}>
                  <input placeholder="Motif en cas de refus" value={motifs[p.id] ?? ''} onChange={(e) => setMotifs({ ...motifs, [p.id]: e.target.value })} aria-label={`Motif pour ${p.nom}`} />
                  <span style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><button type="button" className="bouton" onClick={() => decider(p.id, 'valide')}>Valider</button><button type="button" className="bouton secondaire" onClick={() => decider(p.id, 'refuse')}>Refuser</button></span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Demandes({ s }) {
  const [liste, erreur, recharger] = useListe('demandes', 'demandes', s.jeton)
  const avancer = async (d, etat) => { try { await reseau.patch(`demandes/${d.id}`, { etat }, s.jeton); recharger() } catch { /* réessayer */ } }
  return (
    <>
      <Bandeau titre={s.role === 'agent' ? 'Demandes et visites' : 'Demandes reçues'}>Des familles demandent un suivi alimentaire. Sans nom : seulement le village et la raison.</Bandeau>
      <section className="carte">
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
        {liste?.length === 0 && <p>Aucune demande pour l’instant.</p>}
        <ul className="liste-coches">
          {(liste ?? []).map((d) => (
            <li key={d.id}><b>{POUR[d.pour]}</b> · {nomVillage(d.village)} · {d.date} · {ETATS_DEMANDE[d.etat]}<br /><small>{nomPoint(d.pointId)}</small>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {d.etat === 'demande' && <button type="button" className="bouton secondaire" onClick={() => avancer(d, 'visite')}>Prévoir une visite</button>}
                {d.etat === 'visite' && <button type="button" className="bouton secondaire" onClick={() => avancer(d, 'suivi')}>Visite faite : suivi en cours</button>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Controles({ s }) {
  const agent = s.role === 'agent'
  const [liste, erreur, recharger] = useListe('controles', 'controles', s.jeton)
  const [point, setPoint] = useState('n2')
  const [ok, setOk] = useState([])
  const LIB = { periodes: 'Aucun produit périmé en rayon', hygiene: 'Produits à l’abri de l’humidité et des animaux', prix: 'Prix affichés et respectés', substituts: 'Aucune promotion de lait en poudre pour bébé de moins de 6 mois', bons: 'Bons des nutritionnistes comptés et conservés' }
  const noter = async () => { try { await reseau.post('controles', { pointId: point, ok }, s.jeton); setOk([]); recharger() } catch { /* réessayer */ } }
  return (
    <>
      <Bandeau titre={agent ? 'Contrôler une boutique' : 'Contrôles de ma boutique'}>{agent ? 'À chaque passage, cochez ce qui est en règle. Une boutique non conforme doit corriger avant de recevoir de nouveaux bons.' : 'Résultats des passages des agents de santé.'}</Bandeau>
      {agent && (
        <section className="carte">
          <label>Boutique<select value={point} onChange={(e) => setPoint(e.target.value)}>{POINTS_NUTRITION.filter((p) => p.type === 'Boutique partenaire').map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></label>
          {POINTS_CONTROLE.map(([id]) => <label key={id} className="soin-case"><input type="checkbox" checked={ok.includes(id)} onChange={() => setOk(ok.includes(id) ? ok.filter((x) => x !== id) : [...ok, id])} /><span>{LIB[id]}</span></label>)}
          <p><button type="button" className="bouton" onClick={noter}>Enregistrer ce contrôle</button></p>
        </section>
      )}
      <section className="carte">
        <h2>Historique</h2>
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
        {liste?.length === 0 && <p>Aucun contrôle.</p>}
        <ul className="liste-coches">{(liste ?? []).map((c) => <li key={c.id}><b>{c.date}</b> · {nomPoint(c.pointId)} · {c.conforme ? 'Conforme' : `À corriger (${c.n} points sur ${POINTS_CONTROLE.length})`}</li>)}</ul>
      </section>
    </>
  )
}

function Questions({ s }) {
  const [liste, erreur, recharger] = useListe('questions', 'questions', s.jeton, 10000)
  const [rep, setRep] = useState({})
  const repondre = async (q) => { try { await reseau.patch(`questions/${q.id}`, { reponse: rep[q.id] ?? '' }, s.jeton); recharger() } catch { /* réessayer */ } }
  return (
    <>
      <Bandeau titre="Questions anonymes">Des jeunes filles posent leurs questions sans donner leur nom. Elles liront la réponse avec leur numéro. Répondez avec bienveillance, sans jugement.</Bandeau>
      <section className="carte">
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
        {liste?.length === 0 && <p>Aucune question.</p>}
        <ul className="liste-coches">
          {(liste ?? []).map((q) => (
            <li key={q.id}><b>{q.date}</b> : {q.texte}{q.reponse ? <><br /><i>Répondu : {q.reponse}</i></> : (
              <div style={{ display: 'grid', gap: '.4rem', marginTop: '.4rem' }}>
                <textarea rows="2" value={rep[q.id] ?? ''} onChange={(e) => setRep({ ...rep, [q.id]: e.target.value })} aria-label="Réponse" />
                <button type="button" className="bouton secondaire" onClick={() => repondre(q)}>Répondre</button>
              </div>
            )}</li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Alertes({ s }) {
  const [liste, erreur, recharger] = useListe('alertes', 'alertes', s.jeton, 5000)
  const rang = (a) => (a.etat === 'pris' ? 2 : 0) + (a.niveau === 'urgent' ? 0 : 1)
  const tri = [...(liste ?? [])].sort((a, b) => rang(a) - rang(b) || a.heure.localeCompare(b.heure))
  const suite = (a) => (a.etat === 'en-route' ? ['arrive', 'Marquer arrivée'] : a.etat === 'arrive' ? ['pris', 'Marquer prise en charge'] : null)
  const avancer = async (a, etat) => { try { await reseau.patch(`alertes/${a.id}`, { etat }, s.jeton); recharger() } catch { /* réessayer */ } }
  return (
    <>
      <Bandeau titre="Cas qui arrivent">Les urgences passent en premier. La liste se met à jour toute seule toutes les 5 secondes.</Bandeau>
      <section className="carte">
        {erreur && <p role="alert" className="erreur">{erreur}</p>}
        {tri.length === 0 && <p>Aucun cas annoncé pour votre centre.</p>}
        <ul className="liste-coches">
          {tri.map((a) => (
            <li key={a.id} className={a.niveau === 'urgent' && a.etat !== 'pris' ? 'reseau-urgent' : ''}>
              <b>{a.niveau === 'urgent' ? 'URGENT' : 'À voir'}</b> · {CAS[a.cas]} · vient de {nomVillage(a.depuis)} · {ETATS_ALERTE[a.etat]}<br />
              <small>Signes : {a.signes.join(', ') || 'non précisés'} · annoncé à {new Date(a.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
              {suite(a) && <div><button type="button" className="bouton secondaire" onClick={() => avancer(a, suite(a)[0])}>{suite(a)[1]}</button></div>}
            </li>
          ))}
        </ul>
        <p className="petit">Aucun nom : seulement le type de cas, les signes et le village d’où il vient.</p>
      </section>
    </>
  )
}

const MENUS = {
  boutique: { teinte: 'vert', groupes: [{ titre: 'Ma boutique', liens: [{ to: '/reseau', nom: 'Tableau de bord', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/produits', nom: 'Mes produits', icone: 'boite' }, { to: '/reseau/demandes', nom: 'Demandes reçues', icone: 'liste' }, { to: '/reseau/controles', nom: 'Contrôles', icone: 'bouclier' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
  agent: { teinte: 'cyan', groupes: [{ titre: 'Réseau nutrition', liens: [{ to: '/reseau', nom: 'Tableau de bord', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/produits', nom: 'Produits à valider', icone: 'coche' }, { to: '/reseau/demandes', nom: 'Demandes et visites', icone: 'liste' }, { to: '/reseau/controles', nom: 'Contrôler une boutique', icone: 'bouclier' }, { to: '/reseau/questions', nom: 'Questions anonymes', icone: 'bulle' }, { to: '/reseau/accompagnement', nom: 'Filles à contacter', icone: 'bulle' }] }, { titre: 'Suivi des enfants', liens: [{ to: '/reseau/enfants', nom: 'Chercher un enfant', icone: 'liste' }, { to: '/reseau/villages', nom: 'Villages', icone: 'accueil' }, { to: '/reseau/references', nom: 'Références', icone: 'liste' }, { to: '/reseau/appels', nom: 'Appels vocaux', icone: 'bulle' }, { to: '/reseau/structures', nom: 'Crèches et écoles', icone: 'boite' }] }, { titre: 'Sur le terrain', liens: [{ to: '/reseau/campagne', nom: 'Campagne porte-à-porte', icone: 'coche' }, { to: '/reseau/manques', nom: 'Où il manque', icone: 'carte' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
  district: { teinte: 'cyan', groupes: [{ titre: 'District', liens: [{ to: '/reseau', nom: 'Vue d’ensemble', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/enfants', nom: 'Chercher un enfant', icone: 'liste' }, { to: '/reseau/villages', nom: 'Villages', icone: 'liste' }, { to: '/reseau/references', nom: 'Références', icone: 'coche' }, { to: '/reseau/appels', nom: 'Appels vocaux', icone: 'bulle' }, { to: '/reseau/structures', nom: 'Crèches et écoles', icone: 'boite' }, { to: '/reseau/manques', nom: 'Où il manque', icone: 'carte' }] }, { titre: 'Gestion', liens: [{ to: '/reseau/gestion', nom: 'Créer centres, écoles, villages', icone: 'cle' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
  national: { teinte: 'cyan', groupes: [{ titre: 'National', liens: [{ to: '/reseau', nom: 'Tableau national', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/manques', nom: 'Où il manque', icone: 'carte' }] }, { titre: 'Gestion', liens: [{ to: '/reseau/gestion', nom: 'Créer les régionaux', icone: 'cle' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },

  regional: { teinte: 'cyan', groupes: [{ titre: 'Région', liens: [{ to: '/reseau', nom: 'Tableau de la région', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/manques', nom: 'Où il manque', icone: 'carte' }] }, { titre: 'Gestion', liens: [{ to: '/reseau/gestion', nom: 'Mes districts', icone: 'cle' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
  ecole: { teinte: 'vert', groupes: [{ titre: 'Mon établissement', liens: [{ to: '/reseau', nom: 'Tableau de bord', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }] }, { titre: 'Mes autres espaces', liens: [{ to: '/connexion', nom: 'Espace crèche et structure', icone: 'batiment' }, { to: '/fonctionnement', nom: 'Comment tout se relie', icone: 'aide' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
  technicien: { teinte: 'orange', groupes: [{ titre: 'Bornes', liens: [{ to: '/reseau', nom: 'Mes bornes', icone: 'accueil', fin: true }, { to: '/reseau/bornes', nom: 'Stock et relevés', icone: 'boite' }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/manques', nom: 'Où il manque', icone: 'liste' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
  partenaire: { teinte: 'cyan', groupes: [{ titre: 'UNICEF Togo', liens: [{ to: '/reseau', nom: 'Vue d’ensemble', icone: 'accueil', fin: true }, { to: '/reseau/bornes', nom: 'Les bornes', icone: 'boite' }, { to: '/reseau/manques', nom: 'Où il manque', icone: 'liste' }, { to: '/reseau/carte', nom: 'Carte du réseau', icone: 'carte' }] }, { titre: 'Aide', liens: [{ to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }, { to: '/reseau/synchro', nom: 'Données et sécurité', icone: 'bouclier' }] }] },
  centre: { teinte: 'orange', groupes: [{ titre: 'Centre de santé ou hôpital', liens: [{ to: '/reseau', nom: 'Tableau de bord', icone: 'accueil', fin: true }, { to: '/reseau/carte', nom: 'Carte et itinéraires', icone: 'carte' }, { to: '/reseau/alertes', nom: 'Cas qui arrivent', icone: 'horloge' }, { to: '/reseau/enfants', nom: 'Chercher un enfant', icone: 'liste' }, { to: '/reseau/attestations', nom: 'Cachet et attestations', icone: 'cle' }, { to: '/reseau/references', nom: 'Références', icone: 'coche' }, { to: '/reseau/accompagnement', nom: 'Filles à contacter', icone: 'bulle' }] }, { titre: 'Gestion', liens: [{ to: '/reseau/gestion', nom: 'Mes agents', icone: 'cle' }] }, { titre: 'Aide', liens: [{ to: '/reseau/synchro', nom: 'Hors réseau', icone: 'aide' }, { to: '/reseau/roles', nom: 'Qui fait quoi', icone: 'aide' }] }] },
}
// Chaque rôle (sauf le partenaire, en lecture seule) a un groupe « Échanger » : messagerie entre comptes.
Object.entries(MENUS).forEach(([role, m]) => {
  if (role !== 'partenaire') m.groupes.splice(1, 0, { titre: 'Échanger', liens: [{ to: '/reseau/messages', nom: 'Messagerie', icone: 'bulle' }] })
})
const TITRES = { regional: 'Responsable régional', boutique: 'Boutique partenaire', agent: 'Agent de santé', centre: 'Centre de santé', district: 'Responsable de district', national: 'Responsable national', technicien: 'Technicien des bornes', partenaire: 'Partenaire UNICEF (lecture seule)', ecole: 'Établissement 0-5 ans' }

const ACTIONS = {
  agent: [['/reseau/campagne', 'Visiter une maison (scanner le QR)', true], ['/reseau/enfants', 'Chercher un enfant par son code'], ['/reseau/references', 'Envoyer une référence au centre'], ['/reseau/produits', 'Valider des produits'], ['/reseau/questions', 'Répondre aux filles'], ['/reseau/accompagnement', 'Contacter les filles qui l’ont demandé'], ['/reseau/appels', 'Appeler les familles']],
  centre: [['/reseau/alertes', 'Voir les cas qui arrivent', true], ['/reseau/attestations', 'Établir une attestation tamponnée'], ['/reseau/gestion', 'Créer un compte agent'], ['/reseau/carte', 'Itinéraire vers un lieu'], ['/reseau/messages', 'Écrire à un agent']],
  regional: [['/reseau/gestion', 'Créer un compte district', true], ['/reseau/manques', 'Voir où il manque un service'], ['/reseau/carte', 'Carte'], ['/reseau/messages', 'Écrire à un district']],
  boutique: [['/reseau/produits', 'Ajouter ou modifier un produit', true], ['/reseau/demandes', 'Répondre aux demandes'], ['/reseau/controles', 'Voir les contrôles']],
  ecole: [['/reseau/carte', 'Trouver le centre le plus proche', true], ['/reseau/messages', 'Écrire au centre ou à l’agent']],
  technicien: [['/reseau/bornes', 'Installer une borne (ville ou village)', true], ['/reseau/bornes', 'Enregistrer une relève'], ['/reseau/manques', 'Où placer une borne']],
  partenaire: [['/reseau/bornes', 'Voir l’état des bornes', true], ['/reseau/manques', 'Voir où il manque un service'], ['/reseau/carte', 'Carte du réseau']],
}

export default function Reseau() {
  const [s, setS] = useState(lireSessionReseau)
  const nav = useNavigate()
  const lieu = useLocation()
  if (!s) return <Connexion onOk={(r) => { ecrireSessionReseau(r); setS(r) }} />
  const m = MENUS[s.role]
  const titre = s.role === 'centre' && s.ref === 'c4' ? 'Hôpital' : TITRES[s.role]
  return (
    <Shell titre={titre} teinte={m.teinte} groupes={m.groupes} nom={s.nom} sous={titre} utilisateur={s.identifiant}>
      <div className="liaisons" aria-label="Liaisons de cet espace">
        {[['Reçoit de', 'recoit'], ['Envoie à', 'envoie']].map(([t, k]) => (
          <div key={k}><b>{t}</b><span>{(LIAISONS[s.role === 'centre' && s.ref === 'c4' ? 'hopital' : s.role]?.[k] ?? []).map((x) => <i key={x}>{x}</i>)}</span></div>
        ))}
        <button type="button" className="bouton secondaire petit-bouton" onClick={() => nav('/reseau/roles')}>Qui fait quoi</button>
      </div>
      {/^\/reseau\/?$/.test(lieu.pathname) && ACTIONS[s.role] && <ActionsRapides actions={ACTIONS[s.role]} />}
      <Routes>
        <Route index element={s.role === 'technicien' ? <Bornes s={s} /> : s.role === 'partenaire' ? <Partenaire s={s} /> : (s.role === 'national' || s.role === 'regional') ? <National s={s} /> : s.role === 'district' ? <District s={s} /> : s.role === 'ecole' ? <TableauEcole s={s} /> : s.role === 'centre' ? <TableauCentre s={s} /> : <Tableau s={s} />} />
        <Route path="carte" element={<CarteReseau s={s} />} />
        <Route path="messages" element={s.role === 'partenaire' ? <Partenaire s={s} /> : <Messagerie s={s} />} />
        <Route path="roles" element={<QuiFaitQuoi dans />} />
        <Route path="synchro" element={<Synchro />} />
        <Route path="bornes" element={['technicien', 'partenaire', 'district'].includes(s.role) ? <Bornes s={s} /> : <Tableau s={s} />} />
        <Route path="gestion" element={['district', 'national', 'regional', 'centre'].includes(s.role) ? <Gestion s={s} /> : <Tableau s={s} />} />
        <Route path="manques" element={['district', 'national', 'regional', 'agent', 'technicien', 'partenaire'].includes(s.role) ? <Manques s={s} /> : <Tableau s={s} />} />
        <Route path="campagne" element={s.role === 'agent' ? <Campagne s={s} /> : <Tableau s={s} />} />
        <Route path="structures" element={s.role === 'agent' || s.role === 'district' ? <Structures s={s} /> : <Tableau s={s} />} />
        <Route path="villages" element={s.role === 'centre' || s.role === 'boutique' || s.role === 'ecole' ? <Tableau s={s} /> : <Villages s={s} />} />
        <Route path="references" element={s.role === 'boutique' || s.role === 'ecole' ? <Tableau s={s} /> : <References s={s} />} />
        <Route path="appels" element={s.role === 'centre' || s.role === 'boutique' || s.role === 'ecole' ? <Tableau s={s} /> : <Appels s={s} />} />
        <Route path="produits" element={s.role === 'centre' ? <Tableau s={s} /> : <Produits s={s} />} />
        <Route path="demandes" element={s.role === 'centre' ? <Tableau s={s} /> : <Demandes s={s} />} />
        <Route path="controles" element={s.role === 'centre' ? <Tableau s={s} /> : <Controles s={s} />} />
        <Route path="questions" element={s.role === 'agent' ? <Questions s={s} /> : <Tableau s={s} />} />
        <Route path="attestations" element={s.role === 'centre' ? <Attestations s={s} /> : <Tableau s={s} />} />
        <Route path="enfants" element={['agent', 'centre', 'district'].includes(s.role) ? <Enfants s={s} /> : <Tableau s={s} />} />
        <Route path="accompagnement" element={s.role === 'agent' || s.role === 'centre' ? <Accompagnement s={s} /> : <Tableau s={s} />} />
        <Route path="alertes" element={s.role === 'centre' ? <Alertes s={s} /> : <Tableau s={s} />} />
        <Route path="*" element={s.role === 'technicien' ? <Bornes s={s} /> : s.role === 'partenaire' ? <Partenaire s={s} /> : (s.role === 'national' || s.role === 'regional') ? <National s={s} /> : s.role === 'district' ? <District s={s} /> : s.role === 'ecole' ? <TableauEcole s={s} /> : s.role === 'centre' ? <TableauCentre s={s} /> : <Tableau s={s} />} />
      </Routes>
    </Shell>
  )
}
