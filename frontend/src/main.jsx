import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { FournisseurAuth, FournisseurReseau } from './lib/contexte.jsx'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto/900.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <FournisseurAuth>
        <FournisseurReseau>
          <App />
        </FournisseurReseau>
      </FournisseurAuth>
    </BrowserRouter>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

// L'écran de démarrage reste un instant puis s'efface en douceur (jamais plus de quelques secondes).
const demarrage = document.getElementById('demarrage')
if (demarrage) {
  const debut = performance.now()
  const retirer = () => { demarrage.classList.add('parti'); setTimeout(() => demarrage.remove(), 600) }
  const attente = Math.max(0, 700 - (performance.now() - debut))
  window.addEventListener('load', () => setTimeout(retirer, attente), { once: true })
  if (document.readyState === 'complete') setTimeout(retirer, attente)
  setTimeout(retirer, 6000)
}
