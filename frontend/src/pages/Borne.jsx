import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import Borne3D, { Carte3D } from '../components/Borne3D.jsx'
import BorneEssai from '../components/BorneEssai.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { MOTIFS_CONSULTATION, PUBLICS, QUESTIONS_CONSULTATION, VILLAGES, consulter, lireMesures } from '../lib/parcours.js'
import { LANGUES_LOCALES, cleMessage, effacerVoix, ecrireVoix, enregistrer, jouer, lireVoix, toutesLesVoix } from '../lib/voix.js'
import { prevenirCentre } from '../lib/reseauClient.js'
import { lireCartePerso } from '../lib/cartePerso.js'
import { PRODUITS, chargerCartes, ecrireBorne, etatVide, formater, genererLot, lireBorne, rechargerCarte, resumeJournal, resumeSondage, stockBas, utiliserCode } from '../lib/borne.js'
import { LIBELLES_PROBLEME } from '../lib/dialogueBorne.js'

const PARTIES = [
  ['Panneau solaire et batterie', 'La borne ne dépend ni du réseau électrique ni du réseau téléphonique.'],
  ['Écran à pictogrammes et voix', 'Choix de la langue (français, éwé, kabiyè, mina), questions illustrées, réponses parlées pour celles qui lisent peu.'],
  ['Poste de mesures', 'Thermomètre sans contact, tensiomètre et oxymètre homologués : la personne se mesure seule, la borne lit le résultat et dit où aller.'],
  ['Clavier pour le numéro de la carte', 'Seule la jeune fille connaît son numéro. La borne ne lui demande ni nom ni âge.'],
  ['Bac de retrait', 'Elle remet les produits autorisés pour sa carte : serviettes hygiéniques, préservatifs, bon de consultation anonyme.'],
  ['Mémoire locale', 'La borne garde l’empreinte des cartes et le stock. Elle ne garde jamais le numéro lui-même, ni aucune identité.'],
  ['Trappe d’entretien', 'L’agent de santé recharge le stock et récupère un journal de totaux par jour, sans aucune donnée personnelle.'],
]

const QUESTIONS = [
  ['Comprendre mon cycle', 'Le premier jour de tes règles est le jour 1 de ton cycle. Un cycle dure souvent entre 21 et 35 jours, et c’est souvent irrégulier à ton âge. Une grossesse est possible même si tes règles sont irrégulières. Si tu as du retard, va au centre de santé pour un test.'],
  ['Me protéger d’une grossesse', 'Il existe plusieurs méthodes. Une agente de santé t’explique chacune, sans jugement, et t’aide à choisir. Le préservatif protège aussi des infections. Après un rapport sans protection, va vite au centre de santé ou à la pharmacie : plus tôt tu y vas, mieux c’est.'],
  ['Je crois que je suis enceinte', 'Va au centre de santé pour un test, avec une personne de confiance. Plus tôt tu y vas, mieux tu es protégée, toi et le bébé. Tu as le droit de continuer l’école. Le centre social peut t’aider.'],
  ['On me force ou j’ai peur', 'Ce n’est jamais ta faute. Parle à une personne de confiance : une agente de santé, une enseignante, une tante. Demande au centre de santé ou au service social le plus proche. Si tu es en danger maintenant, va tout de suite dans un endroit sûr, avec des gens.'],
]
const QUESTIONS_MAMAN = [
  ['Allaiter mon bébé', 'Donne seulement le lait maternel jusqu’à 6 mois : ni eau, ni bouillie. Mets le bébé au sein souvent, jour et nuit. Si le bébé ne tète plus, il faut aller au centre de santé tout de suite.'],
  ['Mon bébé est malade', 'Va tout de suite au centre de santé si ton bébé ne boit plus, vomit tout, a des convulsions, est très endormi ou respire vite. Pour une fièvre ou une diarrhée, va au centre aujourd’hui et continue de le faire boire.'],
  ['Vaccins et consultations', 'Chaque vaccin protège contre une maladie grave. Garde le carnet de ton enfant, et demande à l’agente de santé la date du prochain rendez-vous.'],
  ['Bien manger pendant la grossesse', 'Mange varié : céréales, légumes, haricots, œufs, poisson, fruits. Un nutritionniste ou une boutique partenaire peut t’aider : voir « Réseau nutrition » sur le site.'],
  ['Où accoucher en sécurité', 'Accouche dans un centre de santé avec une sage-femme. Prépare le lieu, le transport et une personne de confiance avant la date. Saignement, forte fièvre, convulsions : pars tout de suite.'],
]
const LANGUES = ['Français', 'Éwé', 'Kabiyè', 'Mina']
const QUOTA_DEFAUT = { serviettes: 3, preservatifs: 3, bon: 1, antalgique: 0 }

function parler(texte) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texte); u.lang = 'fr-FR'; u.rate = 0.9
    window.speechSynthesis.speak(u)
  } catch { /* pas de synthèse vocale sur cet appareil */ }
}

function Essai({ etat, setEtat }) {
  const [profil, setProfil] = useState('ado')
  const [village, setVillage] = useState('agbele')
  const [langue, setLangue] = useState('Éwé')
  const questions = profil === 'ado' ? QUESTIONS : QUESTIONS_MAMAN
  const [voix, setVoix] = useState({})
  useEffect(() => { toutesLesVoix().then((l) => setVoix(Object.fromEntries(l.map((x) => [x.cle, x])))) }, [])
  const locale = langue !== 'Français'
  const [ouvert, setOuvert] = useState(null)
  const [saisie, setSaisie] = useState('')
  const [demande, setDemande] = useState({ serviettes: 1, preservatifs: 0, bon: 0, antalgique: 0 })
  const [res, setRes] = useState(null)
  const retirer = (e) => {
    e.preventDefault()
    const r = utiliserCode(etat, saisie, demande)
    setEtat(r.etat); setRes(r)
    if (r.ok) setSaisie('')
  }
  const ticket = useMemo(() => (res?.ok && res.remis.bon ? String(Math.floor(100000 + Math.random() * 900000)) : null), [res])
  const MOTIFS = {
    format: 'Le numéro doit avoir 8 chiffres. Vérifie ce que tu as tapé.',
    inconnu: `Ce numéro n’est pas reconnu. Il te reste ${res?.essaisRestants ?? 0} essai(s) avant un blocage de 15 minutes.`,
    bloque: 'Trop d’essais. Réessaie dans 15 minutes.',
    rien: 'Cette carte n’a plus de quoi retirer ce que tu demandes.',
    'carte-vide': 'Cette carte est vide. Demande une nouvelle carte à l’agente de santé.',
  }
  return (
    <section className="borne-ecran" aria-label="Écran de la borne">
      <h2>Bonjour. Qui es-tu ?</h2>
      <div className="soin-choix" role="group" aria-label="Profil">
        <button type="button" className={profil === 'ado' ? 'actif' : ''} aria-pressed={profil === 'ado'} onClick={() => { setProfil('ado'); setOuvert(null) }}>Une jeune fille</button>
        <button type="button" className={profil === 'maman' ? 'actif' : ''} aria-pressed={profil === 'maman'} onClick={() => { setProfil('maman'); setOuvert(null) }}>Une maman</button>
      </div>
      <label>Mon village<select value={village} onChange={(e) => { setVillage(e.target.value); setLangue(VILLAGES.find((v) => v.id === e.target.value)?.langue ?? 'Français') }}>{VILLAGES.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}</select></label>
      <p className="petit" style={{ color: '#b9e8ff' }}>La borne propose d’abord la langue la plus parlée dans le village.</p>
      <h3>Ma langue</h3>
      <div className="soin-choix" role="group" aria-label="Langue">
        {LANGUES.map((l) => <button key={l} type="button" className={langue === l ? 'actif' : ''} aria-pressed={langue === l} onClick={() => setLangue(l)}>{l}</button>)}
      </div>
      <h3>Une question ?</h3>
      {questions.map(([q, r], i) => (
        <div key={q}>
          <button type="button" className="q" aria-expanded={ouvert === i} onClick={() => setOuvert(ouvert === i ? null : i)}>{q}</button>
          {ouvert === i && (() => {
            const v = locale ? voix[cleMessage(langue, profil, i)] : null
            return (
              <div className="carte-q">
                {v?.texte && <p className="rep"><b>{langue} :</b> {v.texte}</p>}
                {(!v?.texte) && <p className="rep">{r}</p>}
                {locale && !v?.texte && <p className="petit" style={{ color: '#ffe29a' }}>Pas encore de traduction en {langue} : réponse en français.</p>}
                {v?.blob ? <button type="button" className="bouton secondaire petit-bouton" onClick={() => jouer(v.blob)}>Écouter en {langue}</button> : <button type="button" className="bouton secondaire petit-bouton" onClick={() => parler(r)}>Écouter en français</button>}
              </div>
            )
          })()}
        </div>
      ))}
      <h3>Retirer avec ma carte</h3>
      <form onSubmit={retirer} style={{ display: 'grid', gap: '.8rem' }}>
        <label>Numéro de ma carte
          <input inputMode="numeric" autoComplete="off" maxLength={9} placeholder="0000 0000" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Numéro de la carte" />
        </label>
        <div className="borne-retrait">
          {Object.entries(PRODUITS).map(([k, nom]) => (
            <div key={k}><b>{nom}</b>
              <input type="number" min="0" max="10" value={demande[k]} onChange={(e) => setDemande({ ...demande, [k]: Number(e.target.value) })} aria-label={`Combien : ${nom}`} />
            </div>
          ))}
        </div>
        <button className="bouton" type="submit">Valider</button>
      </form>
      {res && !res.ok && <ResultatSoins niveau="signaler" titre="Je ne peux pas valider" texte={MOTIFS[res.raison] ?? 'Réessaie.'} />}
      {res?.ok && (
        <div className="borne-bac" role="status">
          <b>Prends dans le bac :</b>
          <ul>{Object.entries(res.remis).map(([k, n]) => <li key={k}>{n} × {PRODUITS[k]}</li>)}</ul>
          {ticket && <p>Ton numéro de consultation : <b>{ticket}</b>. Présente-le au centre de santé : on te recevra sans te demander ton nom. <i>(Règle à définir avec les centres.)</i></p>}
          <p className="petit" style={{ color: '#ffe29a' }}>Il reste sur ta carte : {Object.entries(res.reste).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${PRODUITS[k].toLowerCase()}`).join(', ') || 'rien'}.</p>
        </div>
      )}
    </section>
  )
}


const CAS_DE = { ado: 'enfant', grossesse: 'grossesse', maman: 'accouchement', bebe: 'nouveauNe', enfant: 'enfant' }
function Mesures() {
  const [pour, setPour] = useState('ado')
  const [village, setVillage] = useState('agbele')
  const [v, setV] = useState({ temp: '', sys: '', dia: '', spo2: '', muac: '' })
  const [res, setRes] = useState(null)
  const [alerte, setAlerte] = useState(null)
  const enceinte = pour === 'grossesse' || pour === 'maman'
  const champ = (k, lib, extra = {}) => <label>{lib}<input type="number" inputMode="decimal" step="any" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...extra} /></label>
  const analyser = (e) => { e.preventDefault(); setRes(lireMesures({ pour, village, ...v })); setAlerte(null) }
  const prevenir = async () => { setAlerte(await prevenirCentre({ centreId: res.centre.id, cas: CAS_DE[pour], niveau: res.niveau === 'urgent' ? 'urgent' : 'surveiller', signes: res.trouves.map((t) => t.texte.split(':')[0].split('(')[0].trim()), depuis: village })) }
  return (
    <section className="borne-ecran" aria-label="Poste de mesures">
      <h2>Me mesurer</h2>
      <p>On se mesure seule, avec les appareils de la borne. La borne lit le résultat, dit si c’est grave et indique où aller. Rien n’est gardé avec ton nom.</p>
      <form onSubmit={analyser} style={{ display: 'grid', gap: '.8rem' }}>
        <label>Pour qui ?<select value={pour} onChange={(e) => { setPour(e.target.value); setRes(null) }}>{Object.entries(PUBLICS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label>Mon village<select value={village} onChange={(e) => setVillage(e.target.value)}>{VILLAGES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></label>
        <div className="borne-retrait">
          <div>{champ('temp', 'Température (°C)', { placeholder: '36,8' })}</div>
          <div>{champ('spo2', 'Oxygène du sang (%)', { placeholder: '98' })}</div>
          {enceinte && <div>{champ('sys', 'Tension haute', { placeholder: '120' })}{champ('dia', 'Tension basse', { placeholder: '80' })}</div>}
          {pour === 'enfant' && <div>{champ('muac', 'Tour de bras (mm)', { placeholder: '130' })}</div>}
        </div>
        <button className="bouton" type="submit">Lire le résultat</button>
      </form>
      {res && (
        <>
          <ResultatSoins niveau={res.niveau} titre={res.niveau === 'bon' ? 'Tout est dans les repères' : res.niveau === 'urgent' ? 'Danger : va tout de suite' : 'À voir aujourd’hui'} texte={res.niveau === 'bon' ? 'Continue le suivi habituel. Si tu te sens mal malgré tout, va au centre.' : 'Voici pourquoi :'}>
            {res.trouves.length > 0 && <ul>{res.trouves.map((t) => <li key={t.texte}>{t.texte}</li>)}</ul>}
            {res.centre && <p><b>Où aller :</b> {res.centre.nom}, à environ {res.centre.km} km ({res.centre.services}).</p>}
          </ResultatSoins>
          {res.centre && (!alerte ? <button type="button" className="bouton" onClick={prevenir}>Prévenir le centre</button> : alerte.ok ? <p className="borne-bac">Le centre est prévenu : un cas arrive de {VILLAGES.find((x) => x.id === village)?.nom}. Il sera reçu en priorité.</p> : alerte.gardee ? <p className="borne-bac">Pas de réseau : l’alerte est gardée dans la borne et partira dès que la connexion revient. Pars quand même au centre.</p> : <p className="borne-bac">L’alerte n’a pas pu partir. Pars au centre sans attendre.</p>)}
        </>
      )}
      <p className="petit" style={{ color: '#b9e8ff' }}>Seuils généraux (OMS, PCIME) à faire valider par un professionnel. Les appareils de mesure doivent être homologués. La borne n’établit aucun diagnostic.</p>
    </section>
  )
}

function Consultation({ etat, setEtat }) {
  const [motif, setMotif] = useState('regles')
  const [village, setVillage] = useState('agbele')
  const [rep, setRep] = useState([])
  const [res, setRes] = useState(null)
  const [alerte, setAlerte] = useState(null)
  const [carte, setCarte] = useState('')
  const [remise, setRemise] = useState(null)
  const [ticket, setTicket] = useState(null)
  const basculer = (id) => setRep(rep.includes(id) ? rep.filter((x) => x !== id) : [...rep, id])
  const lire = (e) => { e.preventDefault(); setRes(consulter({ motif, reponses: rep, village })); setAlerte(null); setRemise(null); setTicket(null) }
  const prevenir = async () => setAlerte(await prevenirCentre({ centreId: res.centre.id, cas: 'enfant', niveau: 'urgent', signes: [MOTIFS_CONSULTATION[motif]], depuis: village }))
  const retirer = (e) => {
    e.preventDefault()
    const r = utiliserCode(etat, carte, { antalgique: 1 })
    setEtat(r.etat); setRemise(r); if (r.ok) setCarte('')
  }
  const bon = () => setTicket(String(Math.floor(100000 + Math.random() * 900000)))
  return (
    <section className="borne-ecran" aria-label="Consultation anonyme">
      <h2>Parler de mon problème</h2>
      <p>Réponds aux questions. La borne ne te demande ni ton nom ni ton âge. Elle te dit quoi faire et, si c’est prévu, te remet un produit simple.</p>
      <div className="soin-choix" role="group" aria-label="Motif">
        {Object.entries(MOTIFS_CONSULTATION).map(([k, n]) => <button key={k} type="button" className={motif === k ? 'actif' : ''} aria-pressed={motif === k} onClick={() => { setMotif(k); setRep([]); setRes(null) }}>{n}</button>)}
      </div>
      <form onSubmit={lire} style={{ display: 'grid', gap: '.6rem' }}>
        <label>Mon village<select value={village} onChange={(e) => setVillage(e.target.value)}>{VILLAGES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></label>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><b>Coche ce qui est vrai pour toi</b></legend>
          {QUESTIONS_CONSULTATION[motif].map(([id, lib]) => <label key={id} className="soin-case"><input type="checkbox" checked={rep.includes(id)} onChange={() => basculer(id)} /><span>{lib}</span></label>)}
        </fieldset>
        <button className="bouton" type="submit">Voir ce que je dois faire</button>
      </form>
      {res && (
        <>
          <ResultatSoins niveau={res.niveau} titre={res.titre} texte={res.texte}>
            {res.conseils.length > 0 && res.niveau !== 'urgent' && <ul>{res.conseils.map((c) => <li key={c}>{c}</li>)}</ul>}
            {res.centre && <p><b>Où aller :</b> {res.centre.nom}, à environ {res.centre.km} km ({res.centre.services}).</p>}
          </ResultatSoins>
          {res.niveau === 'urgent' && res.centre && (!alerte ? <button type="button" className="bouton" onClick={prevenir}>Prévenir l’hôpital</button> : alerte.ok ? <p className="borne-bac">L’hôpital est prévenu : tu seras reçue en priorité. Pars maintenant.</p> : <p className="borne-bac">Pas de réseau : l’alerte est gardée et partira dès que possible. Pars maintenant, avec quelqu’un.</p>)}
          {res.bon && (ticket ? <p className="borne-bac">Ton numéro de consultation : <b>{ticket}</b>. Présente-le au centre : on te recevra sans te demander ton nom. <i>(Règle à définir avec les centres.)</i></p> : <button type="button" className="bouton" onClick={bon}>Recevoir mon bon anonyme</button>)}
          {res.produit && (
            <form onSubmit={retirer} style={{ display: 'grid', gap: '.6rem' }}>
              <label>Pour recevoir l’antalgique, tape le numéro de ta carte<input inputMode="numeric" autoComplete="off" maxLength={9} placeholder="0000 0000" value={carte} onChange={(e) => setCarte(e.target.value)} /></label>
              <button className="bouton secondaire" type="submit">Recevoir</button>
              {remise?.ok && <div className="borne-bac" role="status"><b>Prends dans le bac :</b> 1 × {PRODUITS.antalgique}. Suis la notice du produit remis. Si la douleur ne passe pas, va voir une agente de santé.</div>}
              {remise && !remise.ok && <p role="alert" className="borne-bac">{remise.raison === 'rien' || remise.raison === 'carte-vide' ? 'Ta carte ne prévoit pas ce produit : demande à l’agente de santé.' : remise.raison === 'bloque' ? 'Trop d’essais. Réessaie dans 15 minutes.' : 'Numéro non reconnu ou incorrect.'}</p>}
            </form>
          )}
        </>
      )}
      <p className="petit" style={{ color: '#b9e8ff' }}>Les produits remis gratuitement, leurs conditions et le protocole doivent être validés par le ministère de la Santé. Si le programme ne les valide pas, la borne ne remet que des conseils et des bons de consultation.</p>
    </section>
  )
}

function Studio() {
  const [langue, setLangue] = useState(LANGUES_LOCALES[0])
  const [profil, setProfil] = useState('ado')
  const [voix, setVoix] = useState({})
  const [en, setEn] = useState(null)
  const [msg, setMsg] = useState('')
  const rec = useRef(null)
  const questions = profil === 'ado' ? QUESTIONS : QUESTIONS_MAMAN
  const charger = () => toutesLesVoix().then((l) => setVoix(Object.fromEntries(l.map((x) => [x.cle, x]))))
  useEffect(() => { charger() }, [])
  const debut = async (cle) => { setMsg(''); try { rec.current = await enregistrer(); setEn(cle) } catch { setMsg('Micro indisponible ou refusé. Autorise le micro dans le navigateur.') } }
  const fin = async (cle) => { const blob = await rec.current.arreter(); setEn(null); await ecrireVoix(cle, { blob }); charger() }
  const texte = async (cle, t) => { await ecrireVoix(cle, { texte: t }); charger() }
  const nb = Object.keys(voix).filter((k) => k.startsWith(`${langue}|`) && voix[k].blob).length
  return (
    <section className="carte">
      <h2>4. Voix en langue locale</h2>
      <p>Une locutrice enregistre chaque message, et un traducteur écrit le texte. Fil d’Or ne traduit rien lui-même : une mauvaise traduction de santé peut faire du mal. Tout est gardé sur cet appareil.</p>
      <div className="ado-champs">
        <label>Langue<select value={langue} onChange={(e) => setLangue(e.target.value)}>{LANGUES_LOCALES.map((l) => <option key={l}>{l}</option>)}</select></label>
        <label>Pour<select value={profil} onChange={(e) => setProfil(e.target.value)}><option value="ado">Jeunes filles</option><option value="maman">Mamans</option></select></label>
      </div>
      <p><b>{nb}</b> message(s) enregistré(s) en {langue}.</p>
      {msg && <p role="alert" className="erreur">{msg}</p>}
      <ul className="liste-coches">
        {questions.map(([q, r], i) => {
          const cle = cleMessage(langue, profil, i)
          const v = voix[cle]
          return (
            <li key={cle}>
              <b>{q}</b><br /><small>Français : {r}</small>
              <label style={{ display: 'grid', gap: '.2rem', marginTop: '.4rem' }}>Texte en {langue}
                <textarea rows="2" defaultValue={v?.texte ?? ''} key={`${cle}-${v?.texte ?? ''}`} onBlur={(e) => { if (e.target.value !== (v?.texte ?? '')) texte(cle, e.target.value) }} />
              </label>
              <span style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.4rem' }}>
                {en === cle ? <button type="button" className="bouton" onClick={() => fin(cle)}>Arrêter l’enregistrement</button> : <button type="button" className="bouton secondaire" disabled={en !== null} onClick={() => debut(cle)}>{v?.blob ? 'Réenregistrer' : 'Enregistrer la voix'}</button>}
                {v?.blob && <button type="button" className="bouton secondaire" onClick={() => jouer(v.blob)}>Écouter</button>}
                {v?.blob && <button type="button" className="bouton secondaire" onClick={() => effacerVoix(cle).then(charger)}>Supprimer</button>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const NOMS_REP = { oui: 'Oui', non: 'Non', peu: 'Un peu', difficile: 'Oui, mais difficile ou cher' }
function Sondage({ etat }) {
  const r = resumeSondage(etat)
  const Liste = ({ titre, o, noms }) => <div><b>{titre}</b><ul className="liste-coches">{Object.entries(o).map(([k, n]) => <li key={k}>{noms[k] ?? k} : {n}</li>)}</ul></div>
  return (
    <section className="carte">
      <h2>4. Ce que disent les utilisatrices</h2>
      {r.total === 0 ? <p>Aucune réponse pour l’instant. Les questions de la borne se posent en fin de parcours.</p> : (
        <div className="borne-stock">
          <Liste titre={`Leur plus gros problème (${r.total} réponses)`} o={r.probleme} noms={LIBELLES_PROBLEME} />
          <Liste titre="Trouvaient-elles ces produits avant ?" o={r.ailleurs} noms={NOMS_REP} />
          <Liste titre="La borne les a-t-elle aidées ?" o={r.utile} noms={NOMS_REP} />
          <Liste titre="Langue choisie" o={r.langues} noms={{}} />
        </div>
      )}
      <p className="petit">Les réponses ne sont liées ni à une carte ni à une personne. L’agent les relève au passage pour décider où porter de l’aide.</p>
    </section>
  )
}

function Recharge({ etat, setEtat }) {
  const [code, setCode] = useState('')
  const [ajout, setAjout] = useState({ serviettes: 4, preservatifs: 0, bon: 0, antalgique: 0 })
  const [msg, setMsg] = useState('')
  const faire = (e) => {
    e.preventDefault()
    const r = rechargerCarte(etat, code, ajout)
    if (r.ok) { setEtat(r.etat); setMsg('Carte rechargée : la même carte marche, avec les nouveaux droits.') }
    else setMsg(r.raison === 'format' ? 'Le numéro doit avoir 8 chiffres.' : 'Cette carte n’est pas dans cette borne.')
  }
  return (
    <section className="carte">
      <h2>5. Recharger une carte déjà utilisée</h2>
      <p>Une jeune fille revient avec sa carte vide : l’agent ajoute des droits au même numéro. La borne ne la rejette pas, et ne sait toujours pas qui elle est.</p>
      <form onSubmit={faire} className="ado-champs">
        <label>Numéro de la carte<input inputMode="numeric" maxLength={9} value={code} onChange={(e) => setCode(e.target.value)} placeholder="0000 0000" /></label>
        {Object.entries(PRODUITS).map(([k, nom]) => <label key={k}>{nom} à ajouter<input type="number" min="0" max="12" value={ajout[k]} onChange={(e) => setAjout({ ...ajout, [k]: Number(e.target.value) })} /></label>)}
        <p><button type="submit" className="bouton">Recharger</button></p>
      </form>
      {msg && <p role="status"><b>{msg}</b></p>}
    </section>
  )
}

function CoteAgent({ etat, setEtat, lot, setLot }) {
  const [nombre, setNombre] = useState(20)
  const [quota, setQuota] = useState(QUOTA_DEFAUT)
  const [charge, setCharge] = useState(false)
  const bas = stockBas(etat)
  const jours = Object.entries(resumeJournal(etat))
  const preparer = () => { setLot(genererLot({ nombre: Math.max(1, Math.min(200, Number(nombre) || 1)), quota })); setCharge(false) }
  const charger = () => { setEtat(chargerCartes(etat, lot)); setCharge(true) }
  return (
    <>
      <section className="carte">
        <h2>1. Préparer des cartes</h2>
        <p>Chaque carte a un numéro différent et un droit de retrait par produit. Les cartes ne sont liées à aucune personne : l’agent les remet discrètement, sans rien noter.</p>
        <div className="ado-champs">
          <label>Nombre de cartes<input type="number" min="1" max="200" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          {Object.entries(PRODUITS).map(([k, nom]) => <label key={k}>{nom} par carte<input type="number" min="0" max="12" value={quota[k]} onChange={(e) => setQuota({ ...quota, [k]: Number(e.target.value) })} /></label>)}
        </div>
        <p><button type="button" className="bouton" onClick={preparer}>Préparer le lot</button></p>
        {lot.length > 0 && (
          <>
            <div className="borne-lot">{lot.map((c) => <div key={c.serie}><small>{c.serie}</small><br /><b>{formater(c.code)}</b></div>)}</div>
            <p className="petit">Ces numéros s’impriment sous la zone à gratter. Pour la démonstration, ils s’affichent ici. Dans la réalité, la liste n’est jamais conservée après impression.</p>
            <p><button type="button" className="bouton" onClick={charger} disabled={charge}>{charge ? 'Cartes chargées dans la borne' : 'Charger dans la borne'}</button></p>
          </>
        )}
      </section>
      <section className="carte">
        <h2>2. Stock de la borne</h2>
        <div className="borne-stock">
          {Object.entries(PRODUITS).map(([k, nom]) => <div key={k} className={bas.includes(k) ? 'bas' : ''}><span>{nom}</span><b>{etat.stock[k]}</b>{bas.includes(k) && <small>Stock bas : à recharger</small>}</div>)}
        </div>
        <p><button type="button" className="bouton secondaire" onClick={() => setEtat({ ...etat, stock: { serviettes: 60, preservatifs: 60, bon: 100, antalgique: 40 } })}>Recharger le stock (démo)</button></p>
      </section>
      <section className="carte">
        <h2>3. Journal anonyme récupéré au passage</h2>
        {jours.length === 0 ? <p>Aucun retrait pour l’instant.</p> : (
          <ul className="liste-coches">{jours.map(([j, r]) => <li key={j}><b>{j}</b> : {Object.entries(r).map(([k, n]) => `${n} ${PRODUITS[k].toLowerCase()}`).join(', ')}</li>)}</ul>
        )}
        <p className="petit">Seuls des totaux par jour sont conservés. Ni numéro de carte, ni heure précise, ni identité : on sait combien de produits sortent, jamais qui les a pris.</p>
        <p><button type="button" className="bouton secondaire" onClick={() => { setEtat(etatVide()); setLot([]) }}>Tout remettre à zéro</button></p>
      </section>
      <Sondage etat={etat} />
      <Recharge etat={etat} setEtat={setEtat} />
      <Studio />
    </>
  )
}

export default function Borne() {
  const [onglet, setOnglet] = useState('essai')
  const [etat, setEtatBrut] = useState(lireBorne)
  const [lot, setLot] = useState([])
  const setEtat = (e) => { setEtatBrut(e); ecrireBorne(e) }
  const demo = lot[0]
  return (
    <>
      <Bandeau surtitre="Concept à fabriquer" titre="La borne Fil d’Or">Un point de village où une adolescente peut poser ses questions, entendre les réponses et retirer des produits avec une carte à gratter. Personne ne connaît son nom : seule elle connaît le numéro.</Bandeau>
      <main className="page ado">
        <div className="borne-onglets" role="group" aria-label="Sections">
          {[['3d', 'La borne en 3D'], ['essai', 'Essayer la borne'], ['mesures', 'Me mesurer'], ['consult', 'Parler de mon problème'], ['agent', 'Côté agent de santé']].map(([id, nom]) => <button key={id} type="button" className={onglet === id ? 'actif' : ''} aria-pressed={onglet === id} onClick={() => setOnglet(id)}>{nom}</button>)}
        </div>
        {onglet === '3d' && (
          <>
            <div className="borne-grille">
              <section className="carte"><Borne3D /></section>
              <section className="carte">
                <h2>Ce qu’il y a dans la borne</h2>
                <ol className="borne-parties">{PARTIES.map(([t, x], i) => <li key={t}><span>{i + 1}</span><div><b>{t}</b><p>{x}</p></div></li>)}</ol>
              </section>
            </div>
            <section className="carte">
              <h2>La carte à gratter</h2>
              <div className="borne-grille">
                <Carte3D code={demo?.code} />
                <div>
                  <p>La carte ressemble à une carte de recharge : rien n’indique la santé. L’agent la remet sans noter de nom. Le numéro est caché sous une zone à gratter.</p>
                  <ul className="liste-coches">
                    <li>Chaque carte a un numéro différent, avec un chiffre de contrôle pour attraper les fautes de frappe.</li>
                    <li>Chaque carte a un droit de retrait limité par produit, pour que le stock serve à toutes.</li>
                    <li>Trop d’essais faux bloquent la borne pendant 15 minutes.</li>
                    <li>La borne n’enregistre jamais le numéro, seulement son empreinte.</li>
                  </ul>
                  {!demo && <p className="petit">Prépare un lot dans « Côté agent de santé » pour voir un vrai numéro de démonstration.</p>}
                </div>
              </div>
            </section>
            <ResultatSoins niveau="signaler" titre="Ce qui reste à valider" texte="Les produits remis, l’âge des bénéficiaires, le lieu d’installation et la règle du bon de consultation doivent être validés avec le ministère de la Santé et les centres de santé. La borne ne remet aucun médicament : les méthodes qui demandent un professionnel restent au centre de santé." />
          </>
        )}
        {onglet === 'essai' && <BorneEssai etat={etat} setEtat={setEtat} cartePerso={lireCartePerso()} />}
        {onglet === 'mesures' && <Mesures />}
        {onglet === 'consult' && <Consultation etat={etat} setEtat={setEtat} />}
        {onglet === 'agent' && <CoteAgent etat={etat} setEtat={setEtat} lot={lot} setLot={setLot} />}
        <p className="petit">Démonstration avec des données fictives. Ce n’est pas un service officiel de l’UNICEF. <Link to="/adolescents">Informations pour les adolescentes</Link>.</p>
      </main>
    </>
  )
}
