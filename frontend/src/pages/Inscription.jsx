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
import { niveauAgeMere } from '../lib/adolescente.js'
import ApercuMessage from '../components/ApercuMessage.jsx'

const enfantVide = () => ({ cle: nouvelUuid(), statut: 'ENFANT', dateNaissance: '', dateTermePrevue: '', sexe: '', acteExistant: '', etapesFaites: [], consultationsFaites: 0, parents: parentsVides() })
const parentsVides = () => ({ mereNom: '', conjointNom: '', pieceType: '', pieceNumero: '', nationaliteMere: '', nationaliteConjoint: '', accordMere: false, accordConjoint: false })
const PIECES = [['CARTE_ELECTEUR', 'Carte d’électeur'], ['CNI', 'Carte nationale d’identité'], ['PASSEPORT', 'Passeport'], ['CARTE_SANTE', 'Carte de consultation'], ['AUCUNE', 'Aucune pièce']]
const NATIONALITES = ['Togolaise', 'Béninoise', 'Ghanéenne', 'Burkinabè', 'Nigériane', 'Ivoirienne', 'Autre']
const procheVide = () => ({ cle: nouvelUuid(), role: 'RELAIS', telephone: '', consentement: false })

const AIDE_PORTE = {
  VOIX_SMS: 'Les rappels arrivent par SMS, ou par un appel vocal pour ceux qui ne lisent pas. Un numéro est nécessaire.',
  AGENT: "Pas de téléphone : l'agent passe voir la famille quand un rendez-vous approche.",
  CARNET: "Pas de téléphone : la famille reçoit un carnet illustré avec les dates à retenir.",
  POINT_ECOUTE: "La famille vient au point d'écoute du centre de santé pour ses rappels.",
}

function Champ({ titre, aide, requis, children }) {
  return (
    <label className="champ">
      <span className="champ-titre">{titre}{requis && <em>obligatoire</em>}</span>
      {children}
      {aide && <span className="champ-aide">{aide}</span>}
    </label>
  )
}

/** Inscription d'une famille par l'agent, avec son accord. Marche hors ligne : les codes arrivent à la synchronisation. */
export default function Inscription() {
  const { session } = useAuth()
  const { enLigne } = useReseau()
  const [langue, setLangue] = useState('fr')
  const [porte, setPorte] = useState('VOIX_SMS')
  const [telephone, setTelephone] = useState('')
  const [codeZone, setCodeZone] = useState('GOLFE')
  const [consentement, setConsentement] = useState(false)
  const [mereAdolescente, setMereAdolescente] = useState(false)
  const [ageMere, setAgeMere] = useState('')
  const niveauMere = ageMere === '' ? null : niveauAgeMere(Number(ageMere))
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
      codeZone: session.role === 'ADMIN' ? codeZone : (session.local ? session.zone : null),
      langue,
      porte,
      telephone: telephone.trim() || null,
      consentement: true,
      mereAdolescente,
      enfants: enfants.map((e) => (e.statut === 'ENFANT'
        ? { statut: 'ENFANT', dateNaissance: e.dateNaissance, sexe: e.sexe || null, acteExistant: e.acteExistant || null, etapesFaites: e.etapesFaites }
        : { statut: 'GROSSESSE', dateTermePrevue: e.dateTermePrevue, sexe: null, consultationsFaites: Number(e.consultationsFaites),
            parents: (e.parents.accordMere || e.parents.accordConjoint) ? {
              mereNom: e.parents.accordMere ? e.parents.mereNom.trim() || null : null,
              pieceType: e.parents.accordMere ? e.parents.pieceType || null : null,
              pieceNumero: e.parents.accordMere ? e.parents.pieceNumero.trim() || null : null,
              nationaliteMere: e.parents.accordMere ? e.parents.nationaliteMere || null : null,
              conjointNom: e.parents.accordConjoint ? e.parents.conjointNom.trim() || null : null,
              nationaliteConjoint: e.parents.accordConjoint ? e.parents.nationaliteConjoint || null : null,
              accordMere: e.parents.accordMere, accordConjoint: e.parents.accordConjoint,
            } : null })),
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

  const nbEnfants = enfants.filter((e) => e.statut === 'ENFANT').length
  const nbGrossesses = enfants.length - nbEnfants
  const manques = [
    ...enfants.flatMap((e, i) => (e.statut === 'ENFANT' ? !e.dateNaissance : !e.dateTermePrevue)
      ? [e.statut === 'ENFANT' ? `Date de naissance de l'enfant ${i + 1}` : `Date prévue de la grossesse ${i + 1}`] : []),
    ...(porte === 'VOIX_SMS' && !telephone.trim() ? ['Numéro de téléphone de la famille'] : []),
    ...(!consentement ? ["Accord de la famille"] : []),
  ]
  const zoneLibelle = session.role === 'ADMIN' ? ZONES.find(([c]) => c === codeZone)?.[1] : (session.local ? ZONES.find(([c]) => c === session.zone)?.[1] : 'Votre zone')

  return (
    <>
    <Bandeau surtitre="Agent de santé" titre="Inscrire une famille">
      Quatre étapes, deux minutes. La famille et chaque enfant reçoivent un <b>code</b>.
      {!enLigne && ' Hors ligne : l’inscription partira au retour du réseau.'}
    </Bandeau>
    <main className="page inscription">
      <form onSubmit={envoyer} className="inscription-grille">
        <div className="inscription-colonne">

          <section className="etape">
            <header className="etape-tete"><span className="etape-num">1</span><div><h2>La famille</h2><p>Langue et canal des rappels.</p></div></header>
            <div className="champs">
              {session.role === 'ADMIN' && (
                <Champ titre="Zone" aide="Zone de santé où vit la famille.">
                  <select value={codeZone} onChange={(e) => setCodeZone(e.target.value)}>
                    {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                  </select>
                </Champ>
              )}
              <Champ titre="Langue des messages">
                <select value={langue} onChange={(e) => setLangue(e.target.value)}>
                  {Object.entries(LIBELLE_LANGUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Champ>
              <Champ titre="Comment la joindre ?" aide={AIDE_PORTE[porte]}>
                <select value={porte} onChange={(e) => setPorte(e.target.value)}>
                  {Object.entries(LIBELLE_PORTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Champ>
              <Champ titre="Téléphone de la famille" requis={porte === 'VOIX_SMS'} aide="8 chiffres. Il n'est jamais conservé en clair. Sans téléphone, ajoutez un proche relais à l'étape 3.">
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} inputMode="tel" placeholder="Ex. 90123456" autoComplete="off" />
              </Champ>
            </div>
            <ApercuMessage langue={langue} />
          </section>

          <section className="etape">
            <header className="etape-tete"><span className="etape-num">2</span><div><h2>Enfants et grossesses</h2><p>Enfants de moins de 5 ans et femmes enceintes.</p></div></header>
            {enfants.map((e, i) => (
              <div key={e.cle} className="enfant-carte">
                <div className="enfant-tete">
                  <b>{e.statut === 'ENFANT' ? `Enfant ${i + 1}` : `Grossesse ${i + 1}`}</b>
                  <div className="segment" role="radiogroup" aria-label="Type">
                    <button type="button" role="radio" aria-checked={e.statut === 'ENFANT'} className={e.statut === 'ENFANT' ? 'actif' : ''} onClick={() => majEnfant(e.cle, { statut: 'ENFANT' })}>Enfant né</button>
                    <button type="button" role="radio" aria-checked={e.statut === 'GROSSESSE'} className={e.statut === 'GROSSESSE' ? 'actif' : ''} onClick={() => majEnfant(e.cle, { statut: 'GROSSESSE' })}>Femme enceinte</button>
                  </div>
                  {enfants.length > 1 && <button type="button" className="lien" onClick={() => setEnfants((l) => l.filter((x) => x.cle !== e.cle))}>Retirer</button>}
                </div>
                {e.statut === 'ENFANT' ? (
                  <div className="champs">
                    <Champ titre="Date de naissance" requis aide="Date inconnue ? Entrez une date estimée (âge donné par la famille, carnet de vaccination).">
                      <input type="date" required value={e.dateNaissance} max={aujourdhui} onChange={(ev) => majEnfant(e.cle, { dateNaissance: ev.target.value, etapesFaites: [] })} />
                    </Champ>
                    <Champ titre="Sexe" aide="Facultatif. Sert aux statistiques, jamais à identifier l'enfant.">
                      <select value={e.sexe} onChange={(ev) => majEnfant(e.cle, { sexe: ev.target.value })}>
                        <option value="">Non précisé</option><option value="F">Fille</option><option value="M">Garçon</option>
                      </select>
                    </Champ>
                  </div>
                ) : (
                  <div className="champs">
                    <Champ titre="Date prévue d'accouchement" requis aide="Donnée par la sage-femme ou le carnet de grossesse.">
                      <input type="date" required value={e.dateTermePrevue} onChange={(ev) => majEnfant(e.cle, { dateTermePrevue: ev.target.value })} />
                    </Champ>
                    <Champ titre="Consultations prénatales déjà faites" aide="Au moins 4 sont recommandées pendant la grossesse.">
                      <select value={e.consultationsFaites} onChange={(ev) => majEnfant(e.cle, { consultationsFaites: ev.target.value })}>
                        {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </Champ>
                  </div>
                )}
                {e.statut === 'GROSSESSE' && (
                  <fieldset className="identite-acte">
                    <legend>Pièce et conjoint <em>(facultatif)</em></legend>
                    <p className="petit">Pris à la consultation, ils iront à l'état civil à la naissance. Chacun ne donne que ce qu'il veut.</p>
                    <label className="case accord-identite"><input type="checkbox" checked={e.parents.accordMere} onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, accordMere: ev.target.checked } })} /> <span>La mère accepte de donner son identité</span></label>
                    {e.parents.accordMere && (
                      <div className="champs">
                        <Champ titre="Nom et prénoms de la mère"><input value={e.parents.mereNom} maxLength={120} autoComplete="off" onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, mereNom: ev.target.value } })} /></Champ>
                        <Champ titre="Pièce présentée">
                          <select value={e.parents.pieceType} onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, pieceType: ev.target.value } })}>
                            <option value="">Choisir…</option>{PIECES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </Champ>
                        {e.parents.pieceType && e.parents.pieceType !== 'AUCUNE' && (
                          <Champ titre="Numéro de la pièce"><input value={e.parents.pieceNumero} maxLength={40} autoComplete="off" onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, pieceNumero: ev.target.value } })} /></Champ>
                        )}
                        <Champ titre="Nationalité de la mère">
                          <select value={e.parents.nationaliteMere} onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, nationaliteMere: ev.target.value } })}>
                            <option value="">Non précisée</option>{NATIONALITES.map((n) => <option key={n}>{n}</option>)}
                          </select>
                        </Champ>
                      </div>
                    )}
                    <label className="case accord-identite"><input type="checkbox" checked={e.parents.accordConjoint} onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, accordConjoint: ev.target.checked } })} /> <span>Le conjoint (père de l'enfant) accepte de donner son nom</span></label>
                    {e.parents.accordConjoint && (
                      <div className="champs">
                        <Champ titre="Nom et prénoms du conjoint"><input value={e.parents.conjointNom} maxLength={120} autoComplete="off" onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, conjointNom: ev.target.value } })} /></Champ>
                        <Champ titre="Nationalité du conjoint">
                          <select value={e.parents.nationaliteConjoint} onChange={(ev) => majEnfant(e.cle, { parents: { ...e.parents, nationaliteConjoint: ev.target.value } })}>
                            <option value="">Non précisée</option>{NATIONALITES.map((n) => <option key={n}>{n}</option>)}
                          </select>
                        </Champ>
                      </div>
                    )}
                    {(e.parents.nationaliteMere === 'Togolaise' || e.parents.nationaliteConjoint === 'Togolaise') && (
                      <p className="nationalite-note">Un parent togolais : l'enfant sera inscrit avec la <b>nationalité togolaise</b>.</p>
                    )}
                  </fieldset>
                )}
                {e.statut === 'ENFANT' && e.dateNaissance && (
                  <div className="vaccins-faits">
                    <p className="champ-titre">Vaccins déjà faits <span className="champ-aide">Cochez ce que montre le carnet de santé. Le reste sera proposé en rattrapage.</span></p>
                    {etapesPassees(e.dateNaissance, aujourdhui).length === 0 && <p className="petit">Aucun vaccin encore dû à cet âge.</p>}
                    <div className="vaccins-grille">
                      {etapesPassees(e.dateNaissance, aujourdhui).map((et) => (
                        <label className="case" key={et.index}>
                          <input type="checkbox" checked={e.etapesFaites.includes(et.index)} onChange={() => basculerEtape(e, et.index)} />
                          <span>{et.libelle} <small>{formaterDate(et.date)}</small></span>
                        </label>
                      ))}
                    </div>
                    <label className="champ"><span className="champ-titre">Acte de naissance</span>
                      <select value={e.acteExistant} onChange={(ev) => majEnfant(e.cle, { acteExistant: ev.target.value })}>
                        <option value="">Pas d'acte, ou on ne sait pas</option>
                        <option value="ETABLI">Acte établi, pas encore retiré à la mairie</option>
                        <option value="RETIRE">Acte retiré, la famille l'a en main</option>
                      </select>
                      <span className="champ-aide">Si l'acte existe déjà, Fil d'Or ne relance pas la famille pour la déclaration.</span></label>
                    {!e.acteExistant && <p className="petit">Pas d'acte de naissance ? <Link to="/agent/acte">Voir comment l'obtenir</Link>.</p>}
                  </div>
                )}
              </div>
            ))}
            {enfants.length < 10 && <button type="button" className="bouton secondaire petit-bouton" onClick={() => setEnfants((l) => [...l, enfantVide()])}>+ Ajouter un enfant ou une grossesse</button>}
          </section>

          <section className="etape">
            <header className="etape-tete"><span className="etape-num">3</span><div><h2>Proches informés <small>facultatif</small></h2><p>Un relais, le père, un grand-parent.</p></div></header>
            <p className="petit">Ils reçoivent seulement des rappels généraux (« un rendez-vous approche »), sans nom d'enfant ni détail médical, et <b>seulement avec leur accord</b>.</p>
            {proches.map((p) => (
              <div key={p.cle} className="enfant-carte">
                <div className="champs">
                  <Champ titre="Qui est-ce ?">
                    <select value={p.role} onChange={(ev) => majProche(p.cle, { role: ev.target.value })}>
                      {Object.entries(LIBELLE_ROLE_PROCHE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Champ>
                  <Champ titre="Téléphone du proche" aide="8 chiffres.">
                    <input value={p.telephone} onChange={(ev) => majProche(p.cle, { telephone: ev.target.value })} inputMode="tel" autoComplete="off" />
                  </Champ>
                </div>
                <label className="case"><input type="checkbox" checked={p.consentement} onChange={(ev) => majProche(p.cle, { consentement: ev.target.checked })} /><span>Le proche a accepté de recevoir ces rappels</span></label>
                <button type="button" className="lien" onClick={() => setProches((l) => l.filter((x) => x.cle !== p.cle))}>Retirer ce proche</button>
              </div>
            ))}
            {proches.length < 5 && <button type="button" className="bouton secondaire petit-bouton" onClick={() => setProches((l) => [...l, procheVide()])}>+ Ajouter un proche</button>}
          </section>

          <section className="etape">
            <header className="etape-tete"><span className="etape-num">3b</span><div><h2>Jeune mère</h2><p>Pour un suivi renforcé et une orientation adaptée.</p></div></header>
            <label className="case">
              <input type="checkbox" checked={mereAdolescente} onChange={(e) => setMereAdolescente(e.target.checked)} />
              <span>La mère a <b>moins de 20 ans</b>. Aucun âge exact n'est gardé.</span>
            </label>
            <label className="champ">
              <span className="champ-titre">Âge de la mère, pour afficher le protocole de suivi <span className="champ-aide">Facultatif. Cet âge n'est pas enregistré : il sert seulement à cocher la case et à rappeler quoi faire.</span></span>
              <input type="number" inputMode="numeric" min="10" max="55" value={ageMere} onChange={(ev) => { setAgeMere(ev.target.value); const a = Number(ev.target.value); if (ev.target.value !== '') setMereAdolescente(a < 20) }} style={{ maxWidth: 160 }} />
            </label>
            {niveauMere && niveauMere.niveau !== 'bon' && (
              <div className={`soin-resultat soin-${niveauMere.niveau === 'rouge' ? 'urgent' : niveauMere.niveau}`} role="status">
                <b>{niveauMere.titre}</b>
                <p>{niveauMere.texte}</p>
                <ul className="liste-coches">
                  <li>Consultations prénatales rapprochées dès la première visite.</li>
                  <li>Accouchement prévu en centre de santé, avec un plan d'accouchement rempli.</li>
                  <li>Orientation vers le centre social pour rester à l'école ou apprendre un métier.</li>
                  <li>Proposition d'une méthode de planification familiale avant la sortie après la naissance, avec son accord.</li>
                  <li>Remettre l'adresse de l'espace adolescente : <b>Espace famille › Mon espace adolescente</b> (privé, sur son téléphone).</li>
                </ul>
              </div>
            )}
          </section>

          <section className="etape">
            <header className="etape-tete"><span className="etape-num">4</span><div><h2>Accord de la famille</h2><p>Obligatoire avant d'inscrire.</p></div></header>
            <label className="case consentement">
              <input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} />
              <span><b>La famille a donné son accord</b> pour être suivie par Fil d'Or, après explication : quelles données sont gardées (un code, des dates de rendez-vous, des mesures), pourquoi, et qu'elle peut retirer son accord à tout moment.</span>
            </label>
          </section>
        </div>

        <aside className="inscription-resume" aria-label="Récapitulatif">
          <h2>Récapitulatif</h2>
          <dl>
            <div><dt>Zone</dt><dd>{zoneLibelle}</dd></div>
            <div><dt>Langue</dt><dd>{LIBELLE_LANGUE[langue]}</dd></div>
            <div><dt>Rappels par</dt><dd>{LIBELLE_PORTE[porte]}</dd></div>
            <div><dt>Enfants</dt><dd>{nbEnfants}</dd></div>
            <div><dt>Grossesses</dt><dd>{nbGrossesses}</dd></div>
            <div><dt>Proches</dt><dd>{proches.filter((p) => p.telephone.trim()).length}</dd></div>
          </dl>
          {manques.length > 0 ? (
            <div className="a-completer"><b>À compléter</b><ul>{manques.map((m) => <li key={m}>{m}</li>)}</ul></div>
          ) : (
            <p className="succes">Tout est prêt.</p>
          )}
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button className="bouton" disabled={attente || manques.length > 0}>{attente ? 'Enregistrement…' : 'Inscrire la famille'}</button>
          <p className="petit">{enLigne ? 'Les codes sont donnés tout de suite.' : 'Hors ligne : enregistré sur cet appareil, envoyé au retour du réseau.'}</p>
        </aside>
      </form>
    </main>
    </>
  )
}
