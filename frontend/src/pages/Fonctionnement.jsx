import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { api } from '../lib/api.js'
import { JAMAIS_ENREGISTRE, ROLES } from '../lib/roles.js'
import { formaterDate } from '../lib/format.js'

const ETAPES_NAISSANCE = [
  {
    qui: 'Avant la naissance',
    titre: 'La grossesse est déjà suivie',
    texte: 'L’agent inscrit la femme enceinte avec un code, sans nom. Les consultations prénatales sont planifiées et rappelées par SMS ou par voix.',
  },
  {
    qui: 'Le jour de la naissance',
    titre: 'Au centre de santé ou à la maison',
    texte: 'Au centre de santé, le soignant remet le certificat d’accouchement. À la maison, c’est l’accoucheuse ou l’agent qui constate. Dans les deux cas l’enfant existe pour le système dès le premier jour.',
  },
  {
    qui: 'Agent de santé',
    titre: 'Il enregistre la naissance',
    texte: 'Il saisit la date, le lieu (centre de santé ou domicile) et note si le certificat d’accouchement a été vu. Cela marche sans réseau : la saisie part au retour du réseau.',
  },
  {
    qui: 'Automatique',
    titre: 'Un reçu horodaté est créé',
    texte: 'Chaque déclaration reçoit un numéro de reçu unique, de la forme FDO-date-numéro. C’est la preuve que la déclaration a été envoyée, à la date indiquée.',
  },
  {
    qui: 'État civil',
    titre: 'La mairie valide à distance',
    texte: 'Elle voit le dossier pré-rempli, sans nom ni adresse. Elle valide, ou rejette en disant ce qui manque. Le motif est obligatoire pour que l’agent sache quoi corriger.',
  },
  {
    qui: 'Famille',
    titre: 'Un SMS apporte la preuve',
    texte: 'La famille reçoit le numéro de reçu et un code de vérification. Elle peut les garder, les montrer au guichet, ou les faire contrôler sur cette page.',
  },
  {
    qui: 'État civil',
    titre: 'Acte de naissance, puis la suite',
    texte: 'L’acte est délivré par l’état civil : gratuit si la naissance est déclarée dans les 45 jours, jugement supplétif à 6 000 FCFA au-delà. Les pièces d’identité et la nationalité viennent ensuite et relèvent de l’état civil.',
  },
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

function Verification() {
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
        <nav className="ancres ancres-page" aria-label="Sur cette page">
          <a href="#naissance">De la naissance à la preuve</a>
          <a href="#sms">Envoi par téléphone</a>
          <a href="#verifier">Vérifier une preuve</a>
          <a href="#roles">Qui fait quoi</a>
          <a href="#donnees">Où vont les données</a>
        </nav>

        <section id="naissance" className="bloc-page">
          <h2>De la naissance à la preuve</h2>
          <p className="chapeau-page">
            Avant de parler de nationalité, il faut que la naissance soit enregistrée et qu’il en reste une trace sûre. Voici le chemin, étape par étape.
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
            <p>
              Fil d’Or n’exige aucune pièce des parents pour envoyer la déclaration : elle part dans tous les cas, avec la date, le lieu et la mention du certificat d’accouchement.
              Si la mairie a besoin d’autre chose, elle le dit dans le motif de rejet et l’agent de santé accompagne la famille jusqu’à la correction.
              L’identité (noms, filiation) est recueillie par l’officier d’état civil au guichet : Fil d’Or ne la garde pas.
            </p>
            <p className="petit">
              Fil d’Or ne donne ni acte de naissance ni nationalité. Ce que le droit exige pour un enfant dont les parents n’ont pas de papiers reste à confirmer avec l’état civil et un juriste avant le pilote.
            </p>
          </div>
        </section>

        <section id="sms" className="bloc-page">
          <h2>Envoi par téléphone</h2>
          <div className="deux-colonnes">
            <div className="carte">
              <h3>Quand il y a du réseau</h3>
              <p>
                La mairie valide, et un SMS part vers le téléphone de la famille : numéro de reçu, code de vérification, et la mention
                « ce message n’est pas l’acte de naissance ». Si la famille n’a pas de téléphone, l’agent voit le résultat et le numéro de reçu sur la fiche de l’enfant, et les lui communique.
              </p>
              <p>La mairie voit aussi le numéro et le code au moment de la validation : elle peut les lire à la famille, ou les écrire sur le carnet.</p>
            </div>
            <div className="carte">
              <h3>Ce que fait la démonstration</h3>
              <p>Les SMS sont simulés : ils s’écrivent dans la base et s’affichent dans le <Link to="/telephone">simulateur de téléphone</Link>, onglet Messages.</p>
              <p className="petit">
                Un vrai envoi demande une passerelle SMS d’un opérateur, comme le paiement mobile du dossier : c’est à confirmer avec lui.
                Le numéro de la famille n’est conservé que sous forme chiffrée.
              </p>
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
              <h3>Ce qui n’est jamais enregistré</h3>
              <ul className="liste-coches non">{JAMAIS_ENREGISTRE.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
