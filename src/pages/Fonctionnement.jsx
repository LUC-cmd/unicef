import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { api } from '../lib/api.js'
import { JAMAIS_ENREGISTRE, ROLES } from '../lib/roles.js'
import { formaterDate } from '../lib/format.js'

const ETAPES_NAISSANCE = [
  { qui: 'Grossesse', titre: 'Premières consultations', texte: 'L’agent inscrit la femme enceinte. Avec son accord : pièce, nom du mari, nationalité.' },
  { qui: 'Naissance', titre: 'Au centre ou à la maison', texte: 'Le certificat d’accouchement est remis. L’enfant existe dans le système dès le premier jour.' },
  { qui: 'Agent de santé', titre: 'Il déclare la naissance', texte: 'Date, lieu, certificat. Cela marche sans réseau : la saisie part au retour du réseau.' },
  { qui: 'Jour 8', titre: 'Le nom de l’enfant', texte: 'La famille donne le nom ; l’agent le saisit, même sans réseau. Il complète le dossier.' },
  { qui: 'État civil', titre: 'Il valide à distance', texte: 'Il voit le dossier, valide ou rejette en disant ce qui manque.' },
  { qui: 'Famille', titre: 'Un SMS avec la preuve', texte: 'Numéro de reçu et code, à garder ou à faire vérifier sur ce site.' },
  { qui: 'État civil', titre: 'Acte, puis nationalité', texte: 'La validation ouvre le dossier de nationalité : pièces, dépôt, reconnaissance. Même sans papiers.' },
]

const RESULTATS = {
  VALIDEE: { classe: 'valide', titre: 'Déclaration validée par la mairie' },
  ENVOYEE: { classe: 'attente', titre: 'Déclaration reçue, en cours de traitement' },
  REJETEE: { classe: 'refus', titre: 'Déclaration non validée' },
}

function moisLisible(aaaaMm) {
  const [a, m] = aaaaMm.split('-')
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${noms[Number(m) - 1] ?? m} ${a}`
}

export function Verification() {
  const [numero, setNumero] = useState('')
  const [code, setCode] = useState('')
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)

  async function verifier(e) {
    e.preventDefault()
    setErreur('')
    setResultat(null)
    setAttente(true)
    try {
      setResultat(await api.post('/api/public/preuve', { numero: numero.trim(), code: code.trim() }))
    } catch (err) {
      setErreur(err.statut === 404 || err.statut === 405
        ? 'Le service de vérification n’est pas encore disponible sur ce serveur.'
        : err.message)
    } finally {
      setAttente(false)
    }
  }

  const r = resultat && RESULTATS[resultat.statut]

  return (
    <div className="deux-colonnes verif">
      <form className="carte" onSubmit={verifier}>
        <h3>Vérifier une preuve de naissance</h3>
        <p className="petit">Saisissez le numéro de reçu et le code reçus par SMS. Le résultat ne montre jamais de nom.</p>
        <label>Numéro de reçu
          <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="FDO-20261115-000012" autoCapitalize="characters" required />
        </label>
        <label>Code de vérification
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 caractères" autoCapitalize="characters" maxLength="12" />
        </label>
        <button className="bouton" disabled={attente}>{attente ? 'Vérification…' : 'Vérifier'}</button>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
      </form>

      <div className="carte" aria-live="polite">
        {!resultat && !erreur && (
          <>
            <h3>Ce que montre le résultat</h3>
            <ul className="liste-coches">
              <li>L’état de la déclaration : reçue, validée ou non validée</li>
              <li>La zone et le mois de naissance, si le code est correct</li>
              <li>La date de validation par la mairie</li>
            </ul>
            <p className="petit">Pour essayer : connectez-vous comme agent d’état civil, validez une déclaration, puis copiez le numéro et le code affichés.</p>
          </>
        )}
        {resultat && (
          <div className={`verdict ${r ? r.classe : 'inconnu'}`} role="status">
            <h3>{r ? r.titre : 'Aucune déclaration trouvée'}</h3>
            {!r && <p>Ce numéro de reçu n’existe pas. Vérifiez la saisie, ou demandez à l’agent de santé de vous le relire.</p>}
            {r && (
              <dl>
                <div><dt>Numéro de reçu</dt><dd>{resultat.numero}</dd></div>
                {resultat.verifiee ? (
                  <>
                    <div><dt>Code de vérification</dt><dd>Correct</dd></div>
                    {resultat.zone && <div><dt>Zone</dt><dd>{resultat.zone}</dd></div>}
                    {resultat.naissance && <div><dt>Naissance</dt><dd>{moisLisible(resultat.naissance)}</dd></div>}
                    {resultat.valideeLe && <div><dt>Validée le</dt><dd>{formaterDate(resultat.valideeLe)}</dd></div>}
                  </>
                ) : (
                  <div><dt>Code de vérification</dt><dd>{code.trim() ? 'Incorrect' : 'Non saisi : les détails restent masqués'}</dd></div>
                )}
              </dl>
            )}
            {resultat.message && <p className="petit">{resultat.message}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

const ORDRE_ROLES = ['FAMILLE', 'AGENT', 'MAIRIE', 'STRUCTURE', 'DECIDEUR', 'ADMIN']

export default function Fonctionnement() {
  return (
    <>
      <Bandeau surtitre="Fonctionnement" titre="Comment ça marche, de la naissance au tableau de bord">
        La naissance d’un enfant, ce que chaque personne fait dans Fil d’Or, et le chemin des données du téléphone de l’agent jusqu’au tableau de bord.
      </Bandeau>

      <main className="page">
        <nav className="ancres ancres-page barre-ancres" aria-label="Sur cette page">
          <a href="#naissance">De la naissance à la preuve</a>
          <a href="#sms">Envoi par téléphone</a>
          <a href="#verifier">Vérifier une preuve</a>
          <a href="#roles">Qui fait quoi</a>
          <a href="#donnees">Où vont les données</a>
        </nav>

        <section id="naissance" className="bloc-page">
          <h2>De la naissance à la preuve</h2>
          <p className="chapeau-page">
            De la grossesse à la nationalité, étape par étape.
          </p>
          <ol className="frise-etapes">
            {ETAPES_NAISSANCE.map((e) => (
              <li key={e.titre}>
                <span className="frise-qui">{e.qui}</span>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
              </li>
            ))}
          </ol>
          <div className="carte attention">
            <h3>Si les parents n’ont pas de papiers</h3>
            <p>La déclaration part quand même. Le dossier de nationalité s’ouvre alors sur la voie « parents sans papiers » : attestation du chef de quartier, témoins, jugement supplétif si besoin.</p>
            <p className="petit">Listes de pièces provisoires, à confirmer avec l’état civil et la justice avant le pilote.</p>
          </div>
        </section>

        <section id="sms" className="bloc-page">
          <h2>Envoi par téléphone</h2>
          <div className="deux-colonnes">
            <div className="carte">
              <h3>Quand la mairie valide</h3>
              <p>Un SMS part vers la famille : numéro de reçu et code. Sans téléphone, l’agent lit le résultat sur la fiche et le lui donne.</p>
            </div>
            <div className="carte">
              <h3>Dans la démonstration</h3>
              <p>Les SMS sont simulés : voyez-les dans le <Link to="/telephone">simulateur de téléphone</Link>.</p>
              <p className="petit">Un vrai envoi passera par une passerelle SMS d’opérateur, à confirmer.</p>
            </div>
          </div>
        </section>

        <section id="verifier" className="bloc-page">
          <h2>Vérifier une preuve</h2>
          <p className="chapeau-page">Un guichet, un employeur ou la famille elle-même peut contrôler qu’un reçu est authentique, sans rien révéler de personnel.</p>
          <Verification />
        </section>

        <section id="roles" className="bloc-page">
          <h2>Qui fait quoi</h2>
          <p className="chapeau-page">Chaque rôle a son espace, ses données et ses limites. Voici, pour chacun, quand il se connecte, ce qu’il enregistre, ce qu’il voit et comment ses données partent.</p>
          <div className="roles-grille">
            {ORDRE_ROLES.map((k) => {
              const r = ROLES[k]
              return (
                <article className="carte role" key={k}>
                  <h3>{r.titre}</h3>
                  <p className="petit">{r.qui}</p>
                  <h4>Quand il s’y connecte</h4>
                  <p>{r.connexion}</p>
                  <h4>Ce qu’il enregistre</h4>
                  <ul className="liste-coches">{r.saisit.map((t) => <li key={t}>{t}</li>)}</ul>
                  <h4>Ce qu’il voit</h4>
                  <ul className="liste-coches">{r.voit.map((t) => <li key={t}>{t}</li>)}</ul>
                  <h4>Comment partent les données</h4>
                  <p>{r.envoi}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="donnees" className="bloc-page">
          <h2>Où vont les données</h2>
          <p className="chapeau-page">Du téléphone de l’agent au tableau de bord, en quatre temps.</p>
          <div className="chemin">
            <div className="chemin-etape">
              <b>1. Saisie</b>
              <span>L’agent saisit sur son téléphone. Sans réseau, la saisie attend dans le téléphone.</span>
            </div>
            <div className="chemin-fleche" aria-hidden="true">›</div>
            <div className="chemin-etape">
              <b>2. Serveur</b>
              <span>Au retour du réseau, tout part une seule fois. Le serveur vérifie le rôle et la zone de la personne.</span>
            </div>
            <div className="chemin-fleche" aria-hidden="true">›</div>
            <div className="chemin-etape">
              <b>3. Base de données</b>
              <span>Seul le serveur lit et écrit. Chaque consultation de dossier est inscrite dans un journal.</span>
            </div>
            <div className="chemin-fleche" aria-hidden="true">›</div>
            <div className="chemin-etape">
              <b>4. Tableaux de bord</b>
              <span>Chaque rôle voit sa part : l’agent sa zone, la mairie les déclarations, le responsable des taux par zone.</span>
            </div>
          </div>
          <div className="deux-colonnes">
            <div className="carte">
              <h3>L’assistant ne lit pas la base</h3>
              <p>Le service assistant répond seulement à partir des contenus déjà écrits pour les familles. Il ne voit ni dossier, ni nom, ni numéro.</p>
            </div>
            <div className="carte">
              <h3>Jamais enregistré</h3>
              <ul className="liste-coches non">{JAMAIS_ENREGISTRE.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
