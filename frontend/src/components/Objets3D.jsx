import { useRef, useState } from 'react'

/** Anneau 3D en CSS pur : n panneaux plats placés en cercle. Sert au bracelet et à la ceinture. On le fait tourner au doigt ou aux flèches. */
function Anneau({ n, rayon, hauteur, fond, plaques, nom, coutures }) {
  const [ry, setRy] = useState(-20)
  const [doux, setDoux] = useState(true)
  const dep = useRef(null)
  const larg = Math.ceil(2 * rayon * Math.sin(Math.PI / n)) + 2
  return (
    <div className="an-scene" tabIndex={0} role="img" aria-label={`${nom}, maquette 3D. Flèches gauche et droite pour la faire tourner.`}
      onPointerDown={(e) => { dep.current = { x: e.clientX, ry }; setDoux(false); e.currentTarget.setPointerCapture?.(e.pointerId) }}
      onPointerMove={(e) => { if (dep.current) setRy(dep.current.ry + (e.clientX - dep.current.x) * 0.6) }}
      onPointerUp={() => { dep.current = null; setDoux(true) }} onPointerCancel={() => { dep.current = null; setDoux(true) }}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') setRy((v) => v - 15); if (e.key === 'ArrowRight') setRy((v) => v + 15) }}>
      <div className={`an ${doux ? 'doux' : ''}`} style={{ width: larg, height: hauteur, transform: `rotateX(-22deg) rotateY(${ry}deg)` }}>
        {Array.from({ length: n }, (_, i) => <i key={i} className="an-pan" style={{ width: larg, height: hauteur, background: coutures ? `${COUTURE} 0 8px / 100% 2px no-repeat, ${COUTURE} 0 calc(100% - 10px) / 100% 2px no-repeat, ${fond}` : fond, transform: `rotateY(${(360 / n) * i}deg) translateZ(${rayon}px)` }} />)}
        {plaques.map((q, k) => <div key={k} className="an-plaque" style={{ ...q.style, transform: `rotateY(${q.angle ?? 0}deg) translateZ(${rayon + 2}px)` }}>{q.contenu}</div>)}
      </div>
    </div>
  )
}

const COUTURE = 'repeating-linear-gradient(90deg, rgba(255,255,255,.75) 0 5px, transparent 5px 10px)'
const Qr = () => <svg viewBox="0 0 7 7" width="100%" height="100%" aria-hidden="true"><rect width="7" height="7" fill="#fff" />{[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[4,0],[5,0],[6,0],[4,1],[6,1],[4,2],[5,2],[6,2],[0,4],[1,4],[2,4],[0,5],[2,5],[0,6],[1,6],[2,6],[4,4],[6,4],[5,5],[4,6],[6,6],[3,3]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" fill="#16325c" />)}</svg>

const COULEURS_BRACELET = { bleu: ['Bleu', '#1cabe2', '#0e6f9a'], rose: ['Rose', '#e78fb3', '#c45c86'], vert: ['Vert', '#5cc38a', '#2e9e4f'] }
export function Bracelet3D() {
  const [c, setC] = useState('bleu')
  const [h, b] = [COULEURS_BRACELET[c][1], COULEURS_BRACELET[c][2]]
  return (
    <div className="an-bloc">
      <Anneau nom="Bracelet Fil d’Or" n={40} rayon={92} hauteur={60} fond={`linear-gradient(180deg, ${h}, ${b})`} coutures
        plaques={[
          { angle: 0, style: { width: 70, height: 48, background: '#fff', borderRadius: 5, padding: 3, boxSizing: 'border-box', border: '2px solid #12304f' }, contenu: <Qr /> },
          { angle: 55, style: { width: 40, height: 14, color: '#fff', font: '800 9px/14px Inter, sans-serif', textAlign: 'center' }, contenu: 'Fil d’Or' },
          { angle: -55, style: { width: 40, height: 14, color: '#fff', font: '800 9px/14px Inter, sans-serif', textAlign: 'center' }, contenu: 'Fil d’Or' },
          { angle: 180, style: { width: 34, height: 54, background: 'linear-gradient(135deg,#dfe7ee,#9fb2c2)', borderRadius: 6, border: '2px solid #12304f', display: 'grid', alignContent: 'space-evenly', justifyItems: 'center' }, contenu: <><i style={{ width: 20, height: 3, background: '#12304f' }} /><i style={{ width: 20, height: 3, background: '#12304f' }} /></> },
        ]} />
      <div className="b3d-vues" role="group" aria-label="Couleur du bracelet">
        {Object.entries(COULEURS_BRACELET).map(([k, [nom]]) => <button key={k} type="button" aria-pressed={c === k} onClick={() => setC(k)}>{nom}</button>)}
      </div>
      <p className="petit">Bracelet souple pour nouveau-né, avec le code QR du carnet de l’enfant, un fermoir de sécurité et une couleur au choix. Fais glisser pour tourner (le fermoir est au dos). Concept à fabriquer.</p>
    </div>
  )
}

const RISQUES = { bon: ['Vert', '#2e9e4f'], surveiller: ['Jaune', '#f2b705'], urgent: ['Rouge', '#c62828'] }
export function Ceinture3D() {
  const [r, setR] = useState('surveiller')
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="an-bloc">
      <Anneau nom="Ceinture Fil d’Or" n={44} rayon={110} hauteur={78} fond="linear-gradient(180deg,#e8a317,#c98a0a)" coutures
        plaques={[
          ouvert
            ? { angle: 0, style: { width: 104, height: 66, background: '#fff', borderRadius: 6, padding: 4, boxSizing: 'border-box', border: '3px solid #12304f', display: 'grid', gridTemplateColumns: '1fr 30px', gap: 4 }, contenu: <><Qr /><i style={{ background: RISQUES[r][1], borderRadius: 4 }} /></> }
            : { angle: 0, style: { width: 104, height: 66, background: '#b8780a', borderRadius: 6, border: '3px solid #12304f', display: 'grid', placeItems: 'center', color: '#fff', font: '800 13px/1 Inter, sans-serif' }, contenu: 'Fil d’Or' },
          { angle: 180, style: { width: 40, height: 60, background: 'linear-gradient(135deg,#dfe7ee,#9fb2c2)', borderRadius: 6, border: '2px solid #12304f', display: 'grid', alignContent: 'space-evenly', justifyItems: 'center' }, contenu: <><i style={{ width: 26, height: 4, background: '#12304f' }} /><i style={{ width: 26, height: 4, background: '#12304f' }} /><i style={{ width: 26, height: 4, background: '#12304f' }} /></> },
        ]} />
      <div className="b3d-vues" role="group" aria-label="Rabat et niveau de risque">
        <button type="button" aria-pressed={ouvert} onClick={() => setOuvert(!ouvert)}>{ouvert ? 'Fermer le rabat' : 'Ouvrir le rabat'}</button>
        {ouvert && Object.entries(RISQUES).map(([k, [nom]]) => <button key={k} type="button" aria-pressed={r === k} onClick={() => setR(k)}>{nom}</button>)}
      </div>
      <p className="petit">Rabat fermé : on ne voit que « Fil d’Or ». Rabat ouvert, le personnel de santé voit le QR du plan d’accouchement et la pastille de risque, reprise de la carte de risque. La boucle est au dos. Concept à fabriquer.</p>
    </div>
  )
}
