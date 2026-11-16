import { useRef, useState } from 'react'
import { construireFichier, fusionner, lireFichier, nomFichier } from '../lib/cle.js'
import { lireEnvois, lireFile, nombreEnAttente, remplacerFile } from '../lib/offline.js'

/** Zones sans réseau : copier les saisies sur une clé, les charger là où il y a du réseau. */
export default function CleUsb({ agent, enLigne, onChange, synchroniser, envois }) {
  const entree = useRef(null)
  const [message, setMessage] = useState(null)
  const attente = nombreEnAttente(lireFile())

  async function exporter() {
    try {
      const texte = await construireFichier(agent)
      const lien = document.createElement('a')
      lien.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }))
      lien.download = nomFichier()
      lien.click()
      URL.revokeObjectURL(lien.href)
      setMessage({ ok: true, texte: `Fichier ${lien.download} créé : copiez-le sur la clé. Les saisies restent aussi sur ce téléphone jusqu'à leur envoi.` })
    } catch (e) { setMessage({ ok: false, texte: e.message }) }
  }

  async function charger(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    try {
      const { file, agent: de } = await lireFichier(await fichier.text())
      const { file: suite, ajoutes } = fusionner(lireFile(), file)
      remplacerFile(suite)
      onChange()
      setMessage({ ok: true, texte: ajoutes
        ? `${ajoutes} saisie(s) chargée(s)${de ? ` depuis le fichier de ${de}` : ''}. ${enLigne ? 'Envoi vers la base en cours…' : 'Elles partiront dès que ce poste aura du réseau.'}`
        : 'Rien de nouveau : ce fichier a déjà été chargé.' })
      if (ajoutes && enLigne) await synchroniser()
    } catch (err) { setMessage({ ok: false, texte: err.message }) }
  }

  const journal = envois ?? lireEnvois()
  return (
    <section className="carte" aria-labelledby="titre-cle">
      <h2 id="titre-cle">Zone sans réseau : passer par une clé USB</h2>
      <ol className="etapes-cle">
        <li><b>Au village</b> : saisissez normalement. Tout reste sur le téléphone ou l'ordinateur.</li>
        <li><b>Avant de partir</b> : « Copier sur une clé » crée un fichier à glisser sur la clé.</li>
        <li><b>Là où il y a du réseau</b> : ouvrez Fil d'Or, connectez-vous, « Charger depuis une clé ». Les données partent dans la base.</li>
      </ol>
      <div className="actions">
        <button className="bouton" type="button" onClick={exporter} disabled={attente === 0}>Copier sur une clé ({attente})</button>
        <button className="bouton secondaire" type="button" onClick={() => entree.current?.click()}>Charger depuis une clé</button>
        <input ref={entree} type="file" accept=".json,application/json" onChange={charger} hidden />
      </div>
      {message && <p className={message.ok ? 'succes' : 'erreur'} role="status">{message.texte}</p>}
      <p className="petit">Charger deux fois le même fichier ne crée rien en double. Le fichier contient des codes, jamais de nom ni d'adresse ; gardez la clé comme un carnet de santé.</p>
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
