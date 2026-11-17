import { useRef, useState } from 'react'
import { construireFichier, fusionner, lireFichier, nomFichier } from '../lib/cle.js'
import { lireEnvois, lireFile, nombreEnAttente, remplacerFile } from '../lib/offline.js'
import { dansLogiciel, ecrireSurCle, lireSurCle, useCles } from '../lib/usbLocal.js'
import { AucuneCle, CleDetectee, EtapesCle } from './EtapesCle.jsx'

const ETAPES = [
  ['Brancher la clé', 'sur cet appareil'],
  ['Copier mes saisies', 'un seul bouton'],
  ['Envoyer dans la base', 'sur un poste connecté'],
]

/** Sans réseau : copier les saisies sur une clé USB. Avec du réseau, tout part directement, la clé est inutile. */
export default function CleUsb({ agent, zone, enLigne, onChange, synchroniser, envois }) {
  const entree = useRef(null)
  const { cles } = useCles()
  const [message, setMessage] = useState(null)
  const [copie, setCopie] = useState(null)
  const file = lireFile()
  const attente = nombreEnAttente(file)
  const detail = [['saisie(s) de visite', file.visites.length], ['famille(s) inscrite(s)', file.inscriptions.length],
    ['naissance(s)', file.accouchements.length], ['déclaration(s) de naissance', file.declarations.length], ['nom(s) d’enfant', file.prenoms.length]].filter(([, n]) => n > 0)
  const etape = copie ? 3 : (dansLogiciel() ? (cles?.length ? 2 : 1) : 2)

  async function copier(cle) {
    setMessage(null)
    try {
      const nom = nomFichier()
      const texte = await construireFichier(agent, file, new Date(), zone)
      if (cle) {
        await ecrireSurCle(cle.id, nom, texte)
        setCopie({ nom, ou: `${cle.nom} (${cle.id})`, n: attente })
        return
      }
      if (window.showSaveFilePicker) {
        const h = await window.showSaveFilePicker({ suggestedName: nom, types: [{ description: 'Fichier Fil d\u2019Or', accept: { 'application/json': ['.json'] } }] })
        const w = await h.createWritable(); await w.write(texte); await w.close()
        setCopie({ nom: h.name, ou: 'l\u2019emplacement choisi', n: attente })
      } else {
        const lien = document.createElement('a')
        lien.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }))
        lien.download = nom; lien.click(); URL.revokeObjectURL(lien.href)
        setCopie({ nom, ou: 'le dossier Téléchargements : glissez-le ensuite sur la clé', n: attente })
      }
    } catch (e) { if (e.name !== 'AbortError') setMessage({ ok: false, texte: e.message }) }
  }

  async function chargerTexte(texte) {
    const { file: entrant, agent: de } = await lireFichier(texte)
    const { file: suite, ajoutes } = fusionner(lireFile(), entrant)
    remplacerFile(suite)
    onChange()
    setMessage({ ok: true, texte: ajoutes
      ? `${ajoutes} saisie(s) chargée(s)${de ? ` depuis le fichier de ${de}` : ''}. ${enLigne ? 'Envoi vers la base en cours…' : 'Elles partiront dès que ce poste aura du réseau.'}`
      : 'Rien de nouveau : ce fichier a déjà été chargé.' })
    if (ajoutes && enLigne) await synchroniser()
  }
  async function charger(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    try { await chargerTexte(await fichier.text()) } catch (err) { setMessage({ ok: false, texte: err.message }) }
  }
  async function chargerDepuisCle(cle, nom) {
    try { await chargerTexte(await lireSurCle(cle.id, nom)) } catch (err) { setMessage({ ok: false, texte: err.message }) }
  }

  const journal = envois ?? lireEnvois()
  return (
    <section className="carte cle-section" aria-labelledby="titre-cle">
      <h2 id="titre-cle">Clé USB</h2>
      <p className={`bandeau-direct ${enLigne ? 'en' : 'hors'}`} role="status">
        {enLigne
          ? 'En ligne : vos saisies partent directement dans la base. La clé ne sert que sans réseau.'
          : 'Sans réseau : vos saisies sont gardées ici. Copiez-les sur une clé pour les envoyer plus tard.'}
      </p>
      {!enLigne && (
        <>
          <EtapesCle courante={etape} etapes={ETAPES} />
          {attente === 0 ? <p className="vide-cle">Rien à copier : toutes vos saisies sont déjà envoyées.</p> : (
            <>
              <div className="ce-qui-sera-copie">
                <b>Ce qui sera copié</b>
                <ul>{detail.map(([t, n]) => <li key={t}><b>{n}</b> {t}</li>)}</ul>
              </div>
              {copie ? (
                <div className="copie-ok" role="status">
                  <b>✓ Copié sur {copie.ou}</b>
                  <p className="petit">Fichier {copie.nom}, {copie.n} saisie(s). Retirez la clé puis portez-la à l'administrateur, ou branchez-la sur un poste connecté. Vos saisies restent ici jusqu'à leur envoi.</p>
                  <button className="bouton secondaire petit-bouton" onClick={() => setCopie(null)}>Copier de nouveau</button>
                </div>
              ) : dansLogiciel() ? (
                cles?.length ? cles.map((c) => (
                  <CleDetectee key={c.id} cle={c}><button className="bouton" type="button" onClick={() => copier(c)}>Copier sur {c.id}</button></CleDetectee>
                )) : <AucuneCle />
              ) : (
                <div className="actions">
                  <button className="bouton" type="button" onClick={() => copier(null)}>Enregistrer le fichier sur la clé</button>
                  <span className="petit">{window.showSaveFilePicker ? 'Choisissez la clé dans la fenêtre (lecteur E:, F:…).' : 'Le fichier arrive dans Téléchargements : glissez-le sur la clé.'}</span>
                </div>
              )}
            </>
          )}
        </>
      )}

      <details className="charger-cle" open={!enLigne && false}>
        <summary>Charger une clé reçue</summary>
        {dansLogiciel() && cles?.some((c) => c.fichiers.length) && cles.filter((c) => c.fichiers.length).map((c) => (
          <CleDetectee key={c.id} cle={c}>
            <div className="actions">{c.fichiers.slice(0, 3).map((f) => <button key={f.nom} className="bouton secondaire petit-bouton" onClick={() => chargerDepuisCle(c, f.nom)}>Charger {f.nom.replace('fildor-cle-', '').replace('.json', '')}</button>)}</div>
          </CleDetectee>
        ))}
        <div className="actions">
          <button className="bouton secondaire" type="button" onClick={() => entree.current?.click()}>Choisir un fichier</button>
          <input ref={entree} type="file" accept=".json,application/json" onChange={charger} hidden />
        </div>
      </details>
      {message && <p className={message.ok ? 'succes' : 'erreur'} role="status">{message.texte}</p>}
      <p className="petit">Le fichier contient des codes, jamais d'adresse. Le charger deux fois ne crée aucun doublon.</p>
      {journal.length > 0 && (
        <>
          <h3>Derniers envois vers la base</h3>
          <ul className="journal-envois">
            {journal.map((j) => <li key={j.le}><span className="petit">{new Date(j.le).toLocaleString('fr-FR')}</span> {j.resume}</li>)}
          </ul>
        </>
      )}
    </section>
  )
}
