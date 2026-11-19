import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { api } from '../lib/api.js'
import { lienCarte } from '../lib/geo.js'
import { afficherNotification } from '../lib/notifier.js'
import Picto from '../components/Picto.jsx'

const FORMULE = { JOURNEE: 'Journée', MATIN: 'Matin', APRES_MIDI: 'Après-midi' }
const iso = (d) => d.toISOString().slice(0, 10)
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
const lisible = (j, court) => new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', court ? { weekday: 'short', day: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long' })
function depuis(t) {
  const m = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000))
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`
  return `il y a ${Math.round(m / 1440)} j`
}

/** Tableau de bord de la crèche : demandes à valider, enfants attendus et présents aujourd'hui, occupation de la semaine. */
export default function CrecheTableau() {
  const [creche, setCreche] = useState(null)
  const [liste, setListe] = useState([])
  const [info, setInfo] = useState(null)
  const [nouvelles, setNouvelles] = useState(0)
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'indisponible'))
  const connues = useRef(null)
  const aujourdhui = iso(new Date())

  const charger = useCallback(async () => {
    try {
      const l = await api.get(`/api/structure/creche/reservations?du=${aujourdhui}&au=${plus(30)}`)
      setListe(l)
      const attente = l.filter((r) => r.statut === 'DEMANDEE').map((r) => r.id)
      if (connues.current) {
        const neufs = attente.filter((id) => !connues.current.has(id))
        if (neufs.length) { setNouvelles((n) => n + neufs.length); afficherNotification('Nouvelle demande de crèche', `${neufs.length} demande(s) à valider dans Fil d'Or.`, '/structure') }
      }
      connues.current = new Set(attente)
    } catch (e) { setInfo({ ok: false, texte: e.message }) }
  }, [aujourdhui])

  useEffect(() => { api.get('/api/structure/creche').then(setCreche).catch((e) => setInfo({ ok: false, texte: e.message })) }, [])
  useEffect(() => {
    charger()
    const t = setInterval(charger, 30000)
    const retour = () => { if (document.visibilityState === 'visible') charger() }
    document.addEventListener('visibilitychange', retour)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', retour) }
  }, [charger])

  const enAttente = liste.filter((r) => r.statut === 'DEMANDEE').sort((a, b) => new Date(a.creeLe) - new Date(b.creeLe))
  const duJour = liste.filter((r) => r.dateJour === aujourdhui && r.statut === 'CONFIRMEE')
  const presents = duJour.filter((r) => r.arriveeReelle && !r.departReel).length
  const capacite = creche?.capacite ?? 0
  useEffect(() => { document.title = enAttente.length ? `(${enAttente.length}) Fil d'Or` : "Fil d'Or"; return () => { document.title = "Fil d'Or" } }, [enAttente.length])

  const agir = async (url, corps) => {
    try { const r = await api.post(url, corps); setInfo({ ok: true, texte: r.message }); setNouvelles(0); charger() } catch (e) { setInfo({ ok: false, texte: e.message }) }
  }
  const activer = async () => { if ('Notification' in window) setPermission(await Notification.requestPermission()) }

  const jours = Array.from({ length: 7 }, (_, i) => plus(i)).map((j) => {
    const d = liste.filter((r) => r.dateJour === j)
    return { j, conf: d.filter((r) => r.statut === 'CONFIRMEE').length, att: d.filter((r) => r.statut === 'DEMANDEE').length }
  })

  return (
    <>
      <Bandeau surtitre="Ma crèche" titre={creche ? creche.nom : 'Tableau de bord de la crèche'}>
        Les demandes des familles arrivent ici. Vous validez, vous notez les arrivées et les départs, la famille est prévenue à chaque étape.
      </Bandeau>
      <div className="creche-gestion">
        {info && <p className={info.ok ? 'ok-notif' : 'alerte-jour'} role="status">{info.texte}</p>}
        {nouvelles > 0 && <div className="alerte-acte" role="status"><b>{nouvelles} nouvelle(s) demande(s)</b> depuis votre dernière visite. Elles sont dans la liste « À valider ».</div>}

        {creche?.latitude != null && creche?.longitude != null && (
          <div className="alerte-acte" role="status">
            <Picto nom="pin" /> Les familles trouvent la crèche sur la carte et suivent la route jusqu'ici (zone {creche.zone}).
            {' '}
            <a className="bouton clair petit-bouton" href={lienCarte(creche.latitude, creche.longitude)} target="_blank" rel="noreferrer">Voir la position</a>
          </div>
        )}

        <div className="famille-tuiles kpi-creche">
          <div><b>{duJour.length}</b><span>enfant{duJour.length > 1 ? 's' : ''} attendu{duJour.length > 1 ? 's' : ''} aujourd'hui</span></div>
          <div><b>{presents}</b><span>présent{presents > 1 ? 's' : ''} maintenant</span></div>
          <div className={enAttente.length ? 'a-traiter' : ''}><b>{enAttente.length}</b><span>demande{enAttente.length > 1 ? 's' : ''} à valider</span></div>
          <div><b>{Math.max(0, capacite - duJour.length)}</b><span>place{capacite - duJour.length > 1 ? 's' : ''} libre{capacite - duJour.length > 1 ? 's' : ''} aujourd'hui</span></div>
          <div><b>{capacite ? Math.round((jours.reduce((s, j) => s + j.conf, 0) / (capacite * 7)) * 100) : 0} %</b><span>occupation moyenne sur 7 jours</span></div>
        </div>

        {duJour.length > 0 && duJour.some((r) => !r.arriveeReelle) && (
          <div className="alerte-acte" role="status">
            <Picto nom="horloge" /> {duJour.filter((r) => !r.arriveeReelle).length} enfant(s) attendu(s) pas encore arrivé(s).
            Si l'heure d'arrivée est passée, prévenez la famille et l'agent de santé par le code enfant.
          </div>
        )}

        <section className="carte" aria-labelledby="t-valider">
          <h2 id="t-valider">À valider</h2>
          {permission === 'default' && <p><button className="bouton secondaire petit-bouton" onClick={activer}>Être prévenu sur cet appareil à chaque nouvelle demande</button></p>}
          {permission === 'granted' && <p className="ok-notif">Notifications actives : vous êtes prévenu dès qu'une famille fait une demande (page ouverte).</p>}
          {enAttente.length === 0 && <p className="petit">Aucune demande en attente. Les nouvelles apparaîtront ici toutes seules.</p>}
          <ul className="fam-boite">
            {enAttente.map((r) => (
              <li key={r.id} style={{ '--c': '#B87B00' }}>
                <b>{lisible(r.dateJour)} · {r.heureArrivee} à {r.heureDepart} · {FORMULE[r.formule]}</b>
                <p>Enfant {r.codeEnfant}, {r.ageMois} mois{r.note ? ` · « ${r.note} »` : ''}</p>
                <small>Demande reçue {depuis(r.creeLe)}</small>
                <span className="creche-actions">
                  <button className="bouton petit-bouton" onClick={() => agir(`/api/structure/creche/reservations/${r.id}/decision`, { decision: 'CONFIRMEE' })}>Confirmer</button>
                  <button className="bouton secondaire petit-bouton" onClick={() => agir(`/api/structure/creche/reservations/${r.id}/decision`, { decision: 'REFUSEE' })}>Refuser</button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="carte" aria-labelledby="t-jour">
          <h2 id="t-jour">Aujourd'hui, {lisible(aujourdhui)}</h2>
          {duJour.length === 0 && <p className="petit">Aucun enfant attendu aujourd'hui.</p>}
          <ul className="fam-boite">
            {duJour.map((r) => (
              <li key={r.id} style={{ '--c': r.departReel ? '#6b7785' : r.arriveeReelle ? '#00833E' : '#0E86B8' }}>
                <b>Enfant {r.codeEnfant}, {r.ageMois} mois · prévu {r.heureArrivee} à {r.heureDepart}</b>
                <small>{r.departReel ? `Parti à ${r.departReel}` : r.arriveeReelle ? `Présent depuis ${r.arriveeReelle}` : 'Pas encore arrivé'}{r.note ? ` · « ${r.note} »` : ''}</small>
                {!r.arriveeReelle && <button className="bouton petit-bouton" onClick={() => agir(`/api/structure/creche/reservations/${r.id}/pointage`, { action: 'ARRIVEE' })}>Noter l'arrivée</button>}
                {r.arriveeReelle && !r.departReel && <button className="bouton secondaire petit-bouton" onClick={() => agir(`/api/structure/creche/reservations/${r.id}/pointage`, { action: 'DEPART' })}>Noter le départ</button>}
              </li>
            ))}
          </ul>
        </section>

        <section className="carte" aria-labelledby="t-semaine">
          <h2 id="t-semaine">Les 7 prochains jours</h2>
          <p className="petit">Places confirmées (vert) et demandes à valider (orange), sur {capacite} places par jour.</p>
          <ul className="occupation">
            {jours.map(({ j, conf, att }) => (
              <li key={j}>
                <span className="occ-jour">{lisible(j, true)}</span>
                <span className="occ-barre" role="img" aria-label={`${conf} confirmés, ${att} en attente, sur ${capacite} places`}>
                  <i className="conf" style={{ width: `${capacite ? Math.min(100, (conf / capacite) * 100) : 0}%` }} />
                  <i className="att" style={{ width: `${capacite ? Math.min(100, (att / capacite) * 100) : 0}%` }} />
                </span>
                <span className="occ-val">{conf} + {att}</span>
              </li>
            ))}
          </ul>
          <Link className="bouton secondaire" to="/structure/creche">Réservations de la semaine, conditions et horaires</Link>
        </section>

        <section className="carte" aria-labelledby="t-eveil">
          <h2 id="t-eveil"><Picto nom="de" /> L'éveil à la crèche</h2>
          <p>
            Le jeu du jour (par âge) est le même que celui des familles : les enfants retrouvent à la crèche le
            jeu que la maman fait à la maison. Regardez le jeu du jour de chaque enfant, proposez-le aux présents.
          </p>
          <Link className="bouton" to="/jeux">Ouvrir les jeux d'éveil</Link>
        </section>
      </div>
    </>
  )
}
