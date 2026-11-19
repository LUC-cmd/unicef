import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { aujourdhuiIso, formaterDate } from '../lib/format.js'
import Picto from './Picto.jsx'

const ETAPES = [
  ['A_VERIFIER', 'Envoyée', 'Votre agent de santé vérifie les informations.'],
  ['CONFIRME', 'Vérifiée', 'Votre agent a confirmé et transmis le dossier à la mairie.'],
]
const LIBELLE = { A_VERIFIER: 'En vérification par votre agent de santé', CONFIRME: 'Vérifiée et transmise à la mairie', REFUSE: 'À compléter ou corriger' }
const PRECISIONS = [['EXACTE', 'Date exacte'], ['APPROXIMATIVE', 'À peu près'], ['INCONNUE', 'On ne sait pas']]

/** La famille signale la naissance d'un enfant. Rien ne part à la mairie sans la vérification de l'agent. */
export default function DeclarationFamille({ compte, profil }) {
  const acces = { telephone: compte.telephone, codeFamille: compte.codeFamille }
  const auj = aujourdhuiIso()
  const [liste, setListe] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const [enfant, setEnfant] = useState('')
  const [date, setDate] = useState(auj)
  const [precision, setPrecision] = useState('EXACTE')
  const [heure, setHeure] = useState('')
  const [lieu, setLieu] = useState('CENTRE_SANTE')
  const [preuve, setPreuve] = useState('')
  const [noms, setNoms] = useState(false)
  const [mere, setMere] = useState('')
  const [pere, setPere] = useState('')
  const [prenom, setPrenom] = useState('')
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)

  const charger = useCallback(() => { api.post('/api/public/famille/naissances', acces).then((l) => setListe(Array.isArray(l) ? l : [])).catch(() => {}) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compte.telephone, compte.codeFamille])
  useEffect(() => { charger() }, [charger])

  const choix = (profil?.enfants || []).filter((e) => !e.acte && !liste.some((l) => l.codeEnfant === e.codeEnfant && l.statut !== 'REFUSE'))

  async function envoyer(e) {
    e.preventDefault()
    if (!enfant) { setErreur('Choisissez l’enfant concerné.'); return }
    if (!preuve.trim()) { setErreur('Indiquez le numéro du certificat d’accouchement ou le nom du centre de santé : l’agent en a besoin pour vérifier.'); return }
    if (noms && mere.trim().length < 2) { setErreur('Indiquez le nom de la mère, ou décochez la case des noms.'); return }
    setAttente(true); setErreur('')
    try {
      await api.post('/api/public/famille/naissance', {
        ...acces, codeEnfant: enfant, dateNaissance: date, heureNaissance: heure || null, precisionDate: precision, lieu,
        preuve: preuve.trim(), accordNoms: noms, mereNom: noms ? mere : null, pereNom: noms ? pere : null, enfantPrenom: noms ? prenom : null,
      })
      setOuvert(false); setEnfant(''); setPreuve(''); charger()
    } catch (err) { setErreur(err.message) } finally { setAttente(false) }
  }

  return (
    <section className="carte decl-famille" aria-labelledby="t-decl">
      <h2 id="t-decl">Déclarer la naissance de mon enfant</h2>
      <p className="petit">Vous signalez la naissance. <b>Votre agent de santé vérifie</b> les informations avec vous, puis transmet le dossier à la mairie, qui dresse l’acte. Rien ne part à la mairie sans cette vérification.</p>

      {liste.length > 0 && (
        <ul className="decl-suivi">
          {liste.map((l) => (
            <li key={l.id} className={`decl-${l.statut.toLowerCase()}`}>
              <span className="decl-pastille" aria-hidden="true"><Picto nom={l.statut === 'CONFIRME' ? 'valide' : l.statut === 'REFUSE' ? 'alerte' : 'horloge'} /></span>
              <div>
                <b>Enfant {l.codeEnfant} · né(e) le {formaterDate(l.dateNaissance)}</b>
                <span>{LIBELLE[l.statut]}</span>
                {l.statut === 'REFUSE' && l.motif && <span className="decl-motif">Motif : {l.motif}. Voyez votre agent de santé pour corriger.</span>}
                {l.statut === 'A_VERIFIER' && <small>Envoyée le {formaterDate(l.envoyeLe)}. {ETAPES[0][2]}</small>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {(profil?.enfants || []).filter((e) => e.acte).map((e) => (
        <p key={e.codeEnfant} className="decl-acte"><Picto nom="valide" /> <b>Enfant {e.codeEnfant}</b> : {e.acte === 'RETIRE' ? "l'acte de naissance est déjà en votre possession. Il n'y a rien à déclarer." : "l'acte de naissance est établi. Pensez à aller le retirer à la mairie."}</p>
      ))}

      {!ouvert && <button className="bouton" onClick={() => setOuvert(true)} disabled={choix.length === 0}>{choix.length === 0 ? 'Aucun enfant à déclarer' : 'Déclarer une naissance'}</button>}

      {ouvert && (
        <form onSubmit={envoyer} noValidate className="decl-form">
          <label className="champ"><span className="champ-titre">Quel enfant ?</span>
            <select value={enfant} onChange={(e) => setEnfant(e.target.value)}>
              <option value="">— Choisir —</option>
              {choix.map((c) => <option key={c.codeEnfant} value={c.codeEnfant}>{c.codeEnfant}{c.statut === 'GROSSESSE' ? ' (grossesse en cours)' : ''}</option>)}
            </select></label>
          <div className="formulaire-ligne">
            <label className="champ"><span className="champ-titre">Date de naissance</span><input type="date" value={date} max={auj} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="champ"><span className="champ-titre">Heure <em>facultatif</em></span><input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></label>
          </div>
          <label className="champ"><span className="champ-titre">La date est…</span>
            <select value={precision} onChange={(e) => setPrecision(e.target.value)}>{PRECISIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="champ"><span className="champ-titre">Lieu de naissance</span>
            <select value={lieu} onChange={(e) => setLieu(e.target.value)}><option value="CENTRE_SANTE">Centre de santé</option><option value="DOMICILE">À domicile</option></select></label>
          <label className="champ"><span className="champ-titre">Preuve de la naissance <em>obligatoire</em></span>
            <input value={preuve} maxLength={120} onChange={(e) => setPreuve(e.target.value)} placeholder="N° du certificat d’accouchement ou nom du centre de santé" />
            <small className="petit">Naissance à domicile : le nom de la sage-femme ou de l’accoucheuse. L’agent la vérifiera.</small></label>
          <label className="case"><input type="checkbox" checked={noms} onChange={(e) => setNoms(e.target.checked)} /> Je souhaite transmettre les noms des parents pour l’acte (facultatif, vous pouvez les donner plus tard à la mairie)</label>
          {noms && (
            <div className="champs">
              <label className="champ"><span className="champ-titre">Nom et prénoms de la mère</span><input value={mere} maxLength={120} onChange={(e) => setMere(e.target.value)} autoComplete="off" /></label>
              <label className="champ"><span className="champ-titre">Nom et prénoms du père <em>facultatif</em></span><input value={pere} maxLength={120} onChange={(e) => setPere(e.target.value)} autoComplete="off" /></label>
              <label className="champ"><span className="champ-titre">Prénom de l’enfant <em>facultatif</em></span><input value={prenom} maxLength={60} onChange={(e) => setPrenom(e.target.value)} autoComplete="off" /></label>
            </div>
          )}
          {erreur && <p className="alerte-jour" role="alert">{erreur}</p>}
          <div className="decl-actions">
            <button className="bouton" disabled={attente}>{attente ? 'Envoi…' : 'Envoyer à mon agent de santé'}</button>
            <button type="button" className="bouton secondaire" onClick={() => setOuvert(false)}>Annuler</button>
          </div>
        </form>
      )}
    </section>
  )
}
