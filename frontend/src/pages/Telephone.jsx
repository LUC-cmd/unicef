import { useEffect, useState } from 'react'
import Ussd from '../components/Ussd.jsx'
import { api } from '../lib/api.js'
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
  REPONSE_STRUCTURE: 'Réponse d’une structure',
  RAPPEL_GENERAL: 'Rappel général',
  NAISSANCE: 'Avis de la mairie',
}

const ONGLETS_FAMILLE = [['appel', 'Appeler'], ['ussd', 'USSD'], ['sms', 'Messages'], ['jeu', 'Jeu du jour'], ['structures', 'Structures'], ['manque', 'Appel manqué']]
const ONGLETS_PROCHE = [['sms', 'Messages'], ['appel', 'Appeler']]

export default function Telephone() {
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

  const chiffres = numero.replace(/\D/g, '')
  const proche = profil?.profil === 'PROCHE'
  const onglets = proche ? ONGLETS_PROCHE : ONGLETS_FAMILLE

  // Qui est ce numéro ? Famille, proche, ou inconnu : le téléphone s'adapte.
  useEffect(() => {
    setProfil(null)
    if (chiffres.length < 8) return undefined
    const t = setTimeout(() => {
      api.post('/api/public/profil', { telephone: numero })
        .then(setProfil)
        .catch((e) => setProfil({ profil: !e.statut || e.statut >= 500 ? 'HORS_LIGNE' : 'INCONNU' }))
    }, 350)
    return () => clearTimeout(t)
  }, [numero, chiffres.length])

  useEffect(() => {
    if (proche && !['sms', 'appel'].includes(onglet)) setOnglet('sms')
  }, [proche, onglet])

  async function executer(fn) {
    setErreur(''); setInfo(''); setAttente(true)
    try { await fn() } catch (e) { setErreur(e.message) } finally { setAttente(false) }
  }

  const ecouter = (sujet) => executer(async () => {
    const m = await api.post('/api/public/voix', { telephone: numero, sujet, langue: langue || null })
    setMessage(m); lire(m.texte)
  })
  const chargerSms = () => executer(async () => setSms((await api.post('/api/public/sms', { telephone: numero })).messages ?? []))
  const chargerJeux = () => executer(async () => setJeux(await api.post('/api/public/jeu', { telephone: numero })))
  const chargerStructures = () => executer(async () => setStructures(await api.post('/api/public/structures/proches', { telephone: numero })))

  useEffect(() => {
    if (profil?.profil !== 'FAMILLE' && profil?.profil !== 'PROCHE') return
    if (onglet === 'sms') chargerSms()
    if (onglet === 'jeu' && !proche) chargerJeux()
    if (onglet === 'structures' && !proche) chargerStructures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet, profil])

  const repondreOk = (id) => executer(async () => {
    const r = await api.post(`/api/public/sms/${id}/ok`, { telephone: numero })
    setInfo(r.message); setSms((await api.post('/api/public/sms', { telephone: numero })).messages ?? [])
  })
  const appelManque = () => executer(async () => setInfo((await api.post('/api/public/appel-manque', { telephone: numero })).message))
  const jeuFait = (codeEnfant) => executer(async () => {
    setInfo((await api.post('/api/public/jeu/fait', { telephone: numero, codeEnfant })).message)
    setJeux(await api.post('/api/public/jeu', { telephone: numero }))
  })
  const demander = (codeStructure, motif) => executer(async () =>
    setInfo((await api.post('/api/public/demandes', { telephone: numero, codeStructure, motif })).message))

  return (
    <main className="page">
      <h1>Simulateur de téléphone</h1>
      <p className="petit">
        Cette porte marche avec un téléphone basique, sans application ni data. Ici, un faux téléphone remplace
        l'opérateur. Familles : <b>90000001</b> à <b>90000045</b>. Proches : <b>91000001</b> (père de F-0001),
        <b> 91000002</b> (grand-parent), <b>91000046</b> (relais d'une famille sans téléphone).
      </p>

      <div className="telephone-cadre">
        <div className="telephone" role="group" aria-label="Téléphone simulé">
          <div className="ecran-numero">
            <label>
              Votre numéro
              <input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" maxLength={16} />
            </label>
            <label>
              Langue
              <select value={langue} onChange={(e) => setLangue(e.target.value)}>
                <option value="">Celle de ma famille</option>
                {Object.entries(LIBELLE_LANGUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <p className="profil" role="status">
            {chiffres.length < 8 && 'Tapez un numéro à 8 chiffres.'}
            {profil?.profil === 'FAMILLE' && 'Numéro d’une famille suivie.'}
            {profil?.profil === 'PROCHE' && `Proche (${LIBELLE_ROLE_PROCHE[profil.roleProche] ?? 'proche'}) : rappels généraux seulement.`}
            {profil?.profil === 'INCONNU' && 'Numéro inconnu de Fil d’Or.'}
            {profil?.profil === 'HORS_LIGNE' && 'Le serveur ne répond pas. Relancez l’API pour entendre les messages.'}
          </p>

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
                    <button key={s} disabled={attente} onClick={() => ecouter(s)} className={s === 'DANGER' ? 'danger' : ''}>
                      <b>{i + 1}</b> {LIBELLE_SUJET[s]}
                    </button>
                  ))}
                </div>
                {message && (
                  <div className="message-vocal" aria-live="polite">
                    <h3>🔊 {message.titre}</h3>
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
                        {s.type === 'RAPPEL' && (s.statut === 'ACQUITTE' ? ' · Confirmé ✓' : s.statut === 'SANS_REPONSE' ? ' · Sans réponse : un agent passera' : ' · En attente de réponse')}
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
                        <h3>🎲 {j.jeuDuJour.titre}</h3>
                        <p>{j.jeuDuJour.consigne}</p>
                        <p className="petit">Matériel : {j.jeuDuJour.materiel}</p>
                        <button className="lien" onClick={() => lire(`${j.jeuDuJour.titre}. ${j.jeuDuJour.consigne}`)}>🔊 Écouter</button>{' '}
                        {j.faitAujourdhui
                          ? <span className="succes">Fait aujourd'hui ✓</span>
                          : <button className="bouton petit-bouton" disabled={attente} onClick={() => jeuFait(j.codeEnfant)}>On l'a fait ✓</button>}
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

            {onglet === 'ussd' && <Ussd numero={numero} />}

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

        <aside className="carte">
          <h2>Ce que fait cette porte</h2>
          <ul>
            <li>Rappelle chaque rendez-vous par SMS. Un rappel sans réponse fait monter la famille dans la liste de l'agent.</li>
            <li>Propose un jeu par jour, adapté à l'âge, avec des objets de la maison.</li>
            <li>Un proche (père, grand-parent, relais) reçoit des rappels généraux, jamais de détail : essayez 91000046.</li>
            <li>Aucun appel n'est enregistré. Les messages informent et orientent, sans diagnostic.</li>
            <li>Éwé, kabyè, tem : voix à enregistrer avec des locuteurs natifs. En attendant, le message est lu en français et le dit.</li>
          </ul>
        </aside>
      </div>
    </main>
  )
}
