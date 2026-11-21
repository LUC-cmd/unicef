import { useEffect, useState } from 'react'
import Ussd from '../components/Ussd.jsx'
import { api } from '../lib/api.js'
import Bandeau from '../components/Bandeau.jsx'
import {
  LIBELLE_LANGUE, LIBELLE_ROLE_PROCHE, LIBELLE_SUJET, LIBELLE_TYPE_STRUCTURE, formaterDate,
} from '../lib/format.js'

const SUJETS = Object.keys(LIBELLE_SUJET)

function lire(texte) {
  // Lecture vocale du navigateur : ne remplace pas de vraies voix enregistrées avec des locuteurs natifs.
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = 'fr-FR'
  window.speechSynthesis.speak(u)
}

const LIBELLE_MESSAGE = {
  RAPPEL: 'Rappel de rendez-vous',
  JEU: "Jeu de la semaine",
  REPONSE_STRUCTURE: 'Réponse d\u2019une structure',
  RAPPEL_GENERAL: 'Rappel général',
  NAISSANCE: 'Avis de la mairie',
}

const ONGLETS_FAMILLE = [['appel', 'Appeler'], ['ussd', 'USSD'], ['sms', 'Messages'], ['jeu', 'Jeu du jour'], ['structures', 'Structures'], ['manque', 'Appel manqué']]
const ONGLETS_PROCHE = [['sms', 'Messages'], ['appel', 'Appeler']]

/* Numéros de démonstration pré-remplis pour un accès rapide */
const NUMEROS_DEMO = [
  { numero: '90000001', label: 'Famille 1', type: 'FAMILLE' },
  { numero: '90000002', label: 'Famille 2', type: 'FAMILLE' },
  { numero: '90000010', label: 'Famille 10', type: 'FAMILLE' },
  { numero: '90000045', label: 'Famille 45', type: 'FAMILLE' },
  { numero: '91000001', label: 'Proche (père)', type: 'PROCHE' },
  { numero: '91000046', label: 'Proche (grand-parent)', type: 'PROCHE' },
]

export default function Telephone() {
  const [modele, setModele] = useState('smart')
  const [heure, setHeure] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setHeure(new Date()), 15000); return () => clearInterval(t) }, [])
  const [numero, setNumero] = useState('90000001')
  const [profil, setProfil] = useState(null)
  const [onglet, setOnglet] = useState('appel')
  const [langue, setLangue] = useState('')
  const [message, setMessage] = useState(null)
  const [sms, setSms] = useState([])
  const [jeux, setJeux] = useState([])
  const [structures, setStructures] = useState([])
  const [info, setInfo] = useState('')
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const [urgenceMotif, setUrgenceMotif] = useState('Convulsion ou fièvre forte')
  const [urgenceEnvoyee, setUrgenceEnvoyee] = useState(false)

  const chiffres = numero.replace(/\D/g, '')
  // N'importe quel numéro marche : on garde les 8 derniers chiffres (« +228 », « 00228 » ou un 0 devant sont ignorés).
  const local = chiffres.length > 8 ? chiffres.slice(-8) : chiffres
  const proche = profil?.profil === 'PROCHE'
  // Numéro libre : la démonstration utilise une famille fictive pour que chaque simulation fonctionne.
  const telEff = profil?.test ? '90000001' : local
  const onglets = proche ? ONGLETS_PROCHE : ONGLETS_FAMILLE

  // Qui est ce numéro ? Famille, proche, ou inconnu : le téléphone s'adapte.
  useEffect(() => {
    setProfil(null)
    setErreur('')
    if (local.length < 8) return undefined
    const t = setTimeout(() => {
      api.post('/api/public/profil', { telephone: local })
        .then((p) => {
          setProfil(p)
          setErreur('')
        })
        .catch((e) => {
          setProfil(!e.statut || e.statut >= 500 ? { profil: 'HORS_LIGNE' } : { profil: 'FAMILLE', test: true })
          if (e.statut === 0) setErreur('Le serveur ne répond pas. Lancez le backend avec : cd backend && mvn spring-boot:run')
        })
    }, 350)
    return () => clearTimeout(t)
  }, [local])

  useEffect(() => {
    if (proche && !['sms', 'appel'].includes(onglet)) setOnglet('sms')
  }, [proche, onglet])

  async function executer(fn) {
    setErreur(''); setInfo(''); setAttente(true)
    try { await fn() } catch (e) { setErreur(e.message) } finally { setAttente(false) }
  }

  const ecouter = (sujet) => executer(async () => {
    const m = await api.post('/api/public/voix', { telephone: telEff, sujet, langue: langue || null })
    setMessage(m); lire(m.texte)
  })
  const chargerSms = () => executer(async () => setSms((await api.post('/api/public/sms', { telephone: telEff })).messages ?? []))
  const chargerJeux = () => executer(async () => setJeux(await api.post('/api/public/jeu', { telephone: telEff })))
  const chargerStructures = () => executer(async () => setStructures(await api.post('/api/public/structures/proches', { telephone: telEff })))

  useEffect(() => {
    if (profil?.profil !== 'FAMILLE' && profil?.profil !== 'PROCHE') return
    if (onglet === 'sms') chargerSms()
    if (onglet === 'jeu' && !proche) chargerJeux()
    if (onglet === 'structures' && !proche) chargerStructures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet, profil])

  const repondreOk = (id) => executer(async () => {
    const r = await api.post(`/api/public/sms/${id}/ok`, { telephone: telEff })
    setInfo(r.message); setSms((await api.post('/api/public/sms', { telephone: telEff })).messages ?? [])
  })
  const appelManque = () => executer(async () => setInfo((await api.post('/api/public/appel-manque', { telephone: telEff })).message))
  const jeuFait = (codeEnfant) => executer(async () => {
    setInfo((await api.post('/api/public/jeu/fait', { telephone: telEff, codeEnfant })).message)
    setJeux(await api.post('/api/public/jeu', { telephone: telEff }))
  })
  const demander = (codeStructure, motif) => executer(async () =>
    setInfo((await api.post('/api/public/demandes', { telephone: telEff, codeStructure, motif })).message))
  const urgence = () => executer(async () => {
    const r = await api.post('/api/public/urgence', { telephone: telEff, motif: urgenceMotif })
    setInfo(r.message)
    setUrgenceEnvoyee(true)
  })

  /* Indicateur visuel du statut du profil */
  const profilIndicateur = (() => {
    if (local.length < 8) return { couleur: '#888', texte: 'Tapez un numéro à 8 chiffres (le +228 est accepté).' }
    if (!profil) return { couleur: '#1cabe2', texte: 'Vérification du numéro…' }
    if (profil.test) return { couleur: '#00833d', texte: 'Numéro de test : la démonstration utilise une famille fictive. Tout fonctionne.' }
    if (profil.profil === 'FAMILLE') return { couleur: '#00833d', texte: 'Famille suivie par Fil d\'Or.' }
    if (profil.profil === 'PROCHE') return { couleur: '#374ea2', texte: `Proche (${LIBELLE_ROLE_PROCHE[profil.roleProche] ?? 'proche'}) : rappels généraux seulement.` }
    if (profil.profil === 'INCONNU') return { couleur: '#e2231a', texte: 'Numéro non enregistré. Essayez un numéro ci-dessous.' }
    if (profil.profil === 'HORS_LIGNE') return { couleur: '#f26a21', texte: 'Le serveur ne répond pas. Lancez le backend.' }
    return { couleur: '#888', texte: 'Statut inconnu.' }
  })()

  return (
    <>
    <Bandeau surtitre="Porte 1" titre="Simulateur de téléphone">
      Un téléphone basique suffit, sans data. Choisissez un numéro de test ci-dessous pour essayer.
    </Bandeau>
    <main className="page">

      <div className="telephone-cadre">
        <div className="tel-boite">
        <div className="b3d-vues" role="group" aria-label="Type de téléphone">
          <button type="button" aria-pressed={modele === 'smart'} onClick={() => setModele('smart')}>Smartphone</button>
          <button type="button" aria-pressed={modele === 'basique'} onClick={() => setModele('basique')}>Téléphone à touches</button>
        </div>
        <div className={`tel-corps ${modele}`}>
        <span className="tel-haut-parleur" aria-hidden="true" />
        <div className="tel-statut" aria-hidden="true">
          <b>{heure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b>
          <span>Togo Mobile</span>
          <span className="tel-signal"><i /><i /><i /><i /></span>
          <span>{modele === 'smart' ? 'SMS · voix · USSD' : '2G'}</span>
        </div>
        <div className="telephone" role="group" aria-label="Téléphone simulé">

          {/* Numéros de démo rapides */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px 16px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderBottom: '1px solid #dee2e6', borderRadius: '12px 12px 0 0'
          }}>
            <span style={{ width: '100%', fontSize: '12px', fontWeight: 600, color: '#495057', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Numéros de test rapide
            </span>
            {NUMEROS_DEMO.map((d) => (
              <button
                key={d.numero}
                type="button"
                onClick={() => { setNumero(d.numero); setMessage(null); setErreur(''); setInfo(''); setUrgenceEnvoyee(false) }}
                style={{
                  padding: '4px 10px', borderRadius: '20px', border: 'none', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: numero === d.numero
                    ? (d.type === 'FAMILLE' ? 'linear-gradient(135deg, #00833d, #00a84f)' : 'linear-gradient(135deg, #374ea2, #5b73c4)')
                    : '#fff',
                  color: numero === d.numero ? '#fff' : '#333',
                  boxShadow: numero === d.numero ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                  fontWeight: numero === d.numero ? 600 : 400,
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="ecran-numero">
            <label>
              Votre numéro
              <input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" maxLength={16}
                style={{ fontWeight: 600, fontSize: '18px', letterSpacing: '1px' }} />
            </label>
            <label>
              Langue
              <select value={langue} onChange={(e) => setLangue(e.target.value)}>
                <option value="">Celle de ma famille</option>
                {Object.entries(LIBELLE_LANGUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>

          {/* Indicateur de profil amélioré */}
          <div className="profil" role="status" style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            background: `${profilIndicateur.couleur}10`, borderLeft: `3px solid ${profilIndicateur.couleur}`,
            borderRadius: '0 8px 8px 0', margin: '8px 12px',
          }}>
            <span style={{ color: profilIndicateur.couleur, fontWeight: 500, fontSize: '14px' }}>{profilIndicateur.texte}</span>
          </div>

          <div className="onglets defilant" role="tablist">
            {onglets.map(([id, nom]) => (
              <button key={id} role="tab" aria-selected={onglet === id} className={onglet === id ? 'actif' : ''}
                      onClick={() => { setOnglet(id); setErreur(''); setInfo('') }}>{nom}</button>
            ))}
          </div>

          <div className="ecran">
            {onglet === 'appel' && (
              <>
                <p className="petit">« Pour un sujet, appuyez sur sa touche. »</p>
                <div className="touches">
                  {SUJETS.map((s, i) => (
                    <button key={s} disabled={attente || !profil || profil.profil === 'INCONNU'} onClick={() => ecouter(s)} className={s === 'DANGER' ? 'danger' : ''}>
                      <b>{i + 1}</b> {LIBELLE_SUJET[s]}
                    </button>
                  ))}
                </div>
                <div className="urgence-bloc">
                  <p className="petit"><b>Mode urgence</b> — prévient l'agent de votre zone, même sans crédit ni data. En cas de danger grave, allez au centre de santé sans attendre.</p>
                  <div className="formulaire-ligne">
                    <label>Que se passe-t-il ?
                      <select value={urgenceMotif} onChange={(e) => setUrgenceMotif(e.target.value)}>
                        <option>Convulsion ou fièvre forte</option>
                        <option>Blessure ou saignement</option>
                        <option>L'enfant ne respire pas bien</option>
                        <option>Autre urgence</option>
                      </select>
                    </label>
                    <button className="bouton urgence-bouton" disabled={attente || urgenceEnvoyee} onClick={urgence}>
                      {urgenceEnvoyee ? 'Alerte envoyée ✓' : 'Envoyer l\'alerte'}
                    </button>
                  </div>
                </div>
                {message && (
                  <div className="message-vocal" aria-live="polite" style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    borderRadius: '12px', padding: '16px', marginTop: '12px',
                    borderLeft: '4px solid #1cabe2'
                  }}>
                    <h3>{message.titre}</h3>
                    <p>{message.texte}</p>
                    {message.avertissement && <p className="avertissement">{message.avertissement}</p>}
                    {message.aValider && <p className="petit">Contenu à valider par un professionnel de santé avant tout usage réel.</p>}
                    <button className="lien" onClick={() => lire(message.texte)}>Réécouter</button>
                  </div>
                )}
              </>
            )}

            {onglet === 'sms' && (
              <>
                {sms.length === 0 && !erreur && <p className="petit">Aucun message pour ce numéro.</p>}
                <ul className="sms">
                  {sms.map((s) => (
                    <li key={`${s.type}-${s.id}`}>
                      <p className="petit"><b>{LIBELLE_MESSAGE[s.type] ?? 'Message'}</b></p>
                      <p>{s.message}</p>
                      <p className="petit">
                        {formaterDate(s.envoyeLe)}
                        {s.type === 'RAPPEL' && (s.statut === 'ACQUITTE' ? ' · Confirmé' : s.statut === 'SANS_REPONSE' ? ' · Sans réponse : un agent passera' : ' · En attente de réponse')}
                      </p>
                      {s.type === 'RAPPEL' && s.statut !== 'ACQUITTE' && !proche && (
                        <button className="bouton petit-bouton" disabled={attente} onClick={() => repondreOk(s.id)}>Répondre OK</button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {onglet === 'jeu' && (
              <>
                {jeux.length === 0 && !erreur && <p className="petit">Pas d'enfant de moins de 5 ans dans cette famille.</p>}
                {jeux.map((j) => (
                  <div className="jeu" key={j.codeEnfant}>
                    <p className="petit">Enfant {j.codeEnfant} · {j.ageMois} mois</p>
                    {j.jeuDuJour ? (
                      <>
                        <h3>{j.jeuDuJour.titre}</h3>
                        <p>{j.jeuDuJour.consigne}</p>
                        <p className="petit">Matériel : {j.jeuDuJour.materiel}</p>
                        <button className="lien" onClick={() => lire(`${j.jeuDuJour.titre}. ${j.jeuDuJour.consigne}`)}>Écouter</button>{' '}
                        {j.faitAujourdhui
                          ? <span className="succes">Fait aujourd'hui</span>
                          : <button className="bouton petit-bouton" disabled={attente} onClick={() => jeuFait(j.codeEnfant)}>On l'a fait</button>}
                      </>
                    ) : <p className="petit">Pas de jeu pour cet âge.</p>}
                  </div>
                ))}
              </>
            )}

            {onglet === 'structures' && (
              <>
                <p className="petit">Structures de votre zone. La réponse arrive par SMS, sans que votre numéro soit communiqué.</p>
                <ul className="sms">
                  {structures.map((s) => (
                    <li key={s.code}>
                      <p><b>{s.nom}</b> <span className="petit">({LIBELLE_TYPE_STRUCTURE[s.type]})</span></p>
                      <p className="petit">{s.horaires} · {s.telephone}</p>
                      <p className="petit">{s.services}{s.besoinsSpecifiques ? ' · accueille les enfants à besoins spécifiques' : ''}</p>
                      <div className="actions">
                        <button className="bouton petit-bouton" disabled={attente} onClick={() => demander(s.code, 'RAPPEL')}>Me rappeler</button>
                        <button className="bouton secondaire petit-bouton" disabled={attente} onClick={() => demander(s.code, 'ORIENTATION')}>M'orienter</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {onglet === 'ussd' && <Ussd numero={telEff} />}

            {onglet === 'manque' && (
              <>
                <p>Un appel manqué ne coûte rien : Fil d'Or vous rappelle.</p>
                <button className="bouton" disabled={attente} onClick={appelManque}>Faire un appel manqué</button>
              </>
            )}

            {info && <p className="succes" role="status">{info}</p>}
            {erreur && <p className="erreur" role="alert">{erreur}</p>}
          </div>
        </div>
        <div className="tel-bas" aria-hidden="true">{modele === 'smart' ? <><i /><i className="rond" /><i /></> : <div className="tel-touches">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((t) => <i key={t}>{t}</i>)}</div>}</div>
        </div>
        </div>

        <aside className="carte">
          <h2>Ce que fait cette porte</h2>
          <ul>
            <li>Rappelle chaque rendez-vous par SMS. Un rappel sans réponse fait monter la famille dans la liste de l'agent.</li>
            <li>Propose un jeu par jour, adapté à l'âge, avec des objets de la maison.</li>
            <li>Un proche (père, grand-parent, relais) reçoit des rappels généraux, jamais de détail : essayez 91000046.</li>
            <li>Aucun appel n'est enregistré. Les messages informent et orientent, sans diagnostic.</li>
            <li>Éwé, kabyè, tem : voix à enregistrer avec des locuteurs natifs. En attendant, le message est lu en français et le dit.</li>
          </ul>
          <div style={{
            marginTop: '16px', padding: '12px', background: 'linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%)',
            borderRadius: '8px', border: '1px solid #ffc107'
          }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>
              <b>Astuce :</b> Cliquez sur les numéros en haut du téléphone pour changer de profil rapidement.
              Les boutons vocaux fonctionnent avec le haut-parleur de votre appareil.
            </p>
          </div>
        </aside>
      </div>
    </main>
    </>
  )
}
