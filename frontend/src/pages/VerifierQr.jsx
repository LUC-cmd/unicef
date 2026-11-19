import { useState } from 'react'
import { api } from '../lib/api.js'
import { lireEntree, lireSuivi, verifierJeton } from '../lib/qrSuivi.js'
import { aujourdhuiIso, formaterDate } from '../lib/format.js'
import { ajouterVisite, nombreEnAttente } from '../lib/offline.js'
import LecteurQr from '../components/LecteurQr.jsx'
import Picto from '../components/Picto.jsx'

/** Noter une visite faite devant le carnet : elle est gardée sur l'appareil et part à la prochaine
 *  synchronisation (réseau ou clé USB). Aucun réseau n'est nécessaire pour la noter. */
function NoterVisite({ code, onFait }) {
  const [ouvert, setOuvert] = useState(false)
  const [poids, setPoids] = useState('')
  const [pb, setPb] = useState('')
  const [danger, setDanger] = useState(false)

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
    setOuvert(false); setPoids(''); setPb(''); setDanger(false)
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
      <div>
        <button className="bouton" type="submit">Enregistrer sur cet appareil</button>{' '}
        <button className="bouton secondaire" type="button" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
    </form>
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

  async function verifier(texte) {
    const code = String(texte ?? jeton).trim()
    if (!code) return
    setEnCours(true)
    setResultat(null)
    setNotees([])
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
