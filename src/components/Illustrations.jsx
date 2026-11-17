// Illustrations originales de Fil d'Or : aplats, couleurs du projet, aucun visage réel.
const PEAU = ['#8a5a3c', '#6b4226', '#a56b46']

function Fond({ children, label }) {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={label} className="illustration">
      <rect width="400" height="300" rx="24" fill="#e8f6fc" />
      <circle cx="320" cy="70" r="34" fill="#ffc20e" opacity="0.9" />
      <path d="M0 250 Q100 225 200 245 T400 240 V300 H0Z" fill="#80bd41" opacity="0.85" />
      {children}
    </svg>
  )
}

function Personne({ x, y, echelle = 1, peau = PEAU[0], robe = '#1cabe2', tete = 26 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${echelle})`}>
      <path d={`M-${tete + 12} 0 Q0 -${tete + 30} ${tete + 12} 0 V70 H-${tete + 12}Z`} fill={robe} />
      <circle cx="0" cy={-tete - 8} r={tete} fill={peau} />
      <path d={`M-${tete} -${tete + 12} Q0 -${tete * 2 + 12} ${tete} -${tete + 12}`} fill="#2d2926" />
    </g>
  )
}

export function MereEtEnfant() {
  return (
    <Fond label="Une mère avec son enfant dans les bras, un téléphone à la main">
      <Personne x="170" y="170" robe="#f26a21" />
      <Personne x="215" y="195" echelle={0.5} peau={PEAU[2]} robe="#ffc20e" tete={24} />
      <rect x="250" y="150" width="30" height="52" rx="6" fill="#2d2926" />
      <rect x="254" y="156" width="22" height="34" rx="3" fill="#1cabe2" />
      <path d="M270 140 q12 -10 24 0 M274 128 q18 -14 36 0" fill="none" stroke="#1cabe2" strokeWidth="4" strokeLinecap="round" />
    </Fond>
  )
}

export function AgentDeSante() {
  return (
    <Fond label="Un agent de santé mesure le bras d'un enfant">
      <Personne x="140" y="165" robe="#ffffff" peau={PEAU[1]} />
      <rect x="125" y="150" width="30" height="8" rx="4" fill="#00833d" />
      <Personne x="250" y="195" echelle={0.7} peau={PEAU[2]} robe="#374ea2" tete={24} />
      <path d="M185 190 L225 200" stroke="#ffc20e" strokeWidth="8" strokeLinecap="round" />
      <rect x="95" y="215" width="44" height="34" rx="6" fill="#e2231a" />
      <path d="M117 222 v20 M107 232 h20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </Fond>
  )
}

export function EnfantsQuiJouent() {
  return (
    <Fond label="Des enfants qui jouent ensemble">
      <Personne x="110" y="200" echelle={0.75} peau={PEAU[0]} robe="#f26a21" tete={24} />
      <Personne x="200" y="190" echelle={0.85} peau={PEAU[1]} robe="#1cabe2" tete={24} />
      <Personne x="290" y="205" echelle={0.7} peau={PEAU[2]} robe="#ffc20e" tete={24} />
      <circle cx="155" cy="120" r="13" fill="#e2231a" />
      <circle cx="245" cy="105" r="10" fill="#00833d" />
    </Fond>
  )
}
