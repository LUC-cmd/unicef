import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth, useReseau } from '../lib/contexte.jsx'
import { envoyerOuMettreEnFile } from '../lib/envoi.js'
import { aujourdhuiIso, formaterDate } from '../lib/format.js'
import { ajouterAccouchement, ajouterDeclaration, ajouterInscription, nouvelUuid } from '../lib/offline.js'
import Picto from '../components/Picto.jsx'

const CLE_LISTE = 'fildor.cache.visites'

function lireCache() {
  try { return JSON.parse(localStorage.getItem(CLE_LISTE) || 'null') || [] } catch { return [] }
}

const PRECISIONS = [
  ['EXACTE', 'Date exacte', 'La famille ou le certificat donne le jour.'],
  ['APPROXIMATIVE', 'À peu près', 'Estimée d’après l’âge de l’enfant ou un événement.'],
  ['INCONNUE', 'On ne sait pas', 'Meilleure estimation : l’état civil orientera vers un jugement supplétif.'],
]

const NOMS = [
  ['RIEN', 'Pas de nom pour l’instant', 'Le dossier part avec le code de l’enfant. La famille donnera les noms à la mairie.'],
  ['MERE', 'Nom de la mère seulement', 'Le père est inconnu, absent, ou la famille ne souhaite pas le nommer.'],
  ['DEUX', 'Noms de la mère et du père', 'Les deux parents sont connus et sont d’accord.'],
]

function Etape({ n, titre, aide, children }) {
  return (
    <section className="nais-etape">
      <header>
        <span className="nais-num" aria-hidden="true">{n}</span>
        <div><h2>{titre}</h2>{aide && <p className="petit">{aide}</p>}</div>
      </header>
      <div className="nais-corps">{children}</div>
    </section>
  )
}

/**
 * Déclarer une naissance : un seul écran, quatre étapes. Fonctionne pour une famille déjà suivie
 * (grossesse ou enfant) et pour une mère jamais enregistrée (accouchement le jour même).
 */
export default function Naissance() {
  const { session } = useAuth()
  const { enLigne } = useReseau()
  const aujourdhui = aujourdhuiIso()
  const [liste, setListe] = useState(() => lireCache())
  const [mode, setMode] = useState('EXISTANTE') // EXISTANTE · NOUVELLE
  const [choix, setChoix] = useState('')
  const [telephone, setTelephone] = useState('')
  const [langue, setLangue] = useState('fr')
  const [accordFamille, setAccordFamille] = useState(false)
  const [date, setDate] = useState(aujourdhui)
  const [precision, setPrecision] = useState('EXACTE')
  const [heure, setHeure] = useState('')
  const [heureInconnue, setHeureInconnue] = useState(false)
  const [lieu, setLieu] = useState('CENTRE_SANTE')
  const [certificat, setCertificat] = useState(true)
  const [sexe, setSexe] = useState('')
  const [noms, setNoms] = useState('RIEN')
  const [mere, setMere] = useState('')
  const [pere, setPere] = useState('')
  const [prenom, setPrenom] = useState('')
  const [accordNoms, setAccordNoms] = useState(false)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [signalements, setSignalements] = useState([])
  const [signalement, setSignalement] = useState(null) // naissance signalée par une famille, en cours de traitement
  const [refus, setRefus] = useState({ id: null, motif: '' })

  useEffect(() => {
    if (!enLigne || session?.local) return
    api.get('/api/agent/visites').then((l) => { if (Array.isArray(l)) setListe(l) }).catch(() => { /* on garde le cache */ })
  }, [enLigne, session?.local])

  const chargerSignalements = () => { if (enLigne && !session?.local) api.get('/api/agent/signalements').then((l) => { if (Array.isArray(l)) setSignalements(l) }).catch(() => {}) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(chargerSignalements, [enLigne, session?.local])

  function reprendre(sg) {
    setMode('EXISTANTE'); setChoix(sg.codeEnfant); setDate(sg.dateNaissance); setPrecision(sg.precisionDate || 'EXACTE')
    setHeure(sg.heureNaissance || ''); setHeureInconnue(!sg.heureNaissance); setLieu(sg.lieu); setCertificat(Boolean(sg.preuve))
    setMere(sg.mereNom || ''); setPere(sg.pereNom || ''); setPrenom(sg.enfantPrenom || '')
    setNoms(sg.mereNom ? (sg.pereNom ? 'DEUX' : 'MERE') : 'RIEN'); setAccordNoms(false)
    setSignalement(sg); setErreur('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function refuser(sg) {
    if (!refus.motif.trim()) { setErreur('Écrivez le motif du refus : la famille le verra.'); return }
    try { await api.post(`/api/agent/signalements/${sg.id}/traiter`, { confirme: false, motif: refus.motif.trim() }); setRefus({ id: null, motif: '' }); setErreur(''); chargerSignalements() }
    catch (err) { setErreur(err.message) }
  }

  const options = useMemo(() => liste.filter((l) => l.statut === 'GROSSESSE' || (l.statut === 'ENFANT' && l.dateNaissance)), [liste])
  const item = options.find((o) => o.codeEnfant === choix) || null
  const dateFixe = mode === 'EXISTANTE' && item?.statut === 'ENFANT' // l'enfant est déjà né : sa date est connue
  const dateAffichee = dateFixe ? item.dateNaissance : date
  const minimum = (() => { const d = new Date(`${aujourdhui}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() - 5); return d.toISOString().slice(0, 10) })()
  const delai = Math.round((new Date(`${aujourdhui}T00:00:00Z`) - new Date(`${dateAffichee}T00:00:00Z`)) / 86400000)
  const horsDelai = Number.isFinite(delai) && delai > 45

  function verifier() {
    if (mode === 'EXISTANTE' && !item) return 'Choisissez la famille : la grossesse ou l’enfant concerné.'
    if (mode === 'NOUVELLE') {
      if (!/^\d{8}$/.test(telephone.trim())) return 'Le numéro de téléphone de la famille est obligatoire (8 chiffres). À défaut, un proche ou un voisin peut le prêter.'
      if (!accordFamille) return 'L’accord de la famille est obligatoire pour l’inscrire.'
    }
    if (!dateAffichee) return 'Indiquez la date de naissance.'
    if (dateAffichee > aujourdhui) return 'La date de naissance ne peut pas être dans le futur.'
    if (!heureInconnue && !heure) return 'Indiquez l’heure de naissance, ou cochez « l’heure n’est pas connue ».'
    const veutMere = noms === 'MERE' || noms === 'DEUX'
    if (veutMere && mere.trim().length < 2) return 'Indiquez le nom et les prénoms de la mère, ou choisissez « pas de nom pour l’instant ».'
    if (noms === 'DEUX' && pere.trim().length < 2) return 'Indiquez le nom du père, ou choisissez « nom de la mère seulement ».'
    if (noms !== 'RIEN' && !accordNoms) return 'Les noms ne partent à l’état civil qu’avec l’accord de la famille : cochez la case.'
    return ''
  }

  const corpsDeclaration = (code) => ({
    codeEnfant: code, lieuNaissance: lieu, certificatAccouchement: certificat, source: 'AGENT',
    ...(noms !== 'RIEN' ? { mereNom: mere.trim(), accordMere: true } : {}),
    ...(noms === 'DEUX' ? { pereNom: pere.trim(), accordPere: true } : {}),
    ...(noms !== 'RIEN' && prenom.trim() ? { enfantPrenom: prenom.trim() } : {}),
    ...(heureInconnue ? {} : { heureNaissance: heure }),
    precisionDate: precision,
  })

  async function envoyer(e) {
    e.preventDefault()
    const probleme = verifier()
    if (probleme) { setErreur(probleme); return }
    setErreur(''); setAttente(true)
    try {
      if (mode === 'NOUVELLE') {
        const requete = {
          clientUuid: nouvelUuid(), codeZone: session?.local ? session.zone : null, langue, porte: 'VOIX_SMS',
          telephone: telephone.trim(), consentement: true, mereAdolescente: false, contacts: [],
          enfants: [{ statut: 'ENFANT', dateNaissance: date, sexe: sexe || null, etapesFaites: [] }],
        }
        const r = await envoyerOuMettreEnFile({ enLigne, envoyer: () => api.post('/api/agent/familles', requete), mettreEnFile: () => ajouterInscription(requete) })
        if (!r.envoye) { setResultat({ type: 'inscription-en-attente' }); return }
        const code = r.resultat.codesEnfants[0]
        const d = await api.post('/api/agent/naissances', corpsDeclaration(code))
        setResultat({ type: 'envoye', recu: d.declaration?.numeroRecu, codeFamille: r.resultat.codeFamille, code, deja: !d.creee })
        return
      }
      const code = item.codeEnfant
      if (item.statut === 'GROSSESSE') {
        const corps = { dateNaissance: date, etapesFaites: [] }
        const a = await envoyerOuMettreEnFile({
          enLigne,
          envoyer: () => api.post(`/api/agent/enfants/${encodeURIComponent(code)}/accouchement`, corps),
          mettreEnFile: () => ajouterAccouchement({ codeEnfant: code, ...corps }),
        })
        if (!a.envoye) { ajouterDeclaration(corpsDeclaration(code)); setResultat({ type: 'en-attente', code }); return }
      }
      const r = await envoyerOuMettreEnFile({
        enLigne,
        envoyer: () => api.post('/api/agent/naissances', corpsDeclaration(code)),
        mettreEnFile: () => ajouterDeclaration(corpsDeclaration(code)),
      })
      if (!r.envoye) { setResultat({ type: 'en-attente', code }); return }
      if (signalement) { try { await api.post(`/api/agent/signalements/${signalement.id}/traiter`, { confirme: true }) } catch { /* la déclaration est partie : l'agent pourra la clore plus tard */ } setSignalement(null); chargerSignalements() }
      setResultat({ type: 'envoye', recu: r.resultat.declaration?.numeroRecu, codeFamille: item.codeFamille, code, deja: !r.resultat.creee })
    } catch (err) {
      setErreur(err.message || 'L’envoi a échoué.')
    } finally { setAttente(false) }
  }

  if (resultat) {
    return (
      <main className="page etroite nais">
        <div className="carte nais-resultat" role="status">
          <span className="nais-ok"><Picto nom="valide" /></span>
          {resultat.type === 'envoye' && (
            <>
              <h1>{resultat.deja ? 'Cette déclaration avait déjà été envoyée' : 'Déclaration envoyée à la mairie'}</h1>
              <p>Reçu <b>{resultat.recu}</b>. L’état civil va vérifier le dossier puis le valider. La famille verra dans son espace que l’acte est en cours, puis qu’il est prêt à retirer.</p>
              <p className="petit">Enfant {resultat.code}{resultat.codeFamille ? ` · famille ${resultat.codeFamille}` : ''}</p>
            </>
          )}
          {resultat.type === 'en-attente' && (
            <>
              <h1>Enregistré sur ce téléphone</h1>
              <p>Pas de réseau pour le moment : la naissance et la déclaration partent à l’état civil dès que le téléphone se reconnecte, ou par clé USB.</p>
            </>
          )}
          {resultat.type === 'inscription-en-attente' && (
            <>
              <h1>Famille enregistrée sur ce téléphone</h1>
              <p>Sans réseau, la famille est inscrite sur ce téléphone et recevra ses codes à la synchronisation. <b>Une fois les codes reçus, ouvrez la fiche de l’enfant et envoyez la déclaration de naissance</b> : les informations de cet écran ne sont pas encore parties à la mairie.</p>
            </>
          )}
          <div className="nais-actions">
            {resultat.type === 'envoye' && <Link className="bouton" to={`/agent/visites?enfant=${encodeURIComponent(resultat.code)}`}>Ouvrir la fiche de l’enfant</Link>}
            <button type="button" className="bouton secondaire" onClick={() => { setResultat(null); setChoix(''); setNoms('RIEN'); setMere(''); setPere(''); setPrenom(''); setAccordNoms(false); setHeure(''); setHeureInconnue(false); setTelephone(''); setAccordFamille(false) }}>
              Déclarer une autre naissance
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page etroite nais">
      <h1>Déclarer une naissance</h1>
      <p className="chapeau">Quatre étapes. À la fin, le dossier part à la mairie, qui prépare l’acte de naissance. Marche aussi si la mère n’était pas encore enregistrée.</p>

      {signalements.filter((x) => x.statut === 'A_VERIFIER').length > 0 && (
        <section className="nais-etape nais-signales" aria-labelledby="t-signales">
          <header><span className="nais-num" aria-hidden="true"><Picto nom="alerte" /></span>
            <div><h2 id="t-signales">Naissances signalées par les familles</h2><p className="petit">À vérifier avec la famille, preuve en main. Rien ne part à la mairie sans vous.</p></div></header>
          <ul className="nais-liste">
            {signalements.filter((x) => x.statut === 'A_VERIFIER').map((sg) => (
              <li key={sg.id}>
                <div>
                  <b>{sg.codeEnfant}</b> · famille {sg.codeFamille} · né(e) le {formaterDate(sg.dateNaissance)}{sg.heureNaissance ? ` à ${sg.heureNaissance}` : ''}
                  <div className="petit">Preuve : {sg.preuve || 'aucune'}</div>
                  {sg.alertes.length > 0 && <ul className="nais-alertes">{sg.alertes.map((a) => <li key={a}><Picto nom="alerte" /> {a}</li>)}</ul>}
                  {refus.id === sg.id && (
                    <div className="nais-refus">
                      <input value={refus.motif} maxLength={200} placeholder="Motif visible par la famille" onChange={(e) => setRefus({ id: sg.id, motif: e.target.value })} />
                      <button type="button" className="bouton danger" onClick={() => refuser(sg)}>Confirmer le refus</button>
                      <button type="button" className="bouton secondaire" onClick={() => setRefus({ id: null, motif: '' })}>Annuler</button>
                    </div>
                  )}
                </div>
                {refus.id !== sg.id && (
                  <div className="nais-actions-ligne">
                    <button type="button" className="bouton" onClick={() => reprendre(sg)}>Vérifier et déclarer</button>
                    <button type="button" className="bouton secondaire" onClick={() => setRefus({ id: sg.id, motif: '' })}>Refuser</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {signalement && <p className="carte attention sans-marge petit" role="status">Vous reprenez la déclaration de la famille {signalement.codeFamille}. Vérifiez chaque information avec elle avant d’envoyer.</p>}

      <form onSubmit={envoyer} noValidate>
        <Etape n="1" titre="Quelle famille ?" aide="Une famille déjà suivie, ou une mère qui n’était pas enregistrée.">
          <div className="nais-choix" role="radiogroup" aria-label="Type de famille">
            <button type="button" role="radio" aria-checked={mode === 'EXISTANTE'} className={mode === 'EXISTANTE' ? 'actif' : ''} onClick={() => setMode('EXISTANTE')}>
              <Picto nom="famille" /><b>Famille déjà suivie</b><small>La grossesse ou l’enfant est dans mes visites.</small>
            </button>
            <button type="button" role="radio" aria-checked={mode === 'NOUVELLE'} className={mode === 'NOUVELLE' ? 'actif' : ''} onClick={() => setMode('NOUVELLE')}>
              <Picto nom="bebe" /><b>Nouvelle famille</b><small>La mère accouche et n’était pas enregistrée.</small>
            </button>
          </div>

          {mode === 'EXISTANTE' ? (
            <label className="champ"><span className="champ-titre">Grossesse ou enfant</span>
              <select value={choix} onChange={(e) => setChoix(e.target.value)}>
                <option value="">— Choisir —</option>
                {options.map((o) => (
                  <option key={o.codeEnfant} value={o.codeEnfant}>
                    {o.codeEnfant} · famille {o.codeFamille} · {o.statut === 'GROSSESSE' ? 'grossesse suivie' : `né(e) le ${formaterDate(o.dateNaissance)}`}
                  </option>
                ))}
              </select>
              {options.length === 0 && <small className="petit">Aucune famille dans la liste. Choisissez « Nouvelle famille », ou connectez-vous pour charger vos visites.</small>}
            </label>
          ) : (
            <div className="formulaire-ligne">
              <label className="champ"><span className="champ-titre">Téléphone de la famille <em>obligatoire</em></span>
                <input inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="8 chiffres" />
                <small className="petit">Pas de téléphone ? Un proche ou un voisin peut prêter le sien pour recevoir les rappels.</small>
              </label>
              <label className="champ"><span className="champ-titre">Langue des rappels</span>
                <select value={langue} onChange={(e) => setLangue(e.target.value)}>
                  <option value="fr">Français</option><option value="ewe">Éwé</option><option value="kabye">Kabyè</option><option value="tem">Tem</option>
                </select>
              </label>
              <label className="case"><input type="checkbox" checked={accordFamille} onChange={(e) => setAccordFamille(e.target.checked)} />
                La famille accepte d’être suivie par Fil d’Or et a compris qu’elle peut se retirer à tout moment.</label>
            </div>
          )}
        </Etape>

        <Etape n="2" titre="La naissance" aide="Ce que la mairie doit connaître pour dresser l’acte.">
          <div className="formulaire-ligne">
            <label className="champ"><span className="champ-titre">Date de naissance</span>
              {dateFixe
                ? <b className="nais-fixe">{formaterDate(dateAffichee)}</b>
                : <input type="date" value={date} min={minimum} max={aujourdhui} onChange={(e) => setDate(e.target.value)} />}
            </label>
            <div className="champ"><span className="champ-titre">Heure de naissance</span>
              <input type="time" aria-label="Heure de naissance" value={heure} disabled={heureInconnue} onChange={(e) => setHeure(e.target.value)} />
              <label className="case"><input type="checkbox" checked={heureInconnue} onChange={(e) => { setHeureInconnue(e.target.checked); if (e.target.checked) setHeure('') }} /> L’heure n’est pas connue</label>
            </div>
          </div>
          <div className="nais-precision" role="radiogroup" aria-label="Précision de la date">
            {PRECISIONS.map(([k, titre, aide]) => (
              <label key={k} className={`choix-identite ${precision === k ? 'choisi' : ''}`}>
                <input type="radio" name="precision" checked={precision === k} onChange={() => setPrecision(k)} />
                <span><b>{titre}</b><small>{aide}</small></span>
              </label>
            ))}
          </div>
          <div className="formulaire-ligne">
            <label className="champ"><span className="champ-titre">Lieu de naissance</span>
              <select value={lieu} onChange={(e) => setLieu(e.target.value)}>
                <option value="CENTRE_SANTE">Centre de santé</option><option value="DOMICILE">À domicile</option>
              </select>
            </label>
            {mode === 'NOUVELLE' && (
              <label className="champ"><span className="champ-titre">Sexe de l’enfant <em>facultatif</em></span>
                <select value={sexe} onChange={(e) => setSexe(e.target.value)}>
                  <option value="">Non précisé</option><option value="F">Fille</option><option value="M">Garçon</option>
                </select>
              </label>
            )}
            <label className="case"><input type="checkbox" checked={certificat} onChange={(e) => setCertificat(e.target.checked)} /> Certificat d’accouchement vu</label>
          </div>
          {horsDelai && precision !== 'INCONNUE' && (
            <p className="carte attention sans-marge petit"><Picto nom="alerte" /> Plus de 45 jours : la déclaration n’est plus gratuite, la mairie orientera vers un jugement supplétif.</p>
          )}
          {precision === 'INCONNUE' && (
            <p className="carte attention sans-marge petit"><Picto nom="alerte" /> Date inconnue : indiquez la meilleure estimation. La mairie orientera vers un jugement supplétif.</p>
          )}
        </Etape>

        <Etape n="3" titre="Les parents, pour l’acte" aide="Facultatif. Fil d’Or ne garde aucun nom par défaut : la famille choisit ce qu’elle communique.">
          {NOMS.map(([k, titre, aide]) => (
            <label key={k} className={`choix-identite ${noms === k ? 'choisi' : ''}`}>
              <input type="radio" name="noms" checked={noms === k} onChange={() => setNoms(k)} />
              <span><b>{titre}</b><small>{aide}</small></span>
            </label>
          ))}
          {noms !== 'RIEN' && (
            <div className="champs">
              <label className="champ"><span className="champ-titre">Nom et prénoms de la mère</span>
                <input value={mere} onChange={(e) => setMere(e.target.value)} autoComplete="off" maxLength={120} /></label>
              {noms === 'DEUX' && (
                <label className="champ"><span className="champ-titre">Nom et prénoms du père</span>
                  <input value={pere} onChange={(e) => setPere(e.target.value)} autoComplete="off" maxLength={120} /></label>
              )}
              <label className="champ"><span className="champ-titre">Prénom de l’enfant <em>facultatif</em></span>
                <input value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="off" maxLength={60} /></label>
              <label className="case accord-identite"><input type="checkbox" checked={accordNoms} onChange={(e) => setAccordNoms(e.target.checked)} />
                La famille a donné son accord pour transmettre {noms === 'DEUX' ? 'ces noms' : 'ce nom'} à l’état civil, et sait qu’elle peut le retirer.</label>
            </div>
          )}
        </Etape>

        <Etape n="4" titre="Envoyer à la mairie" aide="Vérifiez, puis envoyez. Sans réseau, tout reste sur le téléphone et part plus tard.">
          <ul className="nais-resume">
            <li><b>Famille :</b> {mode === 'NOUVELLE' ? 'nouvelle famille' : item ? `${item.codeEnfant} (famille ${item.codeFamille})` : 'à choisir'}</li>
            <li><b>Naissance :</b> {dateAffichee ? formaterDate(dateAffichee) : 'date à indiquer'}{heureInconnue ? ', heure inconnue' : heure ? ` à ${heure}` : ''} · {PRECISIONS.find((p) => p[0] === precision)[1].toLowerCase()}</li>
            <li><b>Noms transmis :</b> {noms === 'RIEN' ? 'aucun' : noms === 'MERE' ? 'la mère' : 'la mère et le père'}</li>
            <li><b>Réseau :</b> {enLigne ? 'en ligne, envoi immédiat' : 'hors ligne, envoi plus tard'}</li>
          </ul>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button className="bouton nais-envoi" disabled={attente}>{attente ? 'Envoi…' : 'Envoyer la déclaration à la mairie'}</button>
        </Etape>
      </form>
    </main>
  )
}
