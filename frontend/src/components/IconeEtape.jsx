const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const DESSINS = {
  fleur: <><circle cx="12" cy="12" r="2.4" {...P} /><path {...P} d="M12 9.6V4.5m0 15v-5.1m2.4-2.4h5.1m-15 0h5.1M14 10l3.6-3.6M6.4 17.6 10 14M14 14l3.6 3.6M6.4 6.4 10 10" /></>,
  ventre: <><path {...P} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /><path {...P} d="M12 10v4M10 12h4" /></>,
  berceau: <><path {...P} d="M3 11h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" /><path {...P} d="M6 11V6.5M18 11V6.5M3 21l1.5-2M21 21l-1.5-2" /></>,
  biberon: <><path {...P} d="M9 3h6M10 3v3h4V3" /><rect {...P} x="8" y="6" width="8" height="15" rx="2.5" /><path {...P} d="M8 11h3M8 15h3" /></>,
  jeu: <><rect {...P} x="3.5" y="12" width="7.5" height="7.5" rx="1.5" /><rect {...P} x="13" y="12" width="7.5" height="7.5" rx="1.5" /><path {...P} d="m7 12 3-7 4 4-3 3" /></>,
  ecole: <><path {...P} d="M3 9.5 12 5l9 4.5L12 14z" /><path {...P} d="M7 12v4.5c1.4 1.6 3.2 2.5 5 2.5s3.6-.9 5-2.5V12M21 9.5V15" /></>,
}
export default function IconeEtape({ nom, taille = 30 }) {
  return <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true" focusable="false">{DESSINS[nom]}</svg>
}
