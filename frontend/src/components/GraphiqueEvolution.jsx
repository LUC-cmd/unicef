import { useMemo, useState } from 'react'
import Picto from './Picto.jsx'

/**
 * Graphique SVG pur d'évolution temporelle de l'indice d'oubli sur 4 semaines.
 * Lit les instantanés stockés dans localStorage ('fildor.carte.snapshots'),
 * calcule une projection linéaire (régression simple) et propose des points interactifs avec tooltip.
 */
export default function GraphiqueEvolution({ zone, titre }) {
  const [pointSurvole, setPointSurvole] = useState(null)

  // Récupération des snapshots hebdomadaires depuis le localStorage
  const snapshots = useMemo(() => {
    try {
      const brut = localStorage.getItem('fildor.carte.snapshots')
      return JSON.parse(brut || '[]')
    } catch {
      return []
    }
  }, [zone])

  // Extraction de la série de données pour la zone demandée (ou moyenne globale par défaut)
  const serie = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return []

    return snapshots
      .map((snap) => {
        let valeur = null
        if (zone && snap.indices && snap.indices[zone] !== undefined) {
          valeur = snap.indices[zone]
        } else if (!zone && snap.indices) {
          const vals = Object.values(snap.indices).filter((v) => typeof v === 'number')
          valeur = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
        }
        return {
          semaine: snap.semaine || 'Sem.',
          indice: valeur,
        }
      })
      .filter((item) => typeof item.indice === 'number')
  }, [snapshots, zone])

  // Calcul de la régression linéaire pour la projection à S+1
  const projection = useMemo(() => {
    const n = serie.length
    if (n < 2) return null

    let somX = 0
    let somY = 0
    let somXY = 0
    let somX2 = 0

    serie.forEach((pt, i) => {
      somX += i
      somY += pt.indice
      somXY += i * pt.indice
      somX2 += i * i
    })

    const denom = n * somX2 - somX * somX
    if (denom === 0) return null

    const pente = (n * somXY - somX * somY) / denom
    const ordonnee = (somY - pente * somX) / n

    // Projection sur la semaine suivante (index = n)
    const valeurProjetee = Math.max(0, Math.min(100, Math.round(pente * n + ordonnee)))
    return {
      pente,
      valeurProjetee,
      index: n,
    }
  }, [serie])

  // Si pas assez de données
  if (serie.length < 2) {
    return (
      <div
        className="carte"
        style={{
          padding: '1.2rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e0',
          borderRadius: '8px',
        }}
      >
        <p style={{ fontWeight: 600, color: '#4a5568', margin: '0 0 0.35rem 0' }}>
          <Picto nom="courbe" /> Évolution temporelle de l'indice
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>
          Données insuffisantes pour tracer l'évolution (au moins 2 semaines enregistrées nécessaires).
          Les données s'enregistrent automatiquement chaque semaine sur cet appareil.
        </p>
      </div>
    )
  }

  // Dimensions et repère SVG
  const L = 540
  const H = 270
  const padGauche = 45
  const padDroite = 65
  const padHaut = 35
  const padBas = 45

  const largGraph = L - padGauche - padDroite
  const hautGraph = H - padHaut - padBas

  const nbPoints = serie.length
  const nbIntervalles = nbPoints // Réserve l'espace pour le point projeté

  const getX = (idx) => padGauche + (idx / nbIntervalles) * largGraph
  const getY = (val) => padHaut + (1 - Math.max(0, Math.min(100, val)) / 100) * hautGraph

  // Construction du chemin SVG (courbe de données réelles)
  const pointsCoords = serie.map((pt, i) => ({
    x: getX(i),
    y: getY(pt.indice),
    indice: pt.indice,
    semaine: pt.semaine,
  }))

  const cheminLigne = pointsCoords
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ')

  const cheminAire = `${cheminLigne} L ${pointsCoords[pointsCoords.length - 1].x.toFixed(1)} ${getY(0).toFixed(1)} L ${pointsCoords[0].x.toFixed(1)} ${getY(0).toFixed(1)} Z`

  // Coordonnées pour la ligne de projection
  const dernierPoint = pointsCoords[pointsCoords.length - 1]
  const ptProjeteCoord = projection
    ? {
        x: getX(projection.index),
        y: getY(projection.valeurProjetee),
        indice: projection.valeurProjetee,
      }
    : null

  const ySeuil60 = getY(60)

  return (
    <div className="carte" style={{ padding: '1rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#16325c' }}>
          {titre || `Évolution de l'indice d'oubli${zone ? ` (${zone})` : ''}`}
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#718096' }}>Sur les 4 dernières semaines</span>
      </div>

      <svg
        viewBox={`0 0 ${L} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="Graphique d'évolution de l'indice d'oubli"
      >
        <defs>
          {/* Gradient linéaire vertical pour la ligne : vert (0) -> orange -> rouge (100) */}
          <linearGradient id="gradient-indice-evo" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#00833d" />
            <stop offset="35%" stopColor="#ffc20e" />
            <stop offset="60%" stopColor="#f26a21" />
            <stop offset="100%" stopColor="#e2231a" />
          </linearGradient>

          {/* Remplissage doux sous la ligne */}
          <linearGradient id="gradient-aire-evo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1cabe2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1cabe2" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grille horizontale et graduations Y (0, 20, 40, 60, 80, 100) */}
        {[0, 20, 40, 60, 80, 100].map((v) => {
          const y = getY(v)
          return (
            <g key={v}>
              <line
                x1={padGauche}
                y1={y}
                x2={padGauche + largGraph}
                y2={y}
                stroke={v === 60 ? 'none' : '#e2e8f0'}
                strokeWidth="1"
              />
              <text
                x={padGauche - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#718096"
                fontWeight={v === 60 ? 'bold' : 'normal'}
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Ligne de seuil d'alerte critique à 60 (rouge pointillé) */}
        <line
          x1={padGauche}
          y1={ySeuil60}
          x2={padGauche + largGraph}
          y2={ySeuil60}
          stroke="#e2231a"
          strokeWidth="1.5"
          strokeDasharray="5,4"
        />
        <text
          x={padGauche + largGraph + 6}
          y={ySeuil60 + 3}
          fill="#e2231a"
          fontSize="10"
          fontWeight="bold"
        >
          Alerte (60)
        </text>

        {/* Graduations et étiquettes axe X (Semaines) */}
        {pointsCoords.map((pt, i) => (
          <g key={i}>
            <line x1={pt.x} y1={padHaut + hautGraph} x2={pt.x} y2={padHaut + hautGraph + 5} stroke="#a0aec0" />
            <text
              x={pt.x}
              y={padHaut + hautGraph + 18}
              textAnchor="middle"
              fontSize="11"
              fill="#4a5568"
              fontWeight={i === pointsCoords.length - 1 ? '600' : 'normal'}
            >
              {pt.semaine}
            </text>
          </g>
        ))}

        {/* Étiquette projection axe X */}
        {ptProjeteCoord && (
          <g>
            <line x1={ptProjeteCoord.x} y1={padHaut + hautGraph} x2={ptProjeteCoord.x} y2={padHaut + hautGraph + 5} stroke="#a0aec0" strokeDasharray="2,2" />
            <text
              x={ptProjeteCoord.x}
              y={padHaut + hautGraph + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#718096"
              fontStyle="italic"
            >
              S+1 (proj.)
            </text>
          </g>
        )}

        {/* Aire sous la courbe */}
        <path d={cheminAire} fill="url(#gradient-aire-evo)" />

        {/* Droite de régression / projection (grise pointillée) */}
        {ptProjeteCoord && (
          <g>
            <line
              x1={dernierPoint.x}
              y1={dernierPoint.y}
              x2={ptProjeteCoord.x}
              y2={ptProjeteCoord.y}
              stroke="#718096"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
            {/* Point projeté */}
            <circle
              cx={ptProjeteCoord.x}
              cy={ptProjeteCoord.y}
              r="4.5"
              fill="#ffffff"
              stroke="#718096"
              strokeWidth="2"
              strokeDasharray="2,2"
            />
            <text
              x={ptProjeteCoord.x}
              y={ptProjeteCoord.y - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#718096"
              fontWeight="bold"
            >
              ~{ptProjeteCoord.indice}
            </text>
          </g>
        )}

        {/* Courbe principale avec gradient */}
        <path
          d={cheminLigne}
          fill="none"
          stroke="url(#gradient-indice-evo)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points interactifs réels avec survol */}
        {pointsCoords.map((pt, i) => {
          const estSurvole = pointSurvole === i
          const couleurPoint = pt.indice >= 60 ? '#e2231a' : pt.indice >= 35 ? '#f26a21' : '#00833d'
          return (
            <g key={i}>
              {/* Zone invisible élargie pour faciliter le survol tactile/souris */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="16"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setPointSurvole(i)}
                onMouseLeave={() => setPointSurvole(null)}
                onTouchStart={() => setPointSurvole(i)}
              />

              {/* Point visible */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={estSurvole ? '6.5' : '4.5'}
                fill="#ffffff"
                stroke={couleurPoint}
                strokeWidth="2.8"
                style={{ transition: 'r 0.15s ease', pointerEvents: 'none' }}
              />

              {/* Tooltip au survol */}
              {estSurvole && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={pt.x - 45}
                    y={Math.max(8, pt.y - 42)}
                    width="90"
                    height="32"
                    rx="5"
                    fill="#16325c"
                    opacity="0.94"
                  />
                  <text
                    x={pt.x}
                    y={Math.max(8, pt.y - 42) + 14}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {pt.semaine} : {pt.indice}/100
                  </text>
                  <text
                    x={pt.x}
                    y={Math.max(8, pt.y - 42) + 26}
                    textAnchor="middle"
                    fill={couleurPoint}
                    fontSize="9"
                    fontWeight="600"
                  >
                    {pt.indice >= 60 ? 'Critique' : pt.indice >= 35 ? 'Attention' : 'Bien suivi'}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.78rem', color: '#718096' }}>
        <span><i className="pastille-etat bonne" /> 0 : Très bien suivi</span>
        <span style={{ color: '#e2231a', fontWeight: 'bold' }}>-- Seuil d'alerte : 60</span>
        <span><i className="pastille-etat mauvaise" /> 100 : Zone oubliée</span>
      </div>
    </div>
  )
}
