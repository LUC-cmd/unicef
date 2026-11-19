import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { formaterDate } from '../lib/format.js'

const TYPES_ALERTE = {
  acces_massif: { label: 'Accès massif', desc: 'Plus de 20 consultations en 1h par un seul agent' },
  connexion_echouee: { label: 'Connexion échouée', desc: 'Tentatives de connexion avec mauvais mot de passe' },
  acces_hors_zone: { label: 'Accès hors zone', desc: 'Agent consultant des dossiers hors de sa zone' },
}

const FILTRES_ACTION = ['Toutes', 'CONSULTATION', 'MODIFICATION', 'CONNEXION', 'EXPORT', 'SUPPRESSION']

/**
 * Journal d'accès et tableau de bord cybersécurité.
 * Affiche les 50 derniers accès avec filtres, détection d'anomalies et export CSV.
 */
export default function JournalAcces() {
  const [journal, setJournal] = useState([])
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [filtreAgent, setFiltreAgent] = useState('')
  const [filtreAction, setFiltreAction] = useState('Toutes')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setChargement(true)
    api.get('/api/admin/journal?limite=200')
      .then((data) => {
        setJournal(Array.isArray(data) ? data : data?.entrees ?? [])
      })
      .catch((e) => {
        setErreur(e.message)
        // Données de démonstration si l'API n'est pas disponible
        setJournal(genererDonneeDemo())
      })
      .finally(() => setChargement(false))
  }, [])

  // Filtrage
  const filtre = useMemo(() => {
    let r = journal
    if (filtreAgent) r = r.filter((e) => e.username?.toLowerCase().includes(filtreAgent.toLowerCase()))
    if (filtreAction !== 'Toutes') r = r.filter((e) => e.action === filtreAction)
    return r
  }, [journal, filtreAgent, filtreAction])

  const parPage = 25
  const pages = Math.ceil(filtre.length / parPage)
  const affichees = filtre.slice(page * parPage, (page + 1) * parPage)

  // Détection d'anomalies
  const alertes = useMemo(() => {
    const result = []
    // Accès massif : > 20 accès en 1h par un agent
    const parAgent = {}
    const maintenant = Date.now()
    journal.forEach((e) => {
      const t = new Date(e.date || e.horodatage).getTime()
      if (maintenant - t < 3600000) {
        parAgent[e.username] = (parAgent[e.username] || 0) + 1
      }
    })
    Object.entries(parAgent).forEach(([agent, n]) => {
      if (n > 20) result.push({ type: 'acces_massif', agent, detail: `${n} accès dans la dernière heure`, severite: 'rouge' })
    })

    // Connexions échouées
    const echouees = journal.filter((e) => e.action === 'CONNEXION' && e.statut === 'ECHEC')
    if (echouees.length > 3) {
      result.push({ type: 'connexion_echouee', agent: '—', detail: `${echouees.length} tentatives échouées`, severite: 'orange' })
    }

    return result
  }, [journal])

  // Export CSV
  function exporterCsv() {
    const lignes = ['Date,Agent,Action,Ressource,Détails']
    filtre.forEach((e) => {
      lignes.push(`"${e.date || e.horodatage}","${e.username}","${e.action}","${e.ressource || ''}","${e.details || ''}"`)
    })
    const blob = new Blob([lignes.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `journal-acces-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Agents uniques
  const agents = useMemo(() => [...new Set(journal.map((e) => e.username).filter(Boolean))], [journal])

  const couleurAction = (action) => {
    switch (action) {
      case 'CONSULTATION': return { bg: '#e3f2fd', text: '#1565c0' }
      case 'MODIFICATION': return { bg: '#fff3e0', text: '#e65100' }
      case 'CONNEXION': return { bg: '#e8f5e9', text: '#2e7d32' }
      case 'EXPORT': return { bg: '#f3e5f5', text: '#7b1fa2' }
      case 'SUPPRESSION': return { bg: '#ffebee', text: '#c62828' }
      default: return { bg: '#f5f5f5', text: '#616161' }
    }
  }

  return (
    <div>
      {/* Alertes de sécurité */}
      {alertes.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Alertes de sécurité ({alertes.length})
          </h3>
          {alertes.map((a, i) => {
            const info = TYPES_ALERTE[a.type] || { label: a.type, desc: '' }
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                marginBottom: '8px', borderRadius: '8px',
                background: a.severite === 'rouge' ? '#fff5f5' : '#fff8e1',
                borderLeft: `4px solid ${a.severite === 'rouge' ? '#e2231a' : '#f26a21'}`,
              }}>
                <div>
                  <b>{info.label}</b> — {a.detail}
                  {a.agent !== '—' && <span className="petit"> · Agent : {a.agent}</span>}
                  <p className="petit" style={{ margin: '2px 0 0', color: '#6c757d' }}>{info.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {alertes.length === 0 && !chargement && (
        <div style={{
          padding: '16px', borderRadius: '8px', background: '#e8f5e9',
          borderLeft: '4px solid #4caf50', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>Aucune anomalie détectée. Tous les accès sont normaux.</span>
        </div>
      )}

      {/* Métriques de sécurité */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
        <MetriqueTuile valeur={agents.length} label="Agents actifs" />
        <MetriqueTuile valeur={journal.length} label="Accès enregistrés" />
        <MetriqueTuile valeur={alertes.length} label="Alertes actives" />
        <MetriqueTuile valeur={journal.filter(e => e.action === 'CONNEXION' && e.statut === 'ECHEC').length} label="Connexions échouées" />
      </div>

      {/* Filtres */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
        padding: '12px 16px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '12px'
      }}>
        <label style={{ flex: '1 1 180px' }}>
          <span className="petit" style={{ fontWeight: 600 }}>Agent</span>
          <select value={filtreAgent} onChange={(e) => { setFiltreAgent(e.target.value); setPage(0) }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ced4da' }}>
            <option value="">Tous les agents</option>
            {agents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label style={{ flex: '1 1 140px' }}>
          <span className="petit" style={{ fontWeight: 600 }}>Action</span>
          <select value={filtreAction} onChange={(e) => { setFiltreAction(e.target.value); setPage(0) }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ced4da' }}>
            {FILTRES_ACTION.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <button className="bouton secondaire petit-bouton" onClick={exporterCsv} style={{ whiteSpace: 'nowrap' }}>
          Export CSV
        </button>
      </div>

      {/* Tableau */}
      {chargement && <p className="petit">Chargement du journal…</p>}
      {erreur && <p className="petit" style={{ color: '#6c757d' }}>Mode démonstration : données simulées.</p>}

      <div className="tableau-conteneur">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Agent</th>
              <th>Action</th>
              <th>Ressource</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {affichees.map((e, i) => {
              const c = couleurAction(e.action)
              return (
                <tr key={i}>
                  <td className="petit">{formaterDate(e.date || e.horodatage)}</td>
                  <td><b>{e.username}</b></td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                      background: c.bg, color: c.text
                    }}>{e.action}</span>
                  </td>
                  <td className="petit">{e.ressource || '—'}</td>
                  <td className="petit">{e.details || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
          <button className="bouton secondaire petit-bouton" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Précédent</button>
          <span className="petit" style={{ lineHeight: '32px' }}>Page {page + 1} / {pages}</span>
          <button className="bouton secondaire petit-bouton" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  )
}

function MetriqueTuile({ valeur, label }) {
  return (
    <div style={{
      padding: '12px', borderRadius: '8px', textAlign: 'center',
      background: '#fff', border: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <b style={{ fontSize: '20px', display: 'block', margin: '2px 0' }}>{valeur}</b>
      <span className="petit">{label}</span>
    </div>
  )
}

/** Données de démonstration quand l'API n'est pas disponible */
function genererDonneeDemo() {
  const agents = ['agent-maritime-01', 'agent-maritime-02', 'agent-lome-01', 'mairie-01', 'admin']
  const actions = ['CONSULTATION', 'MODIFICATION', 'CONNEXION', 'EXPORT']
  const ressources = ['enfant/T001A', 'famille/F-0012', 'visite/V-234', 'rapport/zone-maritime', 'carnet/F-0001']
  const resultat = []
  for (let i = 0; i < 50; i++) {
    const d = new Date()
    d.setMinutes(d.getMinutes() - i * 12)
    resultat.push({
      date: d.toISOString(),
      username: agents[i % agents.length],
      action: actions[i % actions.length],
      ressource: ressources[i % ressources.length],
      details: i % 7 === 0 ? 'Accès depuis une nouvelle adresse IP' : '',
      statut: i === 3 ? 'ECHEC' : 'OK',
    })
  }
  return resultat
}
