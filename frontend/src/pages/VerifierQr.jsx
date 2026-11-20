import { useState } from 'react'
import { api } from '../lib/api.js'
import { lireEntree, lireSuivi, verifierJeton } from '../lib/qrSuivi.js'
import { aujourdhuiIso, formaterDate } from '../lib/format.js'
import { ajouterVisite, nombreEnAttente } from '../lib/offline.js'
import LecteurQr from '../components/LecteurQr.jsx'
import Picto from '../components/Picto.jsx'
import QrCode from '../components/QrCode.jsx'
import { creerPassage, ecrireCentre, ecrireSoins, enfantsEnAttente, estPassage, lireCentre, lirePassage, imagePassage, resumePourCarnet, SOINS } from '../lib/passage.js'
import { lireSession } from '../lib/api.js'
import { lireFile } from '../lib/offline.js'

/** Noter une visite faite devant le carnet : elle est gardée sur l'appareil et part à la prochaine
 *  synchronisation (réseau ou clé USB). Aucun réseau n'est nécessaire pour la noter. */
function NoterVisite({ code, onFait }) {
  const [ouvert, setOuvert] = useState(false)
  const [poids, setPoids] = useState('')
  const [pb, setPb] = useState('')
  const [danger, setDanger] = useState(false)
  const [soins, setSoins] = useState([])
  const [note, setNote] = useState('')

  function enregistrer(e) {
    e.preventDefault()
    ajouterVisite({
      codeEnfant: code,
      dateVisite: aujourdhuiIso(),
      muacMm: pb === '' ? null : Number(pb),
      poidsG: poids === '' ? null : Number(poids),
      signesDanger: danger,
      rendezVousRealises: [],
    })
    const f = lireFile(); const u = f.visites[f.visites.length - 1]?.clientUuid
    if (u) ecrireSoins(u, soins, note)
    setOuvert(false); setPoids(''); setPb(''); setDanger(false); setSoins([]); setNote('')
    onFait(code)
  }

  if (!ouvert) {
    return <button type="button" className="bouton secondaire" onClick={() => setOuvert(true)}>Noter une visite aujourd'hui</button>
  }
  return (
    <form onSubmit={enregistrer}>
      <label>Poids (g, facultatif)
        <input inputMode="numeric" value={poids} onChange={(e) => setPoids(e.target.value.replace(/\D/g, ''))} />
      </label>
      <label>Périmètre brachial (mm, facultatif)
        <input inputMode="numeric" value={pb} onChange={(e) => setPb(e.target.value.replace(/\D/g, ''))} />
      </label>
      <label className="case">
        <input type="checkbox" checked={danger} onChange={(e) => setDanger(e.target.checked)} /> Signe de danger observé
      </label>
      <fieldset className="soins-donnes">
        <legend>Soins donnés</legend>
        {Object.entries(SOINS).map(([k, nom]) => (
          <label key={k} className="case"><input type="checkbox" checked={soins.includes(k)} onChange={() => setSoins((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} /> {nom}</label>
        ))}
      </fieldset>
      <label>Note courte (facultatif, sans nom)
        <input maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div>
        <button className="bouton" type="submit">Enregistrer sur cet appareil</button>{' '}
        <button className="bouton secondaire" type="button" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
    </form>
  )
}

/** Les visites gardées sur cet appareil, à passer à un autre centre sans réseau grâce à un QR signé. */
function PassagesEnAttente({ version }) {
  const [ouvert, setOuvert] = useState('')
  const [centre, setCentre] = useState(lireCentre)
  const session = lireSession()
  const liste = enfantsEnAttente()
  if (liste.length === 0) return null
  const identite = { centre: centre.trim(), agent: session?.nomComplet || '', region: session?.region || session?.zone || '' }
  return (
    <section className="carte passage" aria-labelledby="t-passage" key={version}>
      <h2 id="t-passage" className="sans-marge">Passer un enfant à un autre centre</h2>
      <p className="petit">Vos visites ne sont pas encore parties vers le serveur. Si l'enfant va dans un centre sans réseau, affichez son QR de passage : l'agent de l'autre centre le scanne et voit ce qui a été fait, sans connexion. Aucun nom n'y figure.</p>
      <label>Nom de mon centre (écrit une fois, vu par l'autre centre)
        <input value={centre} maxLength={60} placeholder="par exemple Centre de santé de Zio" onChange={(e) => { setCentre(e.target.value); ecrireCentre(e.target.value) }} />
      </label>
      <ul className="sans-puce passage-liste">
        {liste.map((x) => (
          <li key={x.code}>
            <div><b>{x.code}</b> · {x.nombre} visite{x.nombre > 1 ? 's' : ''} en attente
              <button type="button" className="bouton secondaire petit-bouton" onClick={() => setOuvert(ouvert === x.code ? '' : x.code)}>{ouvert === x.code ? 'Masquer' : 'Afficher le QR de passage'}</button></div>
            {ouvert === x.code && <PassageFamille code={x.code} identite={identite} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Ce que la famille emporte avec son carnet : une photo du QR, ou le résumé à recopier à la main. */
function PassageFamille({ code, identite }) {
  const valeur = creerPassage(code, lireFile(), identite)
  const resume = resumePourCarnet(code, lireFile(), identite)
  const [copie, setCopie] = useState(false)
  const telecharger = async () => {
    const url = await imagePassage(code, valeur, identite)
    const a = document.createElement('a'); a.href = url; a.download = `passage-${code}.png`; document.body.appendChild(a); a.click(); a.remove()
  }
  const copier = async () => { try { await navigator.clipboard.writeText(resume); setCopie(true) } catch { setCopie(false) } }
  return (
    <div className="passage-qr">
      <p className="petit"><b>{identite.centre || 'Centre non nommé'}</b>{identite.agent && <> · {identite.agent}</>}</p>
      <QrCode valeur={valeur} taille={300} titre={`QR de passage de ${code}`} />
      <p className="petit"><b>La famille garde son carnet.</b> Trois façons d'emporter cette information :</p>
      <ol className="passage-etapes">
        <li><b>Photographier cet écran</b> avec son téléphone. Dans l'autre centre, l'agent scanne la photo ou l'écran.</li>
        <li><b>Garder l'image</b> : <button type="button" className="bouton secondaire petit-bouton" onClick={telecharger}>Enregistrer l'image du QR</button> à envoyer à la famille (Bluetooth, WhatsApp) ou à imprimer et coller dans le carnet.</li>
        <li><b>Recopier à la main</b> sur le carnet papier : lisible par n'importe quel agent, même sans téléphone.</li>
      </ol>
      <pre className="passage-resume" aria-label="Résumé à recopier">{resume}</pre>
      <button type="button" className="bouton secondaire petit-bouton" onClick={copier}>{copie ? 'Copié' : 'Copier le résumé'}</button>
    </div>
  )
}

/** Visites faites dans un autre centre, lues dans un QR de passage. */
function PassageLu({ p }) {
  if (!p.valide) return <div className="carte alerte" role="alert"><p><b>QR de passage refusé.</b> {p.erreur} N'utilisez pas ces informations.</p></div>
  return (
    <div className="carte succes-carte">
      <h2 className="sans-marge"><Picto nom="valide" /> Passage d'un autre centre — enfant <b>{p.enfant}</b></h2>
      <p className="passage-qui"><span>Centre</span><b>{p.centre || 'non indiqué'}</b><span>Agent</span><b>{p.agent || 'non indiqué'}</b>{p.region && <><span>Région</span><b>{p.region}</b></>}</p>
      <p className="petit">Contenu non modifié (signature vérifiée sur cet appareil, sans réseau). Émis par l'appareil <b>{p.appareil}</b> le {formaterDate(p.genere)}. Ces visites n'ont pas encore été envoyées au serveur par l'autre centre : elles ne sont pas ajoutées à votre file, elles arriveront par sa propre synchronisation.</p>
      <ul className="sans-puce">
        {p.visites.map((v) => (
          <li key={v.id} className="gros">
            <Picto nom={v.danger ? 'alerte' : 'fiche'} /> {v.date ? formaterDate(v.date) : 'date inconnue'}
            {v.poidsG != null && <> · poids {v.poidsG} g</>}{v.muacMm != null && <> · bras {v.muacMm} mm</>}
            {v.danger && <b> · signe de danger noté</b>}
            {(v.soins.length > 0 || v.note) && <span className="passage-soins">{v.soins.map((k) => SOINS[k] || k).join(', ')}{v.note && <> — {v.note}</>}</span>}
          </li>
        ))}
      </ul>
      <p className="petit">Notez votre propre visite avec le carnet papier de l'enfant, ou depuis son dossier.</p>
    </div>
  )
}

/** Vérifier un QR du carnet : l'agent ou le centre scanne (ou colle) le code du carnet papier.
 *  La signature est vérifiée SUR L'APPAREIL avec la clé publique embarquée : cela marche sans réseau,
 *  d'un village sans réseau à un autre. Le serveur n'est consulté que si la vérification locale échoue. */
export default function VerifierQr() {
  const [jeton, setJeton] = useState('')
  const [resultat, setResultat] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [scanOuvert, setScanOuvert] = useState(false)
  const [notees, setNotees] = useState([])
  const [passage, setPassage] = useState(null)

  async function verifier(texte) {
    const code = String(texte ?? jeton).trim()
    if (!code) return
    setEnCours(true)
    setResultat(null)
    setNotees([])
    setPassage(null)
    if (estPassage(code)) { setPassage(lirePassage(code)); setEnCours(false); return }
    // 1. Vérification locale, instantanée, sans réseau.
    const local = verifierJeton(code)
    if (local.valide) {
      setResultat({ ...local, source: 'appareil' })
      setEnCours(false)
      return
    }
    // 2. Seulement si elle échoue (clé différente, ancienne version) : on demande au serveur, s'il est joignable.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setResultat({ ...local, source: 'appareil' })
      setEnCours(false)
      return
    }
    try {
      const r = await api.post('/api/verification/carnet-qr', { jeton: code })
      setResultat({ ...r, source: 'serveur' })
    } catch {
      setResultat({ ...local, source: 'appareil' })
    } finally {
      setEnCours(false)
    }
  }

  const suivi = resultat?.valide ? lireSuivi(resultat.contenu) : null
  const enAttente = nombreEnAttente()

  return (
    <main className="page etroite verif-qr">
      <h1>Vérifier un QR du carnet</h1>
      <div className="carte">
        <p>
          Le carnet papier porte un code signé. Scannez-le (ou collez-le) : vous voyez les rendez-vous faits
          et le prochain. <b>La vérification se fait sur cet appareil, sans réseau</b> : un agent d'un village sans
          connexion peut lire le carnet d'un enfant venu d'un autre village. La signature garantit que le code n'a pas
          été modifié. Aucun nom n'y figure, seulement les codes.
        </p>

        {!scanOuvert && (
          <button className="bouton" type="button" onClick={() => setScanOuvert(true)}>
            <Picto nom="camera" /> Scanner le code avec la caméra
          </button>
        )}

        {scanOuvert && (
          <LecteurQr
            titre="Scanner le carnet papier"
            onScan={(code) => {
              setScanOuvert(false)
              setJeton(code)
              verifier(code)
            }}
            onFermer={() => setScanOuvert(false)}
          />
        )}

        <label htmlFor="zone-jeton" className="petit">Ou collez le contenu du code :</label>
        <textarea id="zone-jeton" rows={4} value={jeton} onChange={(e) => setJeton(e.target.value)}
          placeholder="fildor1.…" spellCheck="false" />
        <button className="bouton" disabled={enCours || !jeton.trim()} onClick={() => verifier()}>
          {enCours ? 'Vérification…' : 'Vérifier'}
        </button>
      </div>

      {passage && <PassageLu p={passage} />}
      <PassagesEnAttente version={notees.length} />

      {resultat && !resultat.valide && (
        <div className="carte alerte" role="alert">
          <p><b>Code refusé.</b> {resultat.erreur || 'Signature invalide.'} N'utilisez pas ce carnet comme référence.</p>
          {resultat.source === 'appareil' && resultat.signatureFausse && (
            <p className="petit">Vérifié sur cet appareil. Si le carnet est authentique, l'application est peut-être ancienne : mettez-la à jour avec du réseau.</p>
          )}
        </div>
      )}

      {suivi && (
        <div className="carte succes-carte">
          <h2 className="sans-marge"><Picto nom="valide" /> Suivi vérifié — famille <b>{suivi.famille}</b></h2>
          <p className="petit">
            {resultat.source === 'appareil'
              ? 'Signature vérifiée sur cet appareil, sans réseau.'
              : 'Signature vérifiée par le serveur.'}
            {suivi.genere && <> État du suivi au {formaterDate(suivi.genere)} : un carnet plus récent prime.</>}
          </p>
          {suivi.enfants.map((e) => (
            <section key={e.code} className="verif-enfant">
              <h3 className="sans-marge">
                {e.statut === 'GROSSESSE'
                  ? <><Picto nom="enceinte" /> Grossesse <b>{e.code}</b>{e.terme && <> · terme prévu le {formaterDate(e.terme)}</>}</>
                  : <>Enfant <b>{e.code}</b>{e.naissance && <> · né(e) le {formaterDate(e.naissance)}</>}</>}
              </h3>
              <p className="petit">Rendez-vous faits : {e.faits.length === 0 ? 'aucun enregistré' : ''}</p>
              <ul className="sans-puce">
                {e.faits.map((f, i) => {
                  const d = lireEntree(f)
                  return <li key={`${f}-${i}`} className="gros"><Picto nom={d.icone} /> {d.picto} le {d.date ? formaterDate(d.date) : 'date inconnue'}</li>
                })}
              </ul>
              {e.prochain && (() => { const d = lireEntree(e.prochain); return (
                <p className="gros"><Picto nom="calendrier" /> Prochain rendez-vous : <Picto nom={d.icone} /> {d.picto} le {d.date ? formaterDate(d.date) : 'date inconnue'}</p>
              ) })()}
              {e.statut !== 'GROSSESSE' && (
                notees.includes(e.code)
                  ? <p className="petit" role="status"><Picto nom="valide" /> Visite notée sur cet appareil pour {e.code}. Elle partira à la prochaine synchronisation (réseau ou clé USB).</p>
                  : <NoterVisite code={e.code} onFait={(c) => setNotees((n) => [...n, c])} />
              )}
            </section>
          ))}
          {enAttente > 0 && <p className="petit">{enAttente} saisie(s) en attente d'envoi sur cet appareil.</p>}
          <p className="petit">Avec du réseau, le dossier complet et à jour s'ouvre avec le code famille. Ce résumé suffit pour orienter la famille.</p>
        </div>
      )}
    </main>
  )
}
