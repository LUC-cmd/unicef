import { useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { aBesoinDeZone, appliquerZone, compter, lireFichier } from '../lib/cle.js'
import { ZONES } from '../lib/format.js'
import { lireEnvois, noterEnvoi } from '../lib/offline.js'

/** Poste de réception : l'administrateur branche les clés USB, contrôle ce qu'elles contiennent, puis envoie tout dans la base. */
export default function ReceptionCles() {
  const entree = useRef(null)
  const [lots, setLots] = useState([])
  const [refus, setRefus] = useState([])
  const [zone, setZone] = useState(ZONES[0][0])
  const [envoi, setEnvoi] = useState(false)
  const [resultats, setResultats] = useState(null)
  const [journal, setJournal] = useState(() => lireEnvois())

  async function choisir(e) {
    const fichiers = [...(e.target.files ?? [])]
    e.target.value = ''
    const nouveaux = []
    const erreurs = []
    for (const f of fichiers) {
      try {
        const c = await lireFichier(await f.text())
        const nom = f.name
        if (lots.some((l) => l.nom === nom && l.creeLe === c.creeLe)) continue
        nouveaux.push({ nom, ...c })
      } catch (err) { erreurs.push(`${f.name} : ${err.message}`) }
    }
    setLots((l) => [...l, ...nouveaux])
    setRefus(erreurs)
    setResultats(null)
  }

  const besoinZone = lots.some((l) => aBesoinDeZone(l.file))
  const total = lots.reduce((n, l) => { const c = compter(l.file); return n + c.visites + c.inscriptions + c.accouchements + c.declarations }, 0)

  async function envoyer() {
    setEnvoi(true)
    const sorties = []
    for (const l of lots) {
      try {
        const r = await api.post('/api/agent/sync', appliquerZone(l.file, zone))
        sorties.push({ nom: l.nom, ok: true, r })
      } catch (err) { sorties.push({ nom: l.nom, ok: false, message: err.message }) }
    }
    const crees = sorties.filter((x) => x.ok).reduce((n, x) => n + x.r.visitesCreees + x.r.declarationsCreees + x.r.inscriptionsCreees + x.r.accouchementsCrees, 0)
    noterEnvoi({ le: new Date().toISOString(), resume: `Réception de ${lots.length} clé(s) : ${crees} saisie(s) nouvelle(s) dans la base` })
    setJournal(lireEnvois())
    setResultats(sorties)
    setLots(lots.filter((l) => !sorties.find((x) => x.nom === l.nom)?.ok))
    setEnvoi(false)
  }

  return (
    <div className="chemin-acte">
      <section className="carte">
        <h2>Recevoir les clés USB</h2>
        <ol className="etapes-cle">
          <li>Branchez la clé de l'agent sur cet ordinateur.</li>
          <li>Choisissez le ou les fichiers <b>fildor-cle-….json</b> (vous pouvez en prendre plusieurs d'un coup).</li>
          <li>Vérifiez ce qu'ils contiennent, puis envoyez : tout va dans la base. Un fichier chargé deux fois ne crée aucun doublon.</li>
        </ol>
        <div className="actions">
          <button type="button" className="bouton" onClick={() => entree.current?.click()}>Choisir les fichiers de la clé</button>
          <input ref={entree} type="file" multiple accept=".json,application/json" hidden onChange={choisir} />
        </div>
        {refus.map((t) => <p key={t} className="erreur" role="alert">{t}</p>)}
      </section>

      {lots.length > 0 && (
        <section className="carte">
          <h2>À envoyer : {total} saisie(s)</h2>
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Fichier</th><th>Agent</th><th>Créé le</th><th>Visites</th><th>Inscriptions</th><th>Naissances</th><th>Déclarations</th></tr></thead>
              <tbody>
                {lots.map((l) => { const c = compter(l.file); return (
                  <tr key={l.nom + l.creeLe}>
                    <td>{l.nom}</td><td>{l.agent || '—'}</td><td>{l.creeLe ? new Date(l.creeLe).toLocaleString('fr-FR') : '—'}</td>
                    <td>{c.visites}</td><td>{c.inscriptions}</td><td>{c.accouchements}</td><td>{c.declarations}</td>
                  </tr>
                ) })}
              </tbody>
            </table>
          </div>
          {besoinZone && (
            <label>Zone des nouvelles familles (ces fichiers ne l'indiquent pas)
              <select value={zone} onChange={(e) => setZone(e.target.value)}>
                {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </label>
          )}
          <div className="actions">
            <button type="button" className="bouton" disabled={envoi || total === 0} onClick={envoyer}>{envoi ? 'Envoi en cours…' : `Envoyer ${total} saisie(s) dans la base`}</button>
            <button type="button" className="bouton secondaire" disabled={envoi} onClick={() => setLots([])}>Vider la liste</button>
          </div>
        </section>
      )}

      {resultats && (
        <section className="carte" aria-live="polite">
          <h2>Résultat de l'envoi</h2>
          <ul className="journal-envois">
            {resultats.map((x) => x.ok ? (
              <li key={x.nom}><b>{x.nom}</b> : {x.r.visitesCreees} visite(s), {x.r.inscriptionsCreees} inscription(s), {x.r.accouchementsCrees} naissance(s), {x.r.declarationsCreees} déclaration(s) enregistrée(s)
                {x.r.visitesDejaConnues + x.r.inscriptionsDejaConnues + x.r.accouchementsDejaConnus + x.r.declarationsDejaConnues > 0 && ` (déjà connues : ${x.r.visitesDejaConnues + x.r.inscriptionsDejaConnues + x.r.accouchementsDejaConnus + x.r.declarationsDejaConnues})`}
                {x.r.inscriptions?.filter((i) => i.creee).length > 0 && <> · codes attribués : {x.r.inscriptions.filter((i) => i.creee).map((i) => `${i.codeFamille} (${i.codesEnfants.join(', ')})`).join(' ; ')}</>}
                {x.r.erreurs.length > 0 && <p className="erreur">À revoir : {x.r.erreurs.join(' ; ')}</p>}
              </li>
            ) : <li key={x.nom}><b>{x.nom}</b> : <span className="erreur">non envoyé, {x.message}</span> (rien n'est perdu, réessayez)</li>)}
          </ul>
        </section>
      )}

      {journal.length > 0 && (
        <section className="carte">
          <h2>Dernières réceptions</h2>
          <ul className="journal-envois">{journal.map((j) => <li key={j.le}><span className="petit">{new Date(j.le).toLocaleString('fr-FR')}</span> {j.resume}</li>)}</ul>
        </section>
      )}
    </div>
  )
}
