import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { Squelette } from './Chargement.jsx'
import { LIBELLE_LANGUE } from '../lib/format.js'

const NOMS = {
  RAPPEL_RDV: ['Rappel de rendez-vous', 'Envoyé 2 jours avant un rendez-vous'],
  RAPPEL_MANQUE: ['Rendez-vous manqué', 'Envoyé quand la famille n’est pas venue'],
  JEU_SEMAINE: ['Jeu de la semaine', 'Un jeu d’éveil à faire à la maison'],
  ACTE_PRET: ['Acte de naissance prêt', 'Envoyé quand l’état civil a validé'],
  NOM_ENFANT: ['Donner le nom de l’enfant', 'Envoyé au 8e jour de l’enfant'],
}
const LANGUES = ['ewe', 'kabye', 'tem']
const VARIABLES = '{date} {libelle} {titre} {consigne}'

function Editeur({ code, langue, modele, fr, apres }) {
  const [texte, setTexte] = useState(modele?.texte ?? '')
  const [valide, setValide] = useState(modele ? !modele.aValider : false)
  const [enCours, setEnCours] = useState(false)
  useEffect(() => { setTexte(modele?.texte ?? ''); setValide(modele ? !modele.aValider : false) }, [modele])
  const etat = !modele ? 'vide' : modele.aValider ? 'attente' : 'ok'
  async function enregistrer() {
    setEnCours(true)
    try { await api.put(`/api/admin/modeles/${code}/${langue}`, { texte: texte.trim(), valide }); apres() } catch { /* retour affiché */ } finally { setEnCours(false) }
  }
  return (
    <div className={`editeur-langue ${etat}`}>
      <div className="editeur-tete">
        <b>{LIBELLE_LANGUE[langue]}</b>
        <span className={`badge ${etat === 'ok' ? 'role-agent' : etat === 'attente' ? 'source-hop' : ''}`}>{etat === 'ok' ? 'Validé : part chez les familles' : etat === 'attente' ? 'À valider' : 'Pas encore traduit'}</span>
      </div>
      <textarea rows="3" maxLength={400} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={`Écrire le message en ${LIBELLE_LANGUE[langue]}…`} aria-label={`Message en ${LIBELLE_LANGUE[langue]}`} />
      <div className="editeur-pied">
        <label className="case"><input type="checkbox" checked={valide} onChange={(e) => setValide(e.target.checked)} /> Relu et validé par un locuteur</label>
        <button type="button" className="bouton petit-bouton" disabled={enCours || texte.trim().length < 5 || texte === fr} onClick={enregistrer}>Enregistrer</button>
      </div>
    </div>
  )
}

/** Messages envoyés aux familles : le français, et la traduction dans chaque langue, à faire écrire et relire par des locuteurs. */
export default function ModelesMessages() {
  const [modeles, setModeles] = useState(null)
  const [choisi, setChoisi] = useState('RAPPEL_RDV')
  const charger = useCallback(() => api.get('/api/admin/modeles').then(setModeles).catch(() => setModeles([])), [])
  useEffect(() => { charger() }, [charger])
  if (!modeles) return <Squelette tuiles={3} cartes={1} />
  const trouve = (code, langue) => modeles.find((m) => m.code === code && m.langue === langue)
  const codes = Object.keys(NOMS).filter((c) => trouve(c, 'fr'))
  const validees = (langue) => codes.filter((c) => trouve(c, langue) && !trouve(c, langue).aValider).length

  return (
    <>
      <div className="grille-tuiles langues-progres">
        {LANGUES.map((l) => (
          <div key={l} className="tuile-chiffre">
            <div className="tuile-texte">
              <span className="tuile-libelle">{LIBELLE_LANGUE[l]}</span>
              <b className="tuile-valeur">{validees(l)} / {codes.length}</b>
              <span className="tuile-aide">messages validés</span>
            </div>
            <div className="progres" role="img" aria-label={`${validees(l)} sur ${codes.length}`}><i style={{ width: `${(100 * validees(l)) / Math.max(1, codes.length)}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="deux-colonnes langues">
        <nav className="carte liste-messages" aria-label="Messages">
          {codes.map((c) => (
            <button key={c} type="button" className={choisi === c ? 'actif' : ''} onClick={() => setChoisi(c)}>
              <b>{NOMS[c][0]}</b><span>{NOMS[c][1]}</span>
            </button>
          ))}
        </nav>
        <section>
          <div className="carte">
            <p className="petit">Français (modèle)</p>
            <div className="apercu-sms"><p>{trouve(choisi, 'fr')?.texte}</p></div>
            <p className="petit">Variables à garder telles quelles : {VARIABLES}</p>
          </div>
          {LANGUES.map((l) => <Editeur key={`${choisi}-${l}`} code={choisi} langue={l} modele={trouve(choisi, l)} fr={trouve(choisi, 'fr')?.texte} apres={charger} />)}
        </section>
      </div>
    </>
  )
}
