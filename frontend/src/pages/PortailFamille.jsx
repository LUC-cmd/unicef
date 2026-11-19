import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import { formaterDate } from '../lib/format.js'

/**
 * Portail famille autonome — accessible sans compte professionnel, par code famille + PIN à 4 chiffres.
 * Affiche : prochain rendez-vous, vaccins faits, jeu du jour, QR du carnet.
 * Design minimaliste pour réseau 2G. Aucune donnée nominative.
 */
export default function PortailFamille() {
  const { code } = useParams()
  const [pin, setPin] = useState('')
  const [jeton, setJeton] = useState(null)
  const [famille, setFamille] = useState(null)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)
  const [expiration, setExpiration] = useState(null)

  async function authentifier(e) {
    e?.preventDefault()
    if (pin.length !== 4) { setErreur('Le code PIN est à 4 chiffres.'); return }
    setAttente(true); setErreur('')
    try {
      const r = await fetch('/api/portail/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeFamille: code, pin }),
        signal: AbortSignal.timeout(8000),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) throw new Error(data?.erreur || 'Code famille ou PIN incorrect.')
      setJeton(data.jeton)
      setExpiration(data.expiration)
    } catch (err) {
      setErreur(err.name === 'TimeoutError' ? 'Le serveur ne répond pas.' : err.message)
    } finally {
      setAttente(false)
    }
  }

  useEffect(() => {
    if (!jeton) return
    let annule = false
    async function charger() {
      try {
        const r = await fetch('/api/portail/famille', {
          headers: { Authorization: `Bearer ${jeton}` },
          signal: AbortSignal.timeout(8000),
        })
        const data = await r.json().catch(() => null)
        if (!annule) {
          if (!r.ok) { setErreur(data?.erreur || 'Session expirée. Reconnectez-vous.'); setJeton(null) }
          else setFamille(data)
        }
      } catch {
        if (!annule) setErreur('Le serveur ne répond pas.')
      }
    }
    charger()
    return () => { annule = true }
  }, [jeton])

  // Écran de connexion par PIN
  if (!jeton) {
    return (
      <>
        <Bandeau surtitre="Espace famille" titre="Accès sécurisé">
          Entrez votre code PIN à 4 chiffres pour consulter le suivi de votre famille.
        </Bandeau>
        <main className="page etroite">
          <form className="carte" onSubmit={authentifier} style={{ textAlign: 'center', maxWidth: '400px', margin: '2rem auto' }}>
            <h2 style={{ margin: '0 0 0.5rem' }}>Famille {code}</h2>
            <p className="petit">Votre agent de santé vous a remis un code PIN à 4 chiffres.</p>

            <label htmlFor="pin" style={{ display: 'block', marginTop: '1.5rem', fontWeight: 600 }}>Code PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              autoComplete="off"
              style={{
                fontSize: '32px', textAlign: 'center', letterSpacing: '12px',
                width: '180px', padding: '12px', margin: '8px auto', display: 'block',
                border: '2px solid #dee2e6', borderRadius: '12px',
              }}
            />

            <button className="bouton" disabled={attente || pin.length !== 4} style={{ marginTop: '1rem', width: '100%' }}>
              {attente ? 'Vérification…' : 'Consulter mon suivi'}
            </button>

            {erreur && <p className="erreur" role="alert" style={{ marginTop: '1rem' }}>{erreur}</p>}

            <p className="petit" style={{ marginTop: '1.5rem', color: '#6c757d' }}>
              Aucun nom n'est affiché. Seuls les codes anonymes et les dates apparaissent.
            </p>
          </form>
        </main>
      </>
    )
  }

  // Écran principal du portail famille
  return (
    <>
      <Bandeau surtitre="Espace famille" titre={`Famille ${code}`}>
        Votre suivi en un coup d'œil. Session valide jusqu'à {expiration ? new Date(expiration).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}.
      </Bandeau>
      <main className="page">
        {erreur && <p className="erreur" role="alert">{erreur}</p>}

        {famille && (
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* KPI rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
              <KpiTuile valeur={famille.enfants?.length ?? 0} label="Enfants suivis" couleur="#1cabe2" />
              <KpiTuile valeur={famille.vaccins ?? 0} label="Vaccins faits" couleur="#00833d" />
              <KpiTuile valeur={famille.enfants?.filter(e => e.prochainRdv).length ?? 0} label="Prochains RDV" couleur="#f26a21" />
            </div>

            {/* Liste des enfants */}
            {famille.enfants?.map((enfant) => (
              <div key={enfant.code} className="carte" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <b>{enfant.statut === 'GROSSESSE' ? 'Grossesse' : 'Enfant'} {enfant.code}</b>
                    <span className="petit" style={{ display: 'block', color: '#6c757d' }}>{enfant.statut}</span>
                  </div>
                </div>
                {enfant.prochainRdv && (
                  <div style={{
                    padding: '8px 12px', background: '#f0f9ff', borderRadius: '8px',
                    borderLeft: '3px solid #1cabe2', fontSize: '14px'
                  }}>
                    Prochain rendez-vous : <b>{formaterDate(enfant.prochainRdv)}</b>
                  </div>
                )}
              </div>
            ))}

            {/* Jeu du jour */}
            {famille.prochainJeu && (
              <div className="carte" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%)', borderLeft: '4px solid #ffc107' }}>
                <h3 style={{ margin: '0 0 8px' }}>Jeu du jour</h3>
                <p>{famille.prochainJeu}</p>
                <Link to="/jeux" className="bouton petit-bouton">Jouer maintenant</Link>
              </div>
            )}

            {/* Bouton de déconnexion */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button className="bouton secondaire" onClick={() => { setJeton(null); setFamille(null); setPin('') }}>
                Se déconnecter
              </button>
            </div>
          </div>
        )}

        {!famille && !erreur && <p className="petit" style={{ textAlign: 'center' }}>Chargement du suivi…</p>}
      </main>
    </>
  )
}

/** Tuile KPI compacte */
function KpiTuile({ valeur, label, couleur }) {
  return (
    <div style={{
      padding: '16px', borderRadius: '12px', textAlign: 'center',
      background: `${couleur}10`, border: `1px solid ${couleur}30`,
    }}>
      <b style={{ fontSize: '24px', color: couleur, display: 'block', margin: '4px 0' }}>{valeur}</b>
      <span className="petit">{label}</span>
    </div>
  )
}
