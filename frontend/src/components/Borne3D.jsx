import { useEffect, useRef, useState } from 'react'

const VUES = [['Face', -12], ['Côté', 70], ['Dos', 180], ['Autre côté', 250]]
const BOITES = [
  { t: 'Serviettes', n: 'hygiéniques', c: '#d9467a' }, { t: 'Préservatifs', n: 'sachets', c: '#2e9e4f' }, { t: 'Antalgique', n: 'règles', c: '#e8a317' },
  { t: 'Bons', n: 'consultation', c: '#1cabe2' }, { t: 'Savon', n: 'et gel', c: '#7a5bd6' }, { t: 'Informations', n: 'fiches', c: '#0e7c86' },
  { t: 'Réserve', n: 'serviettes', c: '#d9467a' }, { t: 'Réserve', n: 'préservatifs', c: '#2e9e4f' }, { t: 'Libre', n: 'selon le village', c: '#8fa3b5' },
]

/** Maquette 3D de la borne, en CSS pur : on la fait tourner au doigt, à la souris ou avec les flèches. Aucun fichier 3D, aucune bibliothèque. */
export default function Borne3D({ onVue, auto, actif }) {
  const [ry, setRy] = useState(-25)
  const [doux, setDoux] = useState(true)
  const depart = useRef(null)
  useEffect(() => { if (!auto || !doux || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined; const t = setInterval(() => setRy((v) => v + 0.6), 33); return () => clearInterval(t) }, [auto, doux])
  const envoyer = (v) => onVue?.(v)
  useEffect(() => { envoyer(ry) }, [ry]) // eslint-disable-line react-hooks/exhaustive-deps
  const bas = (e) => { depart.current = { x: e.clientX, ry }; setDoux(false); e.currentTarget.setPointerCapture?.(e.pointerId) }
  const bouge = (e) => { if (depart.current) setRy(depart.current.ry + (e.clientX - depart.current.x) * 0.6) }
  const haut = () => { depart.current = null; setDoux(true) }
  const touche = (e) => { if (e.key === 'ArrowLeft') setRy((v) => v - 15); if (e.key === 'ArrowRight') setRy((v) => v + 15) }
  const [ouverte, setOuverte] = useState(false)
  const porte = ouverte || actif
  return (
    <div className="b3d-bloc">
      <div className="b3d-scene" tabIndex={0} role="img" aria-label="Maquette 3D de la borne Fil d'Or : une armoire avec une porte, des étagères et des petites boîtes de produits. Flèches gauche et droite pour la faire tourner." onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={haut} onKeyDown={touche}>
        <div className="b3d-sol" />
        <div className={`bg ${doux && !auto ? 'doux' : ''}`} style={{ transform: `rotateX(-8deg) rotateY(${ry}deg)` }}>
          <div className="bg-f bg-haut">
            <div className="b3d-haut"><i className="b3d-pic" /><b>Fil d’Or</b></div>
            <div className="b3d-ecran"><span>Choisis ta langue</span><div><i>FR</i><i>EN</i><i>EW</i><i>KA</i><i>MI</i></div></div>
            <div className="bg-micro"><span>Micro</span><span className="bg-hp">{Array.from({ length: 12 }, (_, k) => <i key={k} />)}</span><span>Haut-parleur</span></div>
            <div className="b3d-clavier">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'OK'].map((t, k) => <i key={k}>{t}</i>)}</div>
          </div>
          <div className="bg-f bg-plinthe"><span>Prends ici</span></div>
          <div className="bg-f bg-fond" />
          <div className="bg-f bg-ar"><div className="b3d-trappe"><span>Trappe d’entretien<br />ordinateur, batterie<br />et carte mémoire</span></div><div className="b3d-serrure" /></div>
          <div className="bg-f bg-dr"><div className="b3d-bande" /></div>
          <div className="bg-f bg-ga"><div className="b3d-capt"><span>Panneau solaire<br />sur le toit</span><span>Ventilation</span></div></div>
          <div className="bg-f bg-toit" />
          <div className="bg-f bg-etagere" style={{ top: 198 }} />
          <div className="bg-f bg-etagere" style={{ top: 248 }} />
          <div className="bg-f bg-etagere bg-sol" />
          {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => {
            const m = BOITES[r * 3 + c]
            return (
              <div key={r + '-' + c} className="bg-boite" style={{ left: 16 + c * 72, top: [152, 202, 252][r], '--c': m.c }}>
                <div className="bg-bf bg-bav"><b>{m.t}</b><small>{m.n}</small></div>
                <div className="bg-bf bg-bga" /><div className="bg-bf bg-bdr" /><div className="bg-bf bg-bto" />
              </div>
            )
          }))}
          <div className={`bg-porte${porte ? ' ouverte' : ''}`}><span className="bg-vitre">Produits</span><i className="bg-poignee" /></div>
        </div>
      </div>
      <div className="b3d-vues" role="group" aria-label="Changer de vue">
        {VUES.map(([nom, a]) => <button key={nom} type="button" onClick={() => setRy(a)}>{nom}</button>)}
        <button type="button" aria-pressed={porte} onClick={() => setOuverte((v) => !v)}>{porte ? 'Fermer la porte' : 'Ouvrir la porte'}</button>
      </div>
      <p className="petit">Fais glisser pour tourner, ouvre la porte pour voir les petites boîtes. Concept à fabriquer : la maquette n’est pas un objet existant.</p>
    </div>
  )
}

/** Carte à gratter : un recto discret, un verso où le code se révèle. */
export function Carte3D({ code, quota }) {
  const [verso, setVerso] = useState(false)
  const [gratte, setGratte] = useState(false)
  const joli = code ? `${code.slice(0, 4)} ${code.slice(4)}` : '•••• ••••'
  return (
    <div className="c3d-bloc">
      <div className={`c3d ${verso ? 'verso' : ''}`}>
        <div className="c3d-face c3d-recto"><b>Fil d’Or</b><small>Carte personnelle</small><i /></div>
        <div className="c3d-face c3d-verso">
          <p>Gratte ici, puis tape le numéro sur la borne.</p>
          <button type="button" className={`c3d-gratte ${gratte ? 'ouvert' : ''}`} onClick={() => setGratte(true)} aria-label={gratte ? 'Numéro de la carte' : 'Gratter pour voir le numéro'}>{gratte ? joli : 'Gratter'}</button>
          <small>{quota ?? 'Le numéro et ce qu’il donne droit de retirer sont propres à cette carte.'}</small>
        </div>
      </div>
      <div className="b3d-vues"><button type="button" onClick={() => setVerso((v) => !v)}>{verso ? 'Voir le recto' : 'Retourner la carte'}</button></div>
    </div>
  )
}
