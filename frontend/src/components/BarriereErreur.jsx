import { Component } from 'react'

/**
 * Barrière d'erreur React — capture les crashes de composants enfants
 * et affiche un écran d'aide au lieu d'une page blanche.
 */
export default class BarriereErreur extends Component {
  constructor(props) {
    super(props)
    this.state = { erreur: null, info: null }
  }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    this.setState({ info })
    // En production, envoyer au backend : POST /api/erreurs-client
    if (import.meta.env.PROD) {
      try {
        navigator.sendBeacon('/api/erreurs-client', JSON.stringify({
          message: erreur?.message,
          stack: erreur?.stack?.substring(0, 500),
          composant: info?.componentStack?.substring(0, 300),
          url: window.location.href,
          date: new Date().toISOString(),
        }))
      } catch { /* silencieux */ }
    }
  }

  render() {
    if (!this.state.erreur) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fee2e2',
          color: '#e2231a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 'bold', marginBottom: '1rem',
          animation: 'shake 0.5s ease-in-out',
        }}>!</div>
        <h1 style={{ color: '#e2231a', fontSize: '1.4rem', margin: '0 0 0.8rem' }}>
          Quelque chose ne va pas
        </h1>
        <p style={{ color: '#555', maxWidth: '400px', lineHeight: 1.6 }}>
          Une erreur inattendue est survenue. Vos données sont en sécurité.
          Essayez de recharger la page.
        </p>
        {!import.meta.env.PROD && this.state.erreur && (
          <details style={{ marginTop: '1rem', textAlign: 'left', maxWidth: '500px', fontSize: '0.85rem', color: '#888' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Détails techniques</summary>
            <pre style={{ overflow: 'auto', padding: '0.5rem', background: '#f8f8f8', borderRadius: '6px', marginTop: '0.5rem' }}>
              {this.state.erreur.message}
              {'\n'}
              {this.state.info?.componentStack}
            </pre>
          </details>
        )}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.7rem 1.5rem', background: '#1cabe2', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Recharger la page
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              padding: '0.7rem 1.5rem', background: '#f0f0f0', color: '#333', border: 'none',
              borderRadius: '8px', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Retour à l'accueil
          </button>
        </div>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `}</style>
      </div>
    )
  }
}
