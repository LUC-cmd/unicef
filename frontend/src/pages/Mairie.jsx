import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ageLisible, formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'
import { Squelette } from '../components/Chargement.jsx'
import { Anneau, Barres } from '../components/Graphiques.jsx'
import { COULEURS, Courbe, TuileChiffre } from '../components/Courbes.jsx'
import { SOURCE_DECLARATION } from '../lib/libelles.js'
import { Link } from 'react-router-dom'
import { Verification } from './Fonctionnement.jsx'
import ProcedureNationalite from '../components/ProcedureNationalite.jsx'
import ActesSuivi from '../components/ActesSuivi.jsx'

const STATUTS = [['ENVOYEE', 'À traiter'], ['VALIDEE', 'Validées'], ['REJETEE', 'Rejetées'], ['', 'Toutes']]
const LIBELLE = { ENVOYEE: 'À traiter', VALIDEE: 'Validée', REJETEE: 'Rejetée', BROUILLON: 'Brouillon' }


const jourIso = (d) => new Date(d).toISOString().slice(0, 10)
function derniersJours(n = 30) {
  const fin = new Date()
  return Array.from({ length: n }, (_, i) => { const d = new Date(fin); d.setDate(fin.getDate() - (n - 1 - i)); return d.toISOString().slice(0, 10) })
}
const compterParJour = (jours, liste, champ) => jours.map((j) => liste.filter((d) => d[champ] && jourIso(d[champ]) === j).length)

/** Ce que la famille a choisi de communiquer, dit simplement. */
export function resumeIdentite(d) {
  if (!d.identiteDemandee) return { court: 'Non demandée', ton: 'neutre', detail: 'Le dossier est arrivé avec le code de l’enfant seulement.' }
  const mere = d.accordMere && d.mereNom
  const pere = d.accordPere && d.pereNom
  if (mere && pere) return { court: 'Mère et père', ton: 'ok', detail: 'Les deux parents ont été nommés avec leur accord.' }
  if (mere) return { court: 'Mère seulement', ton: 'ok', detail: 'Père non communiqué : la famille ne l’a pas souhaité ou il est inconnu.' }
  return { court: 'Rien communiqué', ton: 'neutre', detail: 'La famille n’a rien souhaité communiquer pour l’instant. L’état civil la recevra.' }
}
const PIECES = { CARTE_ELECTEUR: 'Carte d’électeur', CNI: 'Carte nationale d’identité', PASSEPORT: 'Passeport', CARTE_SANTE: 'Carte de consultation', AUCUNE: 'Aucune' }
const BADGE_SOURCE = { AGENT: 'agent', CENTRE_SANTE: 'cs', HOPITAL: 'hop' }

function Parcours({ d }) {
  const etapes = [
    ['Dossier reçu', d.envoyeeLe, true],
    [d.statut === 'REJETEE' ? 'Rejeté' : 'Validé', d.traiteeLe, d.statut === 'VALIDEE' || d.statut === 'REJETEE'],
    ['Acte prêt', d.actePretLe, !!d.actePretLe],
    ['Acte retiré par la famille', d.acteRetireLe, !!d.acteRetireLe],
  ]
  return (
    <ol className="parcours-dossier">
      {etapes.map(([nom, date, fait], i) => (
        <li key={nom} className={fait ? 'fait' : ''}><i aria-hidden="true">{fait ? '✓' : i + 1}</i><b>{nom}</b><span>{date ? formaterDate(date) : 'à venir'}</span></li>
      ))}
    </ol>
  )
}

function FicheDossier({ d, fermer, valider, rejeter, preuve }) {
  const id = resumeIdentite(d)
  return (
    <div className="modale" role="dialog" aria-modal="true" aria-label={`Dossier ${d.numeroRecu}`} onClick={(e) => e.target === e.currentTarget && fermer()}>
      <div className="carte fiche-dossier">
        <div className="fiche-tete">
          <div><h2>Dossier {d.numeroRecu}</h2><p className="petit">Enfant {d.codeEnfant} · {d.zone} · né(e) le {formaterDate(d.dateNaissance)}</p></div>
          <button type="button" className="bouton secondaire petit-bouton" onClick={fermer}>Fermer</button>
        </div>
        <Parcours d={d} />
        <dl className="stats">
          <dt>Envoyé par</dt><dd>{SOURCE_DECLARATION[d.source] ?? 'Agent de santé'}</dd>
          <dt>Heure de naissance</dt><dd>{d.heureNaissance || 'Non indiquée'}</dd>
          <dt>Précision de la date</dt><dd>{{ EXACTE: 'Date exacte', APPROXIMATIVE: 'Date approximative', INCONNUE: 'Date inconnue : orienter vers un jugement supplétif' }[d.precisionDate] || 'Date exacte'}</dd>
          <dt>Lieu de naissance</dt><dd>{d.lieuNaissance === 'CENTRE_SANTE' ? 'Centre de santé' : 'Domicile'}</dd>
          <dt>Certificat d’accouchement</dt><dd>{d.certificatAccouchement ? 'Vu par l’agent' : 'Non vu'}</dd>
          <dt>Délai</dt><dd>{d.dansDelaiGratuit ? 'Gratuit (dans les 45 jours)' : 'Hors délai : jugement supplétif, 6 000 FCFA'}</dd>
        </dl>
        <h3>Ce que la famille a communiqué</h3>
        {d.prisEnGrossesse && <p className="petit">Pris dès les consultations prénatales, avec l'accord de chacun.</p>}
        <div className={`identite-bloc ${id.ton}`}>
          <b>{id.court}</b>
          <p className="petit">{id.detail}</p>
          {d.identiteDemandee && (
            <ul>
              <li>Mère : {d.accordMere && d.mereNom ? <b>{d.mereNom}</b> : <em>non communiquée</em>}</li>
              <li>Père : {d.accordPere && d.pereNom ? <b>{d.pereNom}</b> : <em>non communiqué</em>}</li>
              {d.pieceType && <li>Pièce de la mère : <b>{PIECES[d.pieceType]}</b>{d.pieceNumero ? ` n° ${d.pieceNumero}` : ''}</li>}
              {(d.nationaliteMere || d.nationaliteConjoint) && <li>Nationalité : mère <b>{d.nationaliteMere || '—'}</b>, père <b>{d.nationaliteConjoint || '—'}</b></li>}
            </ul>
          )}
        </div>
        <div className={`identite-bloc ${d.prenomDonne ? 'ok' : ''}`}>
          <b>Nom de l’enfant</b>
          {d.prenomDonne ? <p>{d.enfantPrenom}</p> : <p className="petit">En attente : donné à partir du 8e jour ({formaterDate(d.prenomAttenduLe)}).</p>}
        </div>
        {(d.nationaliteMere === 'Togolaise' || d.nationaliteConjoint === 'Togolaise') && <p className="nationalite-note">Un parent togolais : nationalité togolaise de l’enfant à inscrire.</p>}
        {d.motifRejet && <p className="erreur">Motif du rejet : {d.motifRejet}</p>}
        <div className="actions">
          {d.statut === 'ENVOYEE' && <><button className="bouton" onClick={() => valider(d.id)}>Valider le dossier</button>
            <button className="bouton secondaire" onClick={() => rejeter(d.id)}>Rejeter</button></>}
          {d.statut === 'VALIDEE' && <button className="bouton secondaire" onClick={() => preuve(d.id)}>Voir la preuve</button>}
        </div>
      </div>
    </div>
  )
}

export default function Mairie({ vue = 'declarations' }) {
  const [statut, setStatut] = useState(vue === 'tableau' ? '' : 'ENVOYEE')
  const [liste, setListe] = useState([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [rejet, setRejet] = useState(null) // { id, motif }
  const [ouvert, setOuvert] = useState(null)
  const [source, setSource] = useState('')

  const charger = useCallback(async () => {
    try {
      setListe(await api.get(`/api/mairie/declarations${statut ? `?statut=${statut}` : ''}`))
      setErreur('')
    } catch (e) { setErreur(e.message) } finally { setPret(true) }
  }, [statut])

  useEffect(() => { charger() }, [charger])

  async function valider(id) {
    try { const r = await api.post(`/api/mairie/declarations/${id}/valider`); setInfo(r.message); await charger() }
    catch (e) { setErreur(e.message) }
  }
  async function voirPreuve(id) {
    try {
      const r = await api.get(`/api/mairie/declarations/${id}/preuve`)
      setInfo(`Preuve de naissance : reçu ${r.numero}, code ${r.code}. À lire à la famille ou à écrire sur son carnet.`)
      setErreur('')
    } catch (e) { setErreur(e.message) }
  }
  async function rejeter() {
    try {
      const r = await api.post(`/api/mairie/declarations/${rejet.id}/rejeter`, { motif: rejet.motif })
      setInfo(r.message); setRejet(null); await charger()
    } catch (e) { setErreur(e.message) }
  }

  const comptes = (st) => liste.filter((d) => d.statut === st).length
  const jours = derniersJours(30)
  const recues = compterParJour(jours, liste, 'envoyeeLe')
  const traitees = compterParJour(jours, liste, 'traiteeLe')
  const avecNoms = liste.filter((d) => resumeIdentite(d).ton === 'ok').length
  const parSource = Object.entries(SOURCE_DECLARATION).map(([k, nom]) => ({ nom, valeur: liste.filter((d) => (d.source ?? 'AGENT') === k).length, couleur: { AGENT: COULEURS.cyan, CENTRE_SANTE: COULEURS.bleu, HOPITAL: COULEURS.violet }[k] }))
  const parIdentite = [
    { nom: 'Mère et père', valeur: liste.filter((d) => resumeIdentite(d).court === 'Mère et père').length, couleur: '#00833D' },
    { nom: 'Mère seulement', valeur: liste.filter((d) => resumeIdentite(d).court === 'Mère seulement').length, couleur: COULEURS.cyan },
    { nom: 'Rien communiqué', valeur: liste.filter((d) => resumeIdentite(d).court === 'Rien communiqué').length, couleur: '#8A94A0' },
    { nom: 'Non demandée', valeur: liste.filter((d) => resumeIdentite(d).court === 'Non demandée').length, couleur: '#C9D3DB' },
  ]
  const actesPrets = liste.filter((d) => d.actePretLe && !d.acteRetireLe).length
  const parZone = Object.entries(liste.reduce((m, d) => ({ ...m, [d.zone]: (m[d.zone] ?? 0) + 1 }), {})).map(([nom, valeur]) => ({ nom, valeur }))
  const maxZone = Math.max(1, ...parZone.map((z) => z.valeur))
  const horsDelai = liste.filter((d) => !d.dansDelaiGratuit).length

  if (vue === 'tableau') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Tableau de bord">
          Où en sont les déclarations de naissance de votre commune, et les actes que les familles doivent encore retirer.
        </Bandeau>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {info && <p className="succes" role="status">{info}</p>}
        {!pret ? <Squelette /> : (<>
        <div className="grille-tuiles">
          <TuileChiffre libelle="À traiter" valeur={comptes('ENVOYEE')} serie={recues} aide={comptes('ENVOYEE') ? 'Dossiers qui attendent votre décision' : 'Tout est à jour'} couleur={COULEURS.orange} />
          <TuileChiffre libelle="Validées" valeur={comptes('VALIDEE')} serie={traitees} couleur={COULEURS.cyan} />
          <TuileChiffre libelle="Rejetées" valeur={comptes('REJETEE')} aide="L'agent doit corriger avec la famille" couleur={COULEURS.orange} />
          <TuileChiffre libelle="Actes prêts à retirer" valeur={actesPrets} aide="Les familles sont prévenues" couleur={COULEURS.bleu} />
          <TuileChiffre libelle="Noms transmis" valeur={`${liste.length ? Math.round((100 * avecNoms) / liste.length) : 0} %`} aide={`${avecNoms} dossier(s) sur ${liste.length} avec le nom de la mère`} couleur={COULEURS.violet} />
          <TuileChiffre libelle="Hors délai gratuit" valeur={horsDelai} aide="Plus de 45 jours après la naissance" couleur={COULEURS.orange} />
        </div>
        <div className="raccourcis">
          <Link className="bouton" to="/mairie/declarations">Traiter les déclarations</Link>
          <Link className="bouton secondaire" to="/mairie/actes">Suivre les actes à retirer</Link>
          <Link className="bouton secondaire" to="/mairie/preuve">Vérifier une preuve</Link>
        </div>
        <section className="carte">
          <Courbe titre="Déclarations de naissance reçues et traitées, 30 jours" jours={jours}
                  series={[{ nom: 'Reçues', valeurs: recues, couleur: COULEURS.cyan }, { nom: 'Traitées', valeurs: traitees, couleur: COULEURS.orange }]} />
        </section>
        <div className="grille-trois">
          <section className="carte"><Anneau titre="Où en sont les dossiers" centre={liste.length}
            parts={[{ nom: 'À traiter', valeur: comptes('ENVOYEE'), couleur: '#E0A100' }, { nom: 'Validées', valeur: comptes('VALIDEE'), couleur: '#00833D' }, { nom: 'Rejetées', valeur: comptes('REJETEE'), couleur: '#E2231A' }]} /></section>
          <section className="carte"><Anneau titre="Qui envoie le dossier" centre={liste.length} parts={parSource} /></section>
          <section className="carte"><Anneau titre="Noms communiqués par les familles" centre={liste.length} parts={parIdentite} /></section>
        </div>
        <section className="carte">
          <Barres titre="Dossiers par préfecture" max={maxZone} items={parZone} />
        </section>
        <section className="carte">
          <h2>À traiter maintenant</h2>
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Reçu</th><th>Enfant</th><th>Envoyé par</th><th>Noms</th><th>Délai</th><th></th></tr></thead>
              <tbody>
                {liste.filter((d) => d.statut === 'ENVOYEE').slice(0, 6).map((d) => (
                  <tr key={d.id} className="ligne-cliquable" onClick={() => setOuvert(d)}>
                    <td>{d.numeroRecu}<br /><span className="petit">{formaterDate(d.envoyeeLe)}</span></td>
                    <td>{d.codeEnfant}<br /><span className="petit">{d.zone}</span></td>
                    <td><span className={`badge source-${BADGE_SOURCE[d.source] ?? 'agent'}`}>{SOURCE_DECLARATION[d.source] ?? 'Agent de santé'}</span></td>
                    <td>{resumeIdentite(d).court}</td>
                    <td>{d.dansDelaiGratuit ? 'Gratuit' : 'Hors délai'}</td>
                    <td><button className="bouton petit-bouton" onClick={(e) => { e.stopPropagation(); setOuvert(d) }}>Ouvrir</button></td>
                  </tr>
                ))}
                {comptes('ENVOYEE') === 0 && <tr><td colSpan="6" className="vide">Rien à traiter : tout est à jour.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <ActesSuivi role="MAIRIE" resume />
        {ouvert && <FicheDossier d={ouvert} fermer={() => setOuvert(null)} valider={async (id) => { await valider(id); setOuvert(null) }}
                      rejeter={(id) => { setOuvert(null); setRejet({ id, motif: '' }) }} preuve={voirPreuve} />}
        </>)}
      </main>
    )
  }

  if (vue === 'nationalite') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Nationalité des enfants">
          Dès que la naissance est validée, le dossier de nationalité s'ouvre. Même sans papiers, l'enfant avance.
        </Bandeau>
        <ProcedureNationalite />
      </main>
    )
  }

  if (vue === 'actes') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Actes à retirer">
          Une déclaration validée ne suffit pas : l'enfant n'a son acte que lorsque la famille l'a retiré.
        </Bandeau>
        <ActesSuivi role="MAIRIE" />
      </main>
    )
  }

  if (vue === 'preuve') {
    return (
      <main className="page">
        <Bandeau surtitre="État civil" titre="Vérifier une preuve de naissance">
          Un parent ou un enfant présente un numéro de reçu et un code reçu par SMS : vérifiez-les ici.
        </Bandeau>
        <Verification />
      </main>
    )
  }

  return (
    <>
    <main className="page">
      <Bandeau surtitre="État civil" titre="Déclarations de naissance">
        Noms visibles seulement avec l'accord de la famille. Jamais de photo ni d'adresse.
      </Bandeau>
      <div className="onglets large" role="tablist">
        {STATUTS.map(([v, nom]) => (
          <button key={v} role="tab" aria-selected={statut === v} className={statut === v ? 'actif' : ''} onClick={() => { setStatut(v); setInfo('') }}>{nom}</button>
        ))}
      </div>

      {info && <p className="succes" role="status">{info}</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="filtres-comptes" role="group" aria-label="Filtrer selon l'expéditeur">
        {[['', 'Tous les expéditeurs'], ...Object.entries(SOURCE_DECLARATION)].map(([k, v]) => (
          <button key={k} type="button" className={`filtre ${source === k ? 'actif' : ''}`} aria-pressed={source === k} onClick={() => setSource(k)}>{v}</button>
        ))}
      </div>
      <div className="tableau-conteneur carte">
        <table>
          <thead>
            <tr><th>Reçu</th><th>Enfant</th><th>Envoyé par</th><th>Né(e)</th><th>Noms communiqués</th><th>Délai</th><th>État</th><th></th></tr>
          </thead>
          <tbody>
            {liste.filter((d) => !source || (d.source ?? 'AGENT') === source).map((d) => {
              const id = resumeIdentite(d)
              return (
                <tr key={d.id} className="ligne-cliquable" onClick={() => setOuvert(d)}>
                  <td><b>{d.numeroRecu}</b><br /><span className="petit">{formaterDate(d.envoyeeLe)}</span></td>
                  <td>{d.codeEnfant}{d.enfantPrenom && <><br /><span className="petit">{d.enfantPrenom}</span></>}<br /><span className="petit">{d.zone}</span></td>
                  <td><span className={`badge source-${BADGE_SOURCE[d.source] ?? 'agent'}`}>{SOURCE_DECLARATION[d.source] ?? 'Agent de santé'}</span></td>
                  <td>{formaterDate(d.dateNaissance)}<br /><span className="petit">{ageLisible(d.dateNaissance)}</span></td>
                  <td><span className={`identite-pastille ${id.ton}`}>{id.court}</span></td>
                  <td>{d.dansDelaiGratuit ? 'Gratuit' : <span className="petit">6 000 FCFA</span>}</td>
                  <td><span className={`pastille ${d.statut.toLowerCase()}`}>{LIBELLE[d.statut]}</span></td>
                  <td className="actions-ligne">
                    {d.statut === 'ENVOYEE' && <button className="bouton petit-bouton" onClick={(e) => { e.stopPropagation(); valider(d.id) }}>Valider</button>}
                    {d.statut !== 'ENVOYEE' && <button className="lien-bouton" onClick={(e) => { e.stopPropagation(); setOuvert(d) }}>Détail</button>}
                  </td>
                </tr>
              )
            })}
            {liste.length === 0 && <tr><td colSpan="8" className="vide">Aucune déclaration.</td></tr>}
          </tbody>
        </table>
      </div>

      {ouvert && <FicheDossier d={ouvert} fermer={() => setOuvert(null)} valider={async (id) => { await valider(id); setOuvert(null) }}
                    rejeter={(id) => { setOuvert(null); setRejet({ id, motif: '' }) }} preuve={voirPreuve} />}

      {rejet && (
        <div className="modale" role="dialog" aria-modal="true" aria-label="Motif du rejet">
          <div className="carte">
            <h2>Motif du rejet</h2>
            <p className="petit">Le motif est obligatoire : l'agent doit savoir quoi corriger.</p>
            <textarea value={rejet.motif} onChange={(e) => setRejet({ ...rejet, motif: e.target.value })} rows="3" maxLength="200" autoFocus />
            <div className="actions">
              <button className="bouton" disabled={!rejet.motif.trim()} onClick={rejeter}>Rejeter</button>
              <button className="bouton secondaire" onClick={() => setRejet(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  )
}
