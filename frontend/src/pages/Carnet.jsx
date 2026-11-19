import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { LIBELLE_LANGUE, aujourdhuiIso, formaterDate, nomDuJour } from '../lib/format.js'
import QrCode from '../components/QrCode.jsx'
import Picto from '../components/Picto.jsx'

const TYPES = {
  VACCIN: ['vaccin', 'Vaccin'], CONSULTATION_PRENATALE: ['enceinte', 'Consultation prénatale'], PESEE: ['balance', 'Pesée'], NUTRITION: ['bol', 'Nutrition'],
}

function ageTexte(naissance, auj) {
  if (!naissance) return ''
  const a = new Date(`${naissance}T00:00:00Z`); const b = new Date(`${auj}T00:00:00Z`)
  const mois = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() - (b.getUTCDate() < a.getUTCDate() ? 1 : 0)
  if (mois < 1) return 'moins d’un mois'
  if (mois < 24) return `${mois} mois`
  return `${Math.floor(mois / 12)} ans${mois % 12 ? ` ${mois % 12} mois` : ''}`
}

/** Carnet de suivi à imprimer (une feuille A4 par enfant) : sans nom, pictogrammes, cases à cocher et lignes à remplir à la main.
 *  Chaque feuille porte un QR signé : l'état du suivi voyage avec le papier. */
export default function Carnet() {
  const { code } = useParams()
  const [carnet, setCarnet] = useState(null)
  const [jetonQr, setJetonQr] = useState('')
  const [erreur, setErreur] = useState('')
  const auj = aujourdhuiIso()

  useEffect(() => {
    api.get(`/api/agent/familles/${encodeURIComponent(code)}/carnet`).then(setCarnet).catch((e) => setErreur(e.message))
    api.get(`/api/agent/familles/${encodeURIComponent(code)}/carnet/qr`).then((r) => setJetonQr(r.jeton || '')).catch(() => {})
  }, [code])

  if (erreur) return <main className="page"><p className="erreur" role="alert">{erreur}</p><Link to="/agent">Retour</Link></main>
  if (!carnet) return <main className="page"><p>Chargement…</p></main>

  return (
    <main className="page carnet">
      <div className="no-print cn-actions">
        <Link to="/agent">← Retour à la liste</Link>
        <button className="bouton" onClick={() => window.print()}>Imprimer le carnet</button>
        <span className="petit">Format A4, recto-verso pour chaque enfant.</span>
      </div>

      {carnet.enfants.map((e) => {
        const prochain = e.rendezVous.find((r) => r.statut !== 'REALISE')
        const enceinte = e.statut === 'GROSSESSE'
        return (
          <article className="cn-feuille" key={e.codeEnfant}>
            <header className="cn-tete">
              <img src="/logo-rond.png" alt="" width="64" height="64" />
              <div className="cn-titre"><h1>Carnet Fil d’Or</h1><p>Suivi de l’enfant, de la grossesse à 5 ans</p></div>
              <dl className="cn-codes">
                <div><dt>Code famille</dt><dd>{carnet.codeFamille}</dd></div>
                {carnet.codeCarte && <div><dt>Code de la carte</dt><dd>{carnet.codeCarte}</dd></div>}
              </dl>
            </header>

            <section className="cn-identite" aria-label="L’enfant">
              <div><span>Enfant</span><b>{e.codeEnfant}</b></div>
              <div><span>{enceinte ? 'Terme prévu' : 'Né(e) le'}</span><b>{formaterDate(enceinte ? e.dateTermePrevue : e.dateNaissance)}</b></div>
              {!enceinte && <div><span>Âge</span><b>{ageTexte(e.dateNaissance, auj)}</b></div>}
              <div><span>Langue des rappels</span><b>{LIBELLE_LANGUE[carnet.langue]}</b></div>
            </section>

            {prochain && (
              <section className="cn-prochain" aria-label="Prochain rendez-vous">
                <span className="cn-icone"><Picto nom={(TYPES[prochain.type] || ['calendrier'])[0]} /></span>
                <div><small>Prochain rendez-vous</small><b>{formaterDate(prochain.datePrevue)}</b><span>{prochain.libelle}</span></div>
              </section>
            )}

            <h2>Mes rendez-vous</h2>
            <table className="cn-table">
              <thead><tr><th>Date prévue</th><th>Rendez-vous</th><th>Fait le</th></tr></thead>
              <tbody>
                {e.rendezVous.map((r) => {
                  const [pic, nom] = TYPES[r.type] || ['calendrier', 'Rendez-vous']
                  const fait = r.statut === 'REALISE'
                  return (
                    <tr key={r.id} className={fait ? 'fait' : ''}>
                      <td className="cn-date">{formaterDate(r.datePrevue)}</td>
                      <td><span className="cn-type"><Picto nom={pic} /> {nom}</span> <span className="cn-lib">{r.libelle}</span></td>
                      <td className="cn-case"><span className={`cn-boite ${fait ? 'coche' : ''}`}>{fait ? <Picto nom="valide" /> : ''}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!enceinte && (
              <>
                <h2>Poids, taille et mesure du bras</h2>
                <p className="cn-aide">L’agent de santé écrit ici à chaque visite.</p>
                <table className="cn-table cn-mesures">
                  <thead><tr><th>Date</th><th>Poids (kg)</th><th>Taille (cm)</th><th>Bras (mm)</th><th>Couleur du ruban</th></tr></thead>
                  <tbody>{Array.from({ length: 6 }, (_, i) => <tr key={i}><td /><td /><td /><td /><td /></tr>)}</tbody>
                </table>
                <div className="cn-ruban" aria-label="Couleurs du ruban de mesure">
                  <span className="vert"><i /> Vert : tout va bien</span>
                  <span className="jaune"><i /> Jaune : conseils, revoir l’agent</span>
                  <span className="rouge"><i /> Rouge : aller au centre de santé</span>
                </div>
              </>
            )}

            <div className={enceinte ? '' : 'cn-verso'}>
            {!enceinte && <p className="cn-rappel-verso">Carnet Fil d’Or · famille {carnet.codeFamille} · enfant {e.codeEnfant} · verso</p>}
            <h2>{enceinte ? 'Pendant la grossesse' : 'Un jeu par jour'}</h2>
            {e.jeuxDeLaSemaine?.length > 0 ? (
              <table className="cn-table cn-jeux">
                <tbody>
                  {e.jeuxDeLaSemaine.map((j, i) => (
                    <tr key={`${j.id}-${i}`}>
                      <td className="cn-jour">{nomDuJour(i)}</td>
                      <td><b>{j.titre}</b><br /><span className="cn-lib">{j.consigne} Matériel : {j.materiel}.</span></td>
                      <td className="cn-case"><span className="cn-boite" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="cn-aide">{enceinte ? 'Parlez et chantez à votre bébé : il vous entend. Allez à toutes les consultations prénatales.' : 'Pas de jeu proposé pour cet âge.'}</p>
            )}

            {enceinte && (
              <p className="cn-jeune"><b>Si vous êtes jeune :</b> vous avez le droit de continuer vos études et d’être accompagnée sans jugement. Parlez-en à l’agent de santé ou au centre social.</p>
            )}

            <section className="cn-alerte" aria-label="Signes d’alerte">
              <span className="cn-icone"><Picto nom="alerte" /></span>
              <p><b>Allez tout de suite au centre de santé</b> {enceinte ? 'en cas de saignement, de fortes douleurs, de fièvre, de maux de tête avec vertiges ou si le bébé ne bouge plus.' : 'si l’enfant ne boit plus, est très faible, respire difficilement, a de la fièvre qui ne baisse pas ou des convulsions.'}</p>
            </section>

            <footer className="cn-pied">
              {jetonQr && (
                <div className="cn-qr">
                  <QrCode valeur={jetonQr} taille={132} titre="Code de suivi signé de l’enfant" />
                </div>
              )}
              <div className="cn-qr-texte">
                <b>Code de suivi signé</b>
                <p>Il porte les rendez-vous faits et le prochain. Un agent ou un centre le lit avec « Vérifier un QR », même sans réseau. Aucun nom ni adresse n’y figure.</p>
                <p className="cn-mentions">Ce carnet informe et oriente, il ne remplace pas le personnel de santé. Fil d’Or · Hack4Children Togo 2026.</p>
              </div>
            </footer>
            </div>
          </article>
        )
      })}
    </main>
  )
}
