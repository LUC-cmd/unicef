import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth, useReseau } from '../lib/contexte.jsx'
import { etapesPassees } from '../lib/calendrier.js'
import { envoyerOuMettreEnFile } from '../lib/envoi.js'
import {
  LIBELLE_LANGUE, LIBELLE_PORTE, LIBELLE_ROLE_PROCHE, ZONES, aujourdhuiIso, formaterDate,
} from '../lib/format.js'
import { ajouterInscription, nouvelUuid } from '../lib/offline.js'
import Bandeau from '../components/Bandeau.jsx'

const enfantVide = () => ({ cle: nouvelUuid(), statut: 'ENFANT', dateNaissance: '', dateTermePrevue: '', sexe: '', etapesFaites: [], consultationsFaites: 0 })
const procheVide = () => ({ cle: nouvelUuid(), role: 'RELAIS', telephone: '', consentement: false })

/** Inscription d'une famille par l'agent, avec son accord. Marche hors ligne : les codes arrivent à la synchronisation. */
export default function Inscription() {
  const { session } = useAuth()
  const { enLigne } = useReseau()
  const [langue, setLangue] = useState('fr')
  const [porte, setPorte] = useState('VOIX_SMS')
  const [telephone, setTelephone] = useState('')
  const [codeZone, setCodeZone] = useState('GOLFE')
  const [consentement, setConsentement] = useState(false)
  const [enfants, setEnfants] = useState([enfantVide()])
  const [proches, setProches] = useState([])
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState(null)
  const [attente, setAttente] = useState(false)

  const aujourdhui = aujourdhuiIso()
  const majEnfant = (cle, champs) => setEnfants((l) => l.map((e) => (e.cle === cle ? { ...e, ...champs } : e)))
  const majProche = (cle, champs) => setProches((l) => l.map((p) => (p.cle === cle ? { ...p, ...champs } : p)))
  const basculerEtape = (e, index) => majEnfant(e.cle, {
    etapesFaites: e.etapesFaites.includes(index) ? e.etapesFaites.filter((i) => i !== index) : [...e.etapesFaites, index],
  })

  async function envoyer(ev) {
    ev.preventDefault()
    setErreur('')
    if (!consentement) { setErreur("L'accord de la famille est obligatoire."); return }
    if (porte === 'VOIX_SMS' && !telephone.trim()) { setErreur('La porte « voix et SMS » demande un numéro de téléphone.'); return }

    const requete = {
      clientUuid: nouvelUuid(),
      codeZone: session.role === 'ADMIN' ? codeZone : null,
      langue,
      porte,
      telephone: telephone.trim() || null,
      consentement: true,
      enfants: enfants.map((e) => (e.statut === 'ENFANT'
        ? { statut: 'ENFANT', dateNaissance: e.dateNaissance, sexe: e.sexe || null, etapesFaites: e.etapesFaites }
        : { statut: 'GROSSESSE', dateTermePrevue: e.dateTermePrevue, sexe: null, consultationsFaites: Number(e.consultationsFaites) })),
      contacts: proches.filter((p) => p.telephone.trim())
        .map((p) => ({ role: p.role, telephone: p.telephone.trim(), consentement: p.consentement })),
    }

    setAttente(true)
    try {
      const r = await envoyerOuMettreEnFile({
        enLigne,
        envoyer: () => api.post('/api/agent/familles', requete),
        mettreEnFile: () => ajouterInscription(requete),
      })
      setResultat(r.envoye ? { envoye: true, ...r.resultat } : { envoye: false })
    } catch (e) {
      setErreur(e.message)
    } finally {
      setAttente(false)
    }
  }

  if (resultat) {
    return (
      <main className="page etroite">
        <h1>Famille inscrite</h1>
        {resultat.envoye ? (
          <div className="carte succes-carte" role="status">
            <p>Code famille : <b className="gros-code">{resultat.codeFamille}</b>{!resultat.creee && ' (déjà enregistrée)'}</p>
            <p>Codes enfants : {resultat.codesEnfants.map((c) => <b key={c} className="code">{c}</b>)}</p>
            <p><Link to={`/carnet/${resultat.codeFamille}`}>Imprimer le carnet illustré</Link></p>
          </div>
        ) : (
          <div className="carte" role="status">
            <p className="succes">Inscription enregistrée sur ce téléphone.</p>
            <p>Les codes famille et enfant seront attribués dès que le réseau sera là. La synchronisation se fait toute seule, sans doublon.</p>
          </div>
        )}
        <div className="actions">
          <button className="bouton" onClick={() => { setResultat(null); setConsentement(false); setEnfants([enfantVide()]); setProches([]); setTelephone('') }}>Inscrire une autre famille</button>
          <Link className="bouton secondaire" to="/agent">Retour à ma liste</Link>
        </div>
      </main>
    )
  }

  return (
    <>
    <Bandeau surtitre="Agent de santé" titre="Inscrire une famille">
      Pas de nom, de photo ni d'adresse : la famille et chaque enfant reçoivent un <b>code</b>.
      {!enLigne && ' Vous êtes hors ligne : l’inscription partira au retour du réseau.'}
    </Bandeau>
    <main className="page etroite large">

      <form onSubmit={envoyer}>
        <section className="carte">
          <h2>La famille</h2>
          {session.role === 'ADMIN' && (
            <label>Zone
              <select value={codeZone} onChange={(e) => setCodeZone(e.target.value)}>
                {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </label>
          )}
          <div className="formulaire-ligne">
            <label>Langue de la famille
              <select value={langue} onChange={(e) => setLangue(e.target.value)}>
                {Object.entries(LIBELLE_LANGUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Comment la joindre ?
              <select value={porte} onChange={(e) => setPorte(e.target.value)}>
                {Object.entries(LIBELLE_PORTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <label>Téléphone de la famille {porte === 'VOIX_SMS' ? '' : '(facultatif)'}
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} inputMode="tel" placeholder="8 chiffres" autoComplete="off" />
          </label>
          <p className="petit">Le numéro n'est jamais conservé en clair. Famille sans téléphone : indiquez un proche relais plus bas.</p>
        </section>

        <section className="carte">
          <h2>Enfants et grossesses</h2>
          {enfants.map((e, i) => (
            <fieldset key={e.cle}>
              <legend>{e.statut === 'ENFANT' ? `Enfant ${i + 1}` : `Grossesse ${i + 1}`}</legend>
              <div className="formulaire-ligne">
                <label>Type
                  <select value={e.statut} onChange={(ev) => majEnfant(e.cle, { statut: ev.target.value })}>
                    <option value="ENFANT">Enfant né (0 à 5 ans)</option>
                    <option value="GROSSESSE">Femme enceinte</option>
                  </select>
                </label>
                {e.statut === 'ENFANT' ? (
                  <>
                    <label>Date de naissance
                      <input type="date" required value={e.dateNaissance} max={aujourdhui} onChange={(ev) => majEnfant(e.cle, { dateNaissance: ev.target.value, etapesFaites: [] })} />
                    </label>
                    <label>Sexe (facultatif)
                      <select value={e.sexe} onChange={(ev) => majEnfant(e.cle, { sexe: ev.target.value })}>
                        <option value="">—</option><option value="F">Fille</option><option value="M">Garçon</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label>Date prévue d'accouchement
                      <input type="date" required value={e.dateTermePrevue} onChange={(ev) => majEnfant(e.cle, { dateTermePrevue: ev.target.value })} />
                    </label>
                    <label>Consultations prénatales déjà faites
                      <select value={e.consultationsFaites} onChange={(ev) => majEnfant(e.cle, { consultationsFaites: ev.target.value })}>
                        {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
              {e.statut === 'ENFANT' && e.dateNaissance && (
                <div>
                  <p className="petit">Vaccins déjà faits, vus sur le <b>carnet de santé</b> (ce qui n'est pas coché sera proposé en rattrapage) :</p>
                  {etapesPassees(e.dateNaissance, aujourdhui).length === 0 && <p className="petit">Aucun vaccin encore dû.</p>}
                  {etapesPassees(e.dateNaissance, aujourdhui).map((et) => (
                    <label className="case" key={et.index}>
                      <input type="checkbox" checked={e.etapesFaites.includes(et.index)} onChange={() => basculerEtape(e, et.index)} />
                      {formaterDate(et.date)} · {et.libelle}
                    </label>
                  ))}
                </div>
              )}
              {enfants.length > 1 && <button type="button" className="lien" onClick={() => setEnfants((l) => l.filter((x) => x.cle !== e.cle))}>Retirer</button>}
            </fieldset>
          ))}
          {enfants.length < 10 && <button type="button" className="bouton secondaire petit-bouton" onClick={() => setEnfants((l) => [...l, enfantVide()])}>+ Ajouter un enfant ou une grossesse</button>}
        </section>

        <section className="carte">
          <h2>Proches informés (facultatif)</h2>
          <p className="petit">
            Numéro relais, père, grand-parent. Ils reçoivent seulement des rappels généraux (« un rendez-vous approche »),
            sans nom d'enfant ni détail médical, et <b>seulement avec leur accord</b>.
          </p>
          {proches.map((p) => (
            <fieldset key={p.cle}>
              <div className="formulaire-ligne">
                <label>Rôle
                  <select value={p.role} onChange={(ev) => majProche(p.cle, { role: ev.target.value })}>
                    {Object.entries(LIBELLE_ROLE_PROCHE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label>Téléphone du proche
                  <input value={p.telephone} onChange={(ev) => majProche(p.cle, { telephone: ev.target.value })} inputMode="tel" autoComplete="off" />
                </label>
              </div>
              <label className="case"><input type="checkbox" checked={p.consentement} onChange={(ev) => majProche(p.cle, { consentement: ev.target.checked })} /> Le proche a accepté de recevoir ces rappels</label>
              <button type="button" className="lien" onClick={() => setProches((l) => l.filter((x) => x.cle !== p.cle))}>Retirer</button>
            </fieldset>
          ))}
          {proches.length < 5 && <button type="button" className="bouton secondaire petit-bouton" onClick={() => setProches((l) => [...l, procheVide()])}>+ Ajouter un proche</button>}
        </section>

        <section className="carte">
          <label className="case consentement">
            <input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} />
            <span>
              <b>La famille a donné son accord</b> pour être suivie par Fil d'Or, après explication : quelles données sont gardées
              (un code, des dates de rendez-vous, des mesures), pourquoi, et qu'elle peut retirer son accord à tout moment.
            </span>
          </label>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button className="bouton" disabled={attente}>{attente ? 'Enregistrement…' : 'Inscrire la famille'}</button>
        </section>
      </form>
    </main>
    </>
  )
}
