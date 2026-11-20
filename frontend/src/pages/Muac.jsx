import { useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import QrCode from '../components/QrCode.jsx'
import ResultatSoins from '../components/ResultatSoins.jsx'
import { lireMuac } from '../lib/parcours.js'
import { Link } from 'react-router-dom'

/** Ruban MUAC en 3D (CSS pur) : on mesure le milieu du bras, on lit la zone. Le QR du ruban ouvre cette page. */
export default function Muac() {
  const [mm, setMm] = useState(128)
  const [oed, setOed] = useState(false)
  const [rot, setRot] = useState(-18)
  const r = lireMuac(mm, oed)
  const pos = Math.min(100, Math.max(0, ((mm - 100) / 40) * 100))
  return (
    <>
      <Bandeau surtitre="Concept à fabriquer" titre="Ruban MUAC avec code QR">Un ruban à passer autour du bras de l’enfant, de 6 à 59 mois. Trois zones de couleur disent si l’enfant va bien. Le code QR imprimé dessus ouvre le conseil adapté.</Bandeau>
      <main className="page ado">
        <section className="carte">
          <div className="muac-scene" onPointerMove={(e) => { if (e.buttons) setRot((v) => Math.max(-60, Math.min(60, v + e.movementX * 0.5))) }} role="img" aria-label="Ruban MUAC en 3D. Fais glisser pour l’incliner.">
            <div className="muac" style={{ transform: `rotateX(58deg) rotateZ(${rot}deg)` }}>
              <div className="muac-bande">
                <i className="muac-r" /><i className="muac-j" /><i className="muac-v" />
                <b className="muac-marque" style={{ left: `${pos}%` }} />
                <span className="muac-gr">100</span><span className="muac-gj">115</span><span className="muac-gv">125</span><span className="muac-gf">140 mm</span>
              </div>
              <div className="muac-qr"><QrCode valeur="https://fildor.up.railway.app/muac" taille={64} titre="QR du ruban" /></div>
            </div>
          </div>
          <p className="petit">Fais glisser pour incliner le ruban. Le QR est un exemple pour la maquette. Concept à fabriquer : ce n’est pas un objet existant.</p>
        </section>
        <section className="carte">
          <h2>Lire la mesure</h2>
          <p>Mesure le milieu du bras gauche, entre l’épaule et le coude, sans serrer.</p>
          <label>Mesure en millimètres : <b>{mm} mm</b><input type="range" min="90" max="160" value={mm} onChange={(e) => setMm(Number(e.target.value))} aria-label="Mesure du bras en millimètres" /></label>
          <label className="soin-case"><input type="checkbox" checked={oed} onChange={(e) => setOed(e.target.checked)} /><span>Les deux pieds sont gonflés</span></label>
          <ResultatSoins niveau={r.niveau} titre={r.titre} texte={r.texte} />
          {r.zone && r.zone !== 'verte' && <p><Link to="/nutrition">Trouver un nutritionniste ou une boutique partenaire</Link></p>}
          <p className="petit">Seuils de l’OMS pour les enfants de 6 à 59 mois : moins de 115 mm, de 115 à 124 mm, 125 mm et plus. À faire confirmer par un agent de santé.</p>
        </section>
      </main>
    </>
  )
}
