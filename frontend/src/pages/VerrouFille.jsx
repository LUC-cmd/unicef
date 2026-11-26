import { useState } from 'react'
import { sortirFille, verifierPin } from '../lib/fille.js'

/** Code secret demandé à l'ouverture de l'espace, si la jeune fille en a choisi un. */
export default function VerrouFille({ onOuvert }) {
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState('')
  const valider = async (e) => { e.preventDefault(); if (await verifierPin(pin)) onOuvert(); else { setErreur('Ce code n’est pas le bon.'); setPin('') } }
  return (
    <main className="page" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <section className="carte">
        <h1>Mon espace est protégé</h1>
        <form onSubmit={valider} className="ado-champs">
          <label>Mon code secret<input type="password" inputMode="numeric" autoComplete="current-password" autoFocus maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>
          {erreur && <p role="alert" className="erreur">{erreur}</p>}
          <p><button className="bouton" type="submit" disabled={pin.length < 4}>Ouvrir</button> <button type="button" className="bouton secondaire" onClick={() => { sortirFille(); window.location.assign('/') }}>Quitter</button></p>
        </form>
      </section>
    </main>
  )
}
