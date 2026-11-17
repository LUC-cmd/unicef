import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import Bandeau from './Bandeau.jsx'
import { Squelette } from './Chargement.jsx'
import { Anneau, Barres } from './Graphiques.jsx'
import { COULEURS, Courbe, TuileChiffre } from './Courbes.jsx'
import {
  COULEUR_MUAC, COULEUR_STATUT, MUAC, ROLES, SOURCE_DECLARATION, STATUT_DECLARATION, STATUT_RAPPEL, STATUT_RDV,
  dateHeure, libelleAction,
} from '../lib/libelles.js'

const SERVICES = [
  ['Site', "L'interface que voient les utilisateurs", null],
  ['API', 'Dossiers, rôles, rappels, synchronisation', '/actuator/health'],
  ['Base', 'PostgreSQL : toutes les données', null],
  ['Assistant', 'Répond sur les contenus, sans accès aux dossiers', '/assistant/health'],
]

async function joignable(url, accepte) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) return false
    return accepte(await r.json().catch(() => null))
  } catch { return false }
}

const fr = (n) => Number(n ?? 0).toLocaleString('fr-FR')
const parties = (liste, noms, couleurs) => (liste ?? []).map((x, i) => ({ nom: noms[x.nom] ?? x.nom, valeur: Number(x.n), couleur: couleurs?.[x.nom] ?? Object.values(COULEURS)[i % 4] }))

/** Tableau de bord de l'administrateur : toute la plateforme en un coup d'œil. */
export default function TableauAdmin() {
  const [d, setD] = useState(null)
  const [erreur, setErreur] = useState('')
  const [etats, setEtats] = useState({})

  const charger = useCallback(async () => {
    setErreur('')
    try { setD(await api.get('/api/admin/apercu')) } catch (e) { setErreur(e.message) }
    const apiOk = await joignable('/api/public/sujets', Array.isArray)
    const assistantOk = await joignable('/assistant/health', (c) => c?.statut === 'ok')
    setEtats({ Site: true, API: apiOk, Base: apiOk, Assistant: assistantOk })
  }, [])
  useEffect(() => { charger() }, [charger])

  const enService = Object.values(etats).filter(Boolean).length
  if (erreur && !d) {
    return (
      <main className="page">
        <Bandeau surtitre="Administration" titre="Tableau de bord">Vue d'ensemble de la plateforme.</Bandeau>
        <p className="erreur" role="alert">{erreur}</p>
        <button className="bouton" type="button" onClick={charger}>Réessayer</button>
      </main>
    )
  }
  if (!d) {
    return (
      <main className="page">
        <Bandeau surtitre="Administration" titre="Tableau de bord">Chargement des chiffres de la plateforme…</Bandeau>
        <Squelette />
      </main>
    )
  }

  const t = d.totaux
  const jours = d.serie.map((s) => s.jour)
  const col = (k) => d.serie.map((s) => Number(s[k]))
  const declTotal = (d.declarationsParStatut ?? []).reduce((n, x) => n + Number(x.n), 0)
  const rdv = Object.fromEntries((d.rendezVousParStatut ?? []).map((x) => [x.nom, Number(x.n)]))
  const rdvTotal = Object.values(rdv).reduce((a, b) => a + b, 0)
  const tauxRealises = rdvTotal ? Math.round(((rdv.REALISE ?? 0) / rdvTotal) * 100) : 0
  const maxZone = Math.max(1, ...(d.famillesParZone ?? []).map((z) => Number(z.n)))

  return (
    <main className="page">
      <Bandeau surtitre="Administration" titre="Tableau de bord">
        {fr(t.familles)} familles suivies · {enService} service{enService > 1 ? 's' : ''} sur 4 en marche.
      </Bandeau>

      <div className="grille-tuiles">
        <TuileChiffre libelle="Familles suivies" valeur={fr(t.familles)} serie={col('inscriptions')} couleur={COULEURS.cyan} aide={`${col('inscriptions').reduce((a, b) => a + b, 0)} inscrites sur 30 jours`} />
        <TuileChiffre libelle="Enfants de moins de 5 ans" valeur={fr(t.enfants)} aide={`et ${fr(t.grossesses)} grossesses suivies`} />
        <TuileChiffre libelle="Visites enregistrées" valeur={fr(t.visites)} serie={col('visites')} couleur={COULEURS.bleu} />
        <TuileChiffre libelle="Déclarations de naissance" valeur={fr(t.declarations)} serie={col('declarations')} couleur={COULEURS.orange} />
        <TuileChiffre libelle="Rendez-vous réalisés" valeur={`${tauxRealises} %`} aide={`${fr(rdv.REALISE ?? 0)} sur ${fr(rdvTotal)} rendez-vous`} />
        <TuileChiffre libelle="Connexions (24 h)" valeur={fr(t.acces24h)} serie={col('acces')} couleur={COULEURS.violet} aide={`${fr(t.utilisateurs)} comptes actifs`} />
      </div>

      <div className="grille-large">
        <section className="carte">
          <Courbe titre="Activité des 30 derniers jours" jours={jours} series={[
            { nom: 'Visites', valeurs: col('visites'), couleur: COULEURS.bleu },
            { nom: 'Inscriptions de familles', valeurs: col('inscriptions'), couleur: COULEURS.cyan },
            { nom: 'Déclarations de naissance', valeurs: col('declarations'), couleur: COULEURS.orange },
          ]} />
        </section>
        <section className="carte">
          <h2>État de la plateforme</h2>
          <ul className="etat-liste">
            {SERVICES.map(([nom, detail]) => {
              const ok = etats[nom]
              return (
                <li key={nom}>
                  <span className={`pastille ${ok === undefined ? 'attente' : ok ? 'ok' : 'ko'}`} aria-hidden="true" />
                  <div><b>{nom}</b> <span className="petit">{ok === undefined ? 'vérification…' : ok ? 'en service' : 'arrêté'}</span><small>{detail}</small></div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="titre-section"><h2>Où en sont les familles ?</h2></div>
      <div className="grille-trois">
        <section className="carte"><Anneau titre="Déclarations de naissance" centre={declTotal} parts={parties(d.declarationsParStatut, STATUT_DECLARATION, COULEUR_STATUT)} /></section>
        <section className="carte"><Anneau titre="Mesure du bras (MUAC), toutes visites" parts={parties(d.muac, MUAC, COULEUR_MUAC)} /></section>
        <section className="carte"><Anneau titre="Rendez-vous" centre={`${tauxRealises} %`} parts={parties(d.rendezVousParStatut, STATUT_RDV, { PLANIFIE: COULEURS.cyan, REALISE: '#00833D', MANQUE: '#E2231A' })} /></section>
      </div>

      <div className="grille-trois">
        <section className="carte">
          <Barres titre="Familles par zone" max={maxZone} items={(d.famillesParZone ?? []).map((z) => ({ nom: z.nom, valeur: Number(z.n), couleur: COULEURS.cyan }))} />
        </section>
        <section className="carte">
          <Barres titre="D'où viennent les déclarations" max={Math.max(1, ...(d.declarationsParSource ?? []).map((x) => Number(x.n)))}
                  items={(d.declarationsParSource ?? []).map((x) => ({ nom: SOURCE_DECLARATION[x.nom] ?? x.nom, valeur: Number(x.n), couleur: COULEURS.bleu }))} />
        </section>
        <section className="carte">
          <Barres titre="Comptes actifs par rôle" max={Math.max(1, ...(d.utilisateursParRole ?? []).map((x) => Number(x.n)))}
                  items={(d.utilisateursParRole ?? []).map((x) => ({ nom: ROLES[x.nom] ?? x.nom, valeur: Number(x.n), couleur: COULEURS.violet }))} />
        </section>
      </div>

      <div className="grille-large">
        <section className="carte">
          <h2>Dernières actions sur la plateforme</h2>
          <ul className="journal-flux">
            {(d.derniersEvenements ?? []).map((e, i) => (
              <li key={i}><time>{dateHeure(e.le).split(' ').slice(-1)[0]}</time><span><b>{libelleAction(e.action)}</b> <small>par {e.username}</small></span></li>
            ))}
          </ul>
        </section>
        <section className="carte">
          <Barres titre="Actions les plus fréquentes (14 jours)" max={Math.max(1, ...(d.actionsFrequentes ?? []).map((x) => Number(x.n)))}
                  items={(d.actionsFrequentes ?? []).map((x) => ({ nom: libelleAction(x.nom), valeur: Number(x.n), couleur: COULEURS.cyan }))} />
        </section>
      </div>
    </main>
  )
}
