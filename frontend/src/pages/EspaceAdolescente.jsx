import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import QrCode from '../components/QrCode.jsx'
import { creerCartePerso, lireCartePerso, QUOTA_PERSO } from '../lib/cartePerso.js'
import { PRODUITS, formater, lienQrCarte } from '../lib/borne.js'
import { analyserCycles } from '../lib/parcours.js'
import { METHODES, SIGNES_GROSSESSE, ajouterJours, ecartJours, ecrireEspace, effacerEspace, lireCycle, lireEspace, lireGrossesse, lireSignesGrossesse, phaseCycle } from '../lib/adolescente.js'

const ONGLETS = [['cycle', 'Mon cycle'], ['proteger', 'Me protéger'], ['enceinte', 'Si je suis enceinte'], ['grossesse', 'Ma grossesse'], ['apres', 'Après la naissance']]
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const aujourdhui = () => new Date().toISOString().slice(0, 10)
const jolie = (d) => { const [a, m, j] = d.split('-').map(Number); return `${j} ${MOIS[m - 1]}${a !== new Date().getUTCFullYear() ? ` ${a}` : ''}` }

/** Une catégorie par jour : R règles, F période où une grossesse est possible, O ovulation estimée. */
function categorie(jour, debut, duree) {
  if (!debut) return ''
  const n = ecartJours(debut, jour)
  if (n < 0) return ''
  const rang = n % duree
  const ov = duree - 14
  if (rang < 5) return 'R'
  if (rang === ov - 1) return 'O'
  if (rang >= ov - 6 && rang <= ov) return 'F'
  return ''
}

function Calendrier({ annee, mois, debut, duree, aujourd }) {
  const premier = new Date(Date.UTC(annee, mois, 1))
  const decalage = (premier.getUTCDay() + 6) % 7
  const nb = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate()
  const cases = []
  for (let i = 0; i < decalage; i++) cases.push(null)
  for (let j = 1; j <= nb; j++) cases.push(`${annee}-${String(mois + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`)
  return (
    <div className="ado-mois">
      <h3>{MOIS[mois]} {annee}</h3>
      <div className="ado-cal" role="grid" aria-label={`Calendrier ${MOIS[mois]} ${annee}`}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => <span key={i} className="ado-j" aria-hidden="true">{l}</span>)}
        {cases.map((d, i) => {
          if (!d) return <span key={i} />
          const c = categorie(d, debut, duree)
          return <span key={i} className={`ado-d ${c ? `ado-${c}` : ''} ${d === aujourd ? 'ado-auj' : ''}`} title={c === 'R' ? 'Règles probables' : c === 'F' ? 'Grossesse possible' : c === 'O' ? 'Ovulation estimée' : ''}>{Number(d.slice(8))}{c && <i aria-hidden="true">{c}</i>}</span>
        })}
      </div>
    </div>
  )
}

function Historique({ e, maj }) {
  const [nouv, setNouv] = useState('')
  const liste = [...new Set([...(e.historique ?? []), ...(e.debut ? [e.debut] : [])])].sort()
  const a = analyserCycles(liste)
  const ajouter = () => { if (nouv) { maj({ historique: [...new Set([...(e.historique ?? []), nouv])].sort() }); setNouv('') } }
  const retirer = (d) => maj({ historique: (e.historique ?? []).filter((x) => x !== d) })
  return (
    <section className="carte">
      <h2>Mes règles sur plusieurs mois</h2>
      <p>Note le premier jour de chaque période. Avec 3 mois ou plus, je calcule la durée de tes cycles et je te dis quand en parler à une agente de santé.</p>
      <div className="ado-champs"><label>Premier jour d’une période<input type="date" max={new Date().toISOString().slice(0, 10)} value={nouv} onChange={(ev) => setNouv(ev.target.value)} /></label></div>
      <p><button type="button" className="bouton secondaire" onClick={ajouter}>Ajouter cette date</button></p>
      {liste.length > 0 && <ul className="liste-coches">{liste.map((d, i) => <li key={d}>{d}{i > 0 ? ` · cycle de ${a.longueurs?.[i - 1]} jours` : ''}{(e.historique ?? []).includes(d) && <> <button type="button" className="bouton secondaire petit-bouton" onClick={() => retirer(d)}>Retirer</button></>}</li>)}</ul>}
      {a.nb > 0 && <ResultatSoins niveau={a.niveau} titre={a.nb < 3 && a.niveau === 'bon' ? 'Continue de noter' : 'Ce que je constate'} texte={a.message} />}
    </section>
  )
}

function Cycle({ e, maj, onEnceinte }) {
  const auj = aujourdhui()
  const duree = Number(e.duree)
  const cycle = e.debut ? lireCycle({ debut: e.debut, duree }) : null
  const phase = cycle?.fiable ? phaseCycle(cycle, auj, duree, e.debut) : null
  const retard = cycle?.fiable ? ecartJours(ajouterJours(e.debut, duree), auj) : 0
  const d = new Date()
  return (
    <>
      <section className="carte">
        <h2>Connaître mon cycle</h2>
        <p>Le premier jour de tes règles est le jour 1 du cycle. Entre deux règles, il se passe en général 21 à 35 jours. Chez les adolescentes, c’est souvent irrégulier, et c’est normal.</p>
        <div className="ado-champs">
          <label>Premier jour de mes dernières règles<input type="date" max={auj} value={e.debut} onChange={(ev) => maj({ debut: ev.target.value })} /></label>
          <label>Durée habituelle de mon cycle, en jours<input type="number" inputMode="numeric" min="15" max="60" value={e.duree} onChange={(ev) => maj({ duree: ev.target.value })} /></label>
        </div>
      </section>
      {cycle && !cycle.fiable && <ResultatSoins niveau={cycle.niveau} titre={cycle.titre} texte={cycle.texte} />}
      {cycle?.fiable && (
        <>
          {retard >= 7 && <ResultatSoins niveau="signaler" titre="Tes règles ont du retard" texte="Une grossesse est possible. Va au centre de santé pour faire un test, sans attendre : plus tôt, mieux c’est pour toi. C’est confidentiel." >
            <button type="button" className="bouton" onClick={onEnceinte}>Que faire si je suis enceinte</button>
          </ResultatSoins>}
          {phase && <section className="carte ado-phase"><b>Aujourd’hui : jour {phase.jour} de mon cycle</b><p><b>{phase.nom}.</b> {phase.texte}</p></section>}
          <section className="carte">
            <h2>Mon calendrier</h2>
            <p className="ado-legende"><span><i className="ado-R">R</i> règles probables</span><span><i className="ado-F">F</i> une grossesse est possible</span><span><i className="ado-O">O</i> ovulation estimée</span></p>
            <div className="ado-mois-liste">
              <Calendrier annee={d.getUTCFullYear()} mois={d.getUTCMonth()} debut={e.debut} duree={duree} aujourd={auj} />
              <Calendrier annee={d.getUTCMonth() === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()} mois={(d.getUTCMonth() + 1) % 12} debut={e.debut} duree={duree} aujourd={auj} />
            </div>
            <p>Prochaines règles attendues vers le <b>{jolie(cycle.prochaines[0])}</b>. Ovulation estimée vers le <b>{jolie(cycle.ovulation)}</b>.</p>
          </section>
        </>
      )}
      <Historique e={e} maj={maj} />
      <ResultatSoins niveau="signaler" titre="Ce calendrier ne protège pas d’une grossesse" texte="C’est une estimation : l’ovulation peut se décaler d’un mois à l’autre, surtout à ton âge. Pour éviter une grossesse, il faut une méthode de protection. Voir l’onglet « Me protéger »." />
      <p className="petit">Repères courants, à faire valider par un professionnel de santé. Ce n’est pas un diagnostic.</p>
    </>
  )
}

function MaCarte() {
  const [code, setCode] = useState(lireCartePerso)
  return (
    <section className="carte ma-carte">
      <h2>Ma carte Fil d’Or</h2>
      <p>C’est mon numéro personnel. Il est sur mon téléphone, personne d’autre ne le connaît. À la borne, je le tape ou je montre son QR code : les produits sortent, sans nom ni question.</p>
      {code ? (
        <div className="ma-carte-corps">
          <div><p className="be-code" aria-label="Mon numéro">{formater(code)}</p>
            <p className="petit">Droits de ma carte : {Object.entries(QUOTA_PERSO).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${PRODUITS[k].toLowerCase()}`).join(', ')}. Démonstration fictive.</p>
            <p><Link className="bouton" to="/borne">Aller à la borne</Link></p></div>
          <QrCode valeur={lienQrCarte(code)} taille={140} titre="QR code de ma carte" />
        </div>
      ) : <button type="button" className="bouton" onClick={() => setCode(creerCartePerso())}>Obtenir ma carte</button>}
    </section>
  )
}

function Proteger() {
  return (
    <>
      <MaCarte />
      <section className="carte">
        <h2>Choisir quand avoir un enfant</h2>
        <p>Tu as le droit de poser toutes tes questions à une agente de santé, sans jugement. Tu peux demander à lui parler seule. Personne ne doit te forcer à un rapport sexuel ni à une grossesse. En cas de pression ou de violence : <Link to="/signalement">qui prévenir</Link>.</p>
      </section>
      <section className="carte">
        <h2>Comment Fil d’Or m’aide</h2>
        <ul className="liste-coches">
          <li>Sur mon téléphone : je note mes règles, je comprends mon cycle et je lis les méthodes, en privé.</li>
          <li>À la borne du village : je retire des produits avec une carte à gratter que seule moi connais, et je peux poser mes questions.</li>
          <li>Sans smartphone : le menu SMS et la boîte à questions anonyme. <Link to="/sms">Les essayer</Link>.</li>
        </ul>
        <p>Voir la <Link to="/borne">borne en 3D</Link>.</p>
      </section>
      <section className="ado-methodes">
        {METHODES.map((m) => <article className="carte" key={m.nom}><h3>{m.nom}</h3><p>{m.texte}</p></article>)}
      </section>
      <section className="carte">
        <h2>Comment choisir</h2>
        <ul className="liste-coches">
          <li>Une agente de santé t’explique chaque méthode et t’aide à choisir celle qui te convient.</li>
          <li>Le préservatif peut s’utiliser avec une autre méthode : il protège aussi des infections.</li>
          <li>Pose-lui toutes tes questions : effets, durée, que faire en cas d’oubli.</li>
        </ul>
        <p><Link className="bouton" to="/annuaire">Trouver un centre de santé</Link></p>
      </section>
      <p className="petit">Informations générales, à faire valider par un professionnel de santé. Elles ne remplacent pas une consultation.</p>
    </>
  )
}

const ETAPES = [
  ['Un doute ou un retard de règles', 'Va au centre de santé pour un test de grossesse. Tu peux y aller avec une personne de confiance. Plus tôt tu vas, plus tu es protégée.'],
  ['Parler à une personne de confiance', 'Une tante, une sœur, une enseignante, une agente de santé. Tu n’as pas à porter cela seule.'],
  ['Commencer les consultations', 'Le suivi renforcé commence dès la première consultation : prise de tension, poids, analyses, fer et acide folique, conseils de nutrition.'],
  ['Rester à l’école', 'Une fille enceinte ou jeune mère garde le droit d’étudier. Le centre social aide à organiser la suite. Ne pas arrêter sans en parler.'],
  ['Préparer l’accouchement', 'Choisir un centre de santé où accoucher, prévoir le transport et la personne qui t’accompagne. L’onglet « Ma grossesse » contient ta fiche.'],
  ['Après la naissance', 'Visite à 48 heures, vaccins du bébé, déclaration de naissance, et un choix de protection pour décider quand avoir un autre enfant.'],
]
function Enceinte() {
  return (
    <>
      <section className="carte"><h2>Si je suis enceinte, que faire, étape par étape</h2>
        <ol className="ado-etapes">{ETAPES.map(([t, x], i) => <li key={t}><span>{i + 1}</span><div><b>{t}</b><p>{x}</p></div></li>)}</ol>
      </section>
      <p><Link className="bouton" to="/annuaire">Trouver un centre de santé ou un centre social</Link></p>
      <p className="petit">Parcours de repère, à faire valider par un professionnel de santé et de la protection de l’enfance avant diffusion.</p>
    </>
  )
}

function Grossesse({ e, maj }) {
  const auj = aujourdhui()
  const age = e.age === '' ? undefined : Number(e.age)
  const g = e.dr ? lireGrossesse({ dernieresRegles: e.dr, auJour: auj, age }) : null
  const [signes, setSignes] = useState([])
  const bascule = (id) => setSignes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const plan = e.plan
  const majPlan = (p) => maj({ plan: { ...plan, ...p } })
  return (
    <>
      <section className="carte">
        <h2>Où j’en suis</h2>
        <div className="ado-champs">
          <label>Premier jour de mes dernières règles<input type="date" max={auj} value={e.dr} onChange={(ev) => maj({ dr: ev.target.value })} /></label>
          <label>Mon âge<input type="number" inputMode="numeric" min="10" max="55" value={e.age} onChange={(ev) => maj({ age: ev.target.value })} /></label>
        </div>
        {e.dr && !g && <p className="petit" role="alert">Cette date ne semble pas possible. Vérifie-la.</p>}
        <p className="petit">Ces informations restent sur ce téléphone. Elles ne sont envoyées à personne.</p>
      </section>
      {g && (
        <>
          <section className="carte ado-resume">
            <div><b>{g.semaines}</b><span>semaines{g.joursReste ? ` et ${g.joursReste} j` : ''}</span></div>
            <div><b>{g.trimestre}<sup>e</sup></b><span>trimestre</span></div>
            <div><b>{jolie(g.termePrevu)}</b><span>terme prévu</span></div>
            <div><b>{g.restant}</b><span>jours à attendre</span></div>
          </section>
          {g.suivi && g.suivi.niveau !== 'bon' && <ResultatSoins niveau={g.suivi.niveau === 'rouge' ? 'urgent' : g.suivi.niveau} titre={g.suivi.titre} texte={g.suivi.texte} />}
          <section className="carte">
            <h2>Mes consultations</h2>
            {g.prochain && <p>Prochaine consultation : <b>à partir du {jolie(g.prochain.date)}</b> (semaine {g.prochain.semaine}).</p>}
            <ul className="ado-cpn">
              {g.rendezVous.map((r) => <li key={r.semaine} className={r.passe ? 'passe' : ''}><span>Semaine {r.semaine}</span><span>{jolie(r.date)}</span><span>{r.passe ? 'à vérifier dans ton carnet' : 'à venir'}</span></li>)}
            </ul>
            <p className="petit">{g.suivi?.consultations === 'rapprochees' ? 'Calendrier renforcé pour une mère de moins de 18 ans.' : 'Calendrier de huit contacts recommandé par l’OMS.'} Le centre de santé confirme les dates.</p>
          </section>
        </>
      )}
      <section className="carte">
        <h2>Signes de danger</h2>
        <p>Coche ce que tu ressens maintenant.</p>
        <ul className="ado-signes">
          {SIGNES_GROSSESSE.map((s) => <li key={s.id}><label className="soin-case"><input type="checkbox" checked={signes.includes(s.id)} onChange={() => bascule(s.id)} /> {s.texte}</label></li>)}
        </ul>
      </section>
      <div className="resultat-bas"><ResultatSoins {...lireSignesGrossesse(signes)} /></div>
      <section className="carte">
        <h2>Mon plan d’accouchement</h2>
        <p>À préparer avant le terme, avec une personne de confiance.</p>
        <div className="ado-champs ado-plan">
          <label>Centre de santé choisi<input value={plan.centre} maxLength={80} onChange={(ev) => majPlan({ centre: ev.target.value })} /></label>
          <label>Comment j’y vais (moto, taxi, ambulance…)<input value={plan.transport} maxLength={80} onChange={(ev) => majPlan({ transport: ev.target.value })} /></label>
          <label>Qui m’accompagne<input value={plan.accompagnant} maxLength={80} onChange={(ev) => majPlan({ accompagnant: ev.target.value })} /></label>
          <label>Argent mis de côté (FCFA)<input inputMode="numeric" value={plan.argent} maxLength={10} onChange={(ev) => majPlan({ argent: ev.target.value })} /></label>
        </div>
        <label className="soin-case"><input type="checkbox" checked={plan.sac} onChange={(ev) => majPlan({ sac: ev.target.checked })} /> Mon sac est prêt : carnet de santé, vêtements du bébé, pagnes, savon</label>
        <p className="petit">Un plan rempli fait gagner du temps si le travail commence.</p>
      </section>
    </>
  )
}

function Apres() {
  return (
    <>
      <section className="carte"><h2>Les semaines après la naissance</h2>
        <ul className="liste-coches">
          <li><b>Visite dans les 48 heures</b> au centre de santé, pour toi et pour le bébé, même si tout va bien.</li>
          <li><b>Va au centre tout de suite</b> si tu saignes beaucoup, si tu as de la fièvre ou une forte douleur au ventre, ou si tu as un mal de tête violent.</li>
          <li><b>Le bébé</b> : <Link to="/famille/nouveau-ne">les signes de danger du nouveau-né</Link>.</li>
          <li><b>Vaccins du bébé et déclaration de naissance</b> : <Link to="/famille/acte">l’acte de naissance, étape par étape</Link>.</li>
          <li><b>Éviter une grossesse trop proche</b> protège ta santé. Parle d’une méthode adaptée à l’agente de santé avant de quitter le centre.</li>
          <li><b>Reprendre l’école ou un métier</b> : le centre social t’aide, et une crèche peut garder le bébé. <Link to="/famille/lieux">Crèches près de moi</Link>.</li>
          <li><b>Ton moral compte</b> : <Link to="/famille/bien-etre">deux questions pour savoir comment tu vas</Link>.</li>
        </ul>
      </section>
      <p className="petit">Repères à faire valider par un professionnel de santé.</p>
    </>
  )
}

/** Un espace privé pour les adolescentes et les jeunes mères : comprendre son cycle, se protéger, et être accompagnée jusqu'à la naissance. Tout reste sur l'appareil. */
export default function EspaceAdolescente() {
  const [onglet, setOnglet] = useState('cycle')
  const [e, setE] = useState(lireEspace)
  const nav = useNavigate()
  const maj = (p) => setE((v) => ({ ...v, ...p }))
  useEffect(() => { ecrireEspace(e) }, [e])
  const effacer = () => { effacerEspace(); setE(lireEspace()) }
  return (
    <>
      <Bandeau surtitre="Pour moi · privé" titre="Mon espace adolescente">Comprendre mon corps, me protéger, et être accompagnée jusqu’à la naissance si je suis enceinte. Rien n’est envoyé : tout reste sur ce téléphone.</Bandeau>
      <main className="page soins ado">
        <div className="ado-barre">
          <button type="button" className="bouton secondaire petit-bouton" onClick={() => nav('/famille', { replace: true })}>Sortie rapide</button>
          <button type="button" className="bouton secondaire petit-bouton" onClick={effacer}>Effacer mes données</button>
        </div>
        <nav className="ado-onglets" aria-label="Sections">
          {ONGLETS.map(([id, nom]) => <button key={id} type="button" className={onglet === id ? 'actif' : ''} aria-pressed={onglet === id} onClick={() => setOnglet(id)}>{nom}</button>)}
        </nav>
        {onglet === 'cycle' && <Cycle e={e} maj={maj} onEnceinte={() => setOnglet('enceinte')} />}
        {onglet === 'proteger' && <Proteger />}
        {onglet === 'enceinte' && <Enceinte />}
        {onglet === 'grossesse' && <Grossesse e={e} maj={maj} />}
        {onglet === 'apres' && <Apres />}
      </main>
    </>
  )
}
