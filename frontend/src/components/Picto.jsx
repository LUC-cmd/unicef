/**
 * Pictogrammes de Fil d'Or, dessinés pour le site : aucun emoji système, donc le même rendu sur tous les téléphones.
 * Deux familles :
 *  - au trait (24 px, couleur du texte) : interface, grossesse, santé ;
 *  - à plat (48 px, couleurs fixes) : objets, aliments, animaux et corps des jeux d'éveil.
 * La taille suit le texte (1em) : on règle avec font-size, comme pour une lettre.
 */

const TRAIT = {
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  route: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  carte: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  horloge: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  telephone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  calendrier: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  son: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  musique: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  alerte: 'M12 3 2 20h20zM12 10v4.5M12 17.5h.01',
  conseil: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z',
  hopital: 'M4 21V6h10v15M14 10h6v11M9 9v6M6 12h6M2 21h20',
  ambulance: 'M2 16V7h12v9M14 10h4l4 4v2h-3M2 16h2M10 16h5M7 9.5v4M5 11.5h4M7 18a2 2 0 1 0 0-.01zM17 18a2 2 0 1 0 0-.01z',
  bebe: 'M12 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 7c0-2 1.5-3 3-3M9.5 13h.01M14.5 13h.01M10 16.2c1 .8 3 .8 4 0',
  enceinte: 'M10.5 5.5a2 2 0 1 0 0-.01zM10.5 9c2.2 0 3.3 1.4 3.3 3.5 2.5.4 4 2.6 3.4 5.1-.5 2-2 3.2-4 3.2H9.5l.6-7M8 21h3',
  marche: 'M13 5.5a1.7 1.7 0 1 0 0-.01zM12.5 9l-2.5 4 3 2.5 1 5M10 13l-3 2M12.5 9l3 2.5 3-1M13 15.5l-3 4.5',
  souffle: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5',
  yoga: 'M12 6.5a2 2 0 1 0 0-.01zM12 9.5v4M7 11l5 1.5 5-1.5M12 13.5l-6 5h12z',
  goutte: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  lit: 'M3 19V6M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7V15M7.5 12.5a1.5 1.5 0 1 0 0-.01z',
  parole: 'M4 5h16v11H9.5L5 20v-4H4z',
  chaise: 'M7 3v10M17 13V3M7 8h10M5 13h14M7 13v8M17 13v8',
  jambe: 'M10 3 9 11l1 5-1 5h3.5l1-5-1.2-5 3.2-3V3z',
  pied: 'M8 3v11l-3 4c-.8 1.2 0 3 1.5 3H17c2.5 0 4-1 4-2.5 0-1-1-2-2.5-2.5L13 13V3z',
  panier: 'M3 10h18l-2 10H5zM8 10l3-6M16 10l-3-6M9 14v3M12 14v3M15 14v3',
  lune: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z',
  accroupie: 'M11 5a1.8 1.8 0 1 0 0-.01zM11 8.5l-1 4.5 3.5 2.5-1.5 4.5M10 13l-4 1.5M11 8.5l4 2.5',
  vertige: 'M12 3a6 6 0 0 0-6 6c0 2 1 3 1 5v4h8v-4c0-2 1-3 1-5a6 6 0 0 0-6-6zM2.5 6.5 5 7.5M21.5 6.5 19 7.5M12 1v1.5M10 11l4 4M14 11l-4 4',
  fievre: 'M10 4a2 2 0 1 1 4 0v9.2a4 4 0 1 1-4 0zM12 8v7',
  coeur: 'M12 20.5C6 16.5 3 13 3 9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 9 1.5c0 3.5-3 7-9 11z',
  nausee: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9 10h.01M15 10h.01M8.5 15c1-1.2 2.3-1.2 3.5 0s2.5 1.2 3.5 0',
  eclair: 'M13 2 4 14h7l-1 8 9-12h-7z',
  vaccin: 'M17 3l4 4M15 5l4 4-9 9-4-4zM6 14l-3 7 7-3M13 7l4 4',
  balance: 'M12 4v16M6 20h12M5 8h14M5 8l-3 7h6zM19 8l-3 7h6z',
  bol: 'M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8zM8 7c0-1.5 1-2 1-3.5M13 7c0-1.5 1-2 1-3.5',
  fiche: 'M9 4h6v3H9zM6 5.5h3M15 5.5h3V21H6V5.5M9 12h6M9 16h6',
  courbe: 'M4 20V4M4 20h16M8 15l4-4 3 3 5-6',
  valide: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM8 12l3 3 5-6',
  famille: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 11a3 3 0 1 0 0-6M18 14c2.5.5 4 2.5 4 5',
  etoile: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  de: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
  opposes: 'M4 9h14M14 5l4 4-4 4M20 15H6M10 11l-4 4 4 4',
  danse: 'M13 4a1.8 1.8 0 1 0 0-.01zM12 8l-1 5 3 2v6M11 13l-4 2M12 8l4-2 2 3',
  chiffres: 'M5 8l2-1.5V17M11 9a2 2 0 1 1 4 0c0 2-4 4-4 6h4.5M18 8.5h3l-2 3a2.5 2.5 0 1 1-1 3',
  lettres: 'M3 18l5-13 5 13M5 13.5h6M15 5v13M15 5h3a2.5 2.5 0 0 1 0 5h-3M15 10h3.5a2.5 2.5 0 0 1 0 5H15',
}

/** Étiquettes parlées (lecteurs d'écran) des illustrations à plat. */
export const LIBELLES = {
  mangue: 'une mangue', banane: 'une banane', oeuf: 'un œuf', poisson: 'un poisson', orange: 'une orange', mais: 'un épi de maïs',
  igname: 'une igname', haricots: 'des haricots', arachide: 'une arachide', bonbon: 'un bonbon', sucette: 'une sucette', boisson: 'une boisson sucrée',
  coq: 'le coq', chevre: 'la chèvre', vache: 'la vache', cochon: 'le cochon', chat: 'le chat', chien: 'le chien', singe: 'le singe',
  tortue: 'la tortue', perroquet: 'le perroquet', elephant: "l'éléphant", fourmi: 'la fourmi', guepard: 'le guépard',
  eau: "l'eau", flamme: 'le feu', flocon: 'la glace', soleil: 'le soleil', nuit: 'la nuit', haut: 'vers le haut', bas: 'vers le bas', pluie: 'la pluie', sec: 'la sécheresse',
  savon: 'le savon', mains: 'les mains', serviette: 'la serviette', palette: 'la peinture', triangle: 'un triangle',
  'corps-tete': 'la tête', 'corps-main': 'la main', 'corps-pied': 'le pied', 'corps-ventre': 'le ventre', 'corps-genou': 'le genou', 'corps-oeil': "l'œil",
}

const O = '#F28C28', J = '#FFC20E', V = '#3A9D5D', R = '#D64545', B = '#8B5A2B', RO = '#F4A6A6', G = '#8A98A8', C = '#1CABE2', CR = '#FFF1D0', N = '#0b3a63'

/** Visage d'animal : tête + détails, sur un cadre de 48. */
const yeux = (x1 = 18, x2 = 30, y = 24) => (<><circle cx={x1} cy={y} r="2.2" fill={N} /><circle cx={x2} cy={y} r="2.2" fill={N} /></>)

const PLAT = {
  mangue: <><path d="M9 29c0-12 10-19 21-16 6 2 9 8 7 15-2 9-10 13-18 11-6-1-10-4-10-10z" fill="#F4A62A" /><path d="M14 31c0-6 4-11 10-13" stroke="#E4572E" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".55" /><path d="M27 13c0-4 4-7 9-7 0 5-4 8-9 7z" fill={V} /></>,
  banane: <><path d="M8 11c0 17 11 29 31 26-3 5-10 8-17 6C11 40 3 26 8 11z" fill="#FFD23F" /><path d="M8 11c-1-2 0-5 2-6l3 3z" fill={B} /><path d="M12 14c2 12 10 20 22 22" stroke="#E5A800" strokeWidth="2" fill="none" strokeLinecap="round" /></>,
  oeuf: <><ellipse cx="24" cy="27" rx="12" ry="15" fill={CR} stroke="#E8C99A" strokeWidth="2" /><ellipse cx="19" cy="21" rx="3" ry="5" fill="#fff" opacity=".7" /></>,
  poisson: <><path d="M35 24l11-9v18z" fill="#2F7FB5" /><ellipse cx="22" cy="24" rx="16" ry="11" fill="#4DA3D9" /><path d="M20 14c3-4 8-5 11-3-2 3-6 4-11 3z" fill="#2F7FB5" /><circle cx="14" cy="21" r="2.6" fill="#fff" /><circle cx="13.4" cy="21" r="1.2" fill={N} /><path d="M26 17c2 4 2 10 0 14" stroke="#fff" strokeWidth="2" opacity=".5" fill="none" /></>,
  orange: <><circle cx="24" cy="27" r="16" fill={O} /><path d="M24 11c0-4 3-6 7-6 0 4-3 6-7 6z" fill={V} /><circle cx="18" cy="21" r="4" fill="#fff" opacity=".22" /></>,
  mais: <><path d="M24 4c7 6 9 17 6 28-2 5-4 8-6 10-2-2-4-5-6-10-3-11-1-22 6-28z" fill="#FFD23F" /><path d="M24 4v38M19 14h10M18 22h12M19 30h10" stroke="#E5A800" strokeWidth="1.6" /><path d="M24 43C13 41 8 31 10 21c5 4 11 10 14 22zM24 43c11-2 16-12 14-22-5 4-11 10-14 22z" fill={V} /></>,
  igname: <><path d="M5 31c2-10 15-18 28-15 9 2 12 8 9 13-4 8-19 12-30 8-4-2-8-3-7-6z" fill="#B07A47" /><path d="M14 26l4 3M22 22l3 4M30 24l2 4" stroke="#8B5A2B" strokeWidth="2" strokeLinecap="round" /></>,
  haricots: <><path d="M6 24c0-9 11-13 17-9s4 12-4 16-13 0-13-7z" fill="#A5473A" /><path d="M24 33c-4-8 2-18 11-17s11 11 4 17-12 4-15 0z" fill="#C25A4A" /><path d="M12 22c2-3 6-4 8-3M30 23c2-3 6-4 7-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".45" fill="none" /></>,
  arachide: <><path d="M15 15 33 33" stroke="#E3B778" strokeWidth="14" strokeLinecap="round" /><circle cx="15" cy="15" r="9.5" fill="#E3B778" /><circle cx="33" cy="33" r="9.5" fill="#E3B778" /><g fill="#C48E4E" opacity=".75"><circle cx="12" cy="12" r="1.2" /><circle cx="17" cy="18" r="1.2" /><circle cx="22" cy="23" r="1.2" /><circle cx="27" cy="27" r="1.2" /><circle cx="33" cy="30" r="1.2" /><circle cx="36" cy="36" r="1.2" /></g></>,
  bonbon: <><path d="M15 24 4 16v16zM33 24l11-8v16z" fill={RO} /><circle cx="24" cy="24" r="10" fill={R} /><path d="M18 20c3-3 8-3 11 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".6" /></>,
  sucette: <><rect x="23" y="27" width="3" height="17" rx="1.5" fill="#C9B79C" /><circle cx="24.5" cy="19" r="13" fill={RO} /><circle cx="24.5" cy="19" r="8.5" fill="none" stroke="#fff" strokeWidth="2.4" /><circle cx="24.5" cy="19" r="3.6" fill="none" stroke="#fff" strokeWidth="2.4" /></>,
  boisson: <><path d="M26 15l4-10h8" stroke="#555" strokeWidth="3" strokeLinecap="round" fill="none" /><path d="M12 15h24l-3 27H15z" fill={R} /><rect x="10" y="12" width="28" height="5" rx="2.5" fill="#fff" /><path d="M15 25h18" stroke="#fff" strokeWidth="2.4" opacity=".5" /></>,

  coq: <><circle cx="23" cy="28" r="14" fill="#fff" stroke="#E2DCCF" strokeWidth="2" /><circle cx="18" cy="9" r="4.5" fill={R} /><circle cx="25" cy="7" r="4.5" fill={R} /><circle cx="31" cy="10" r="4" fill={R} /><path d="M35 26l11 3-11 4z" fill={J} /><ellipse cx="33" cy="36" rx="3.2" ry="5" fill={R} /><circle cx="26" cy="24" r="2.3" fill={N} /></>,
  chevre: <><path d="M13 14c-2-5-1-9 3-11 0 4 2 6 4 8zM35 14c2-5 1-9-3-11 0 4-2 6-4 8z" fill="#C9B79C" /><ellipse cx="8" cy="22" rx="6" ry="3" transform="rotate(25 8 22)" fill="#E4DCCB" /><ellipse cx="40" cy="22" rx="6" ry="3" transform="rotate(-25 40 22)" fill="#E4DCCB" /><path d="M13 16c0 14 3 22 11 22s11-8 11-22c-4-4-18-4-22 0z" fill="#F0E8D8" /><path d="M24 38l-3 7h6z" fill="#C9B79C" /><ellipse cx="24" cy="33" rx="5" ry="3.4" fill={RO} />{yeux(18, 30, 23)}</>,
  vache: <><path d="M10 12c-4-1-6-4-6-7 4 0 7 2 8 5zM38 12c4-1 6-4 6-7-4 0-7 2-8 5z" fill="#C9B79C" /><ellipse cx="9" cy="19" rx="6" ry="3.2" transform="rotate(20 9 19)" fill="#444" /><ellipse cx="39" cy="19" rx="6" ry="3.2" transform="rotate(-20 39 19)" fill="#444" /><path d="M12 13c-1 14 2 29 12 29s13-15 12-29c-5-3-19-3-24 0z" fill="#fff" stroke="#E2DCCF" strokeWidth="2" /><path d="M14 14c4-1 7 1 6 5-3 1-6-1-6-5z" fill="#444" /><ellipse cx="24" cy="35" rx="8.5" ry="6" fill={RO} /><circle cx="21" cy="35" r="1.4" fill={N} /><circle cx="27" cy="35" r="1.4" fill={N} />{yeux(18, 30, 24)}</>,
  cochon: <><path d="M9 17 7 6l11 5zM39 17l2-11-11 5z" fill="#EE8E9A" /><circle cx="24" cy="26" r="17" fill={RO} /><ellipse cx="24" cy="31" rx="8" ry="6" fill="#EE8E9A" /><circle cx="21" cy="31" r="1.6" fill="#B84E5C" /><circle cx="27" cy="31" r="1.6" fill="#B84E5C" />{yeux(17, 31, 22)}</>,
  chat: <><path d="M8 20 9 4l12 8zM40 20 39 4 27 12z" fill="#E08A3C" /><path d="M11 16 11.5 9 16 12zM37 16l-.5-7L32 12z" fill={RO} /><circle cx="24" cy="27" r="16" fill="#F2A55A" />{yeux(17.5, 30.5, 24)}<path d="M22 30h4l-2 2.4z" fill="#C25A5A" /><path d="M4 28l11 2M4 34l11-2M44 28l-11 2M44 34l-11-2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".8" /></>,
  chien: <><ellipse cx="8" cy="22" rx="6" ry="12" transform="rotate(12 8 22)" fill="#6B4423" /><ellipse cx="40" cy="22" rx="6" ry="12" transform="rotate(-12 40 22)" fill="#6B4423" /><circle cx="24" cy="25" r="15" fill="#B9854F" /><ellipse cx="24" cy="32" rx="8" ry="6.5" fill="#EBD3B0" /><ellipse cx="24" cy="29.5" rx="3.6" ry="2.6" fill={N} />{yeux(17.5, 30.5, 22)}</>,
  singe: <><circle cx="7" cy="25" r="5.5" fill="#7A4B2A" /><circle cx="41" cy="25" r="5.5" fill="#7A4B2A" /><circle cx="24" cy="23" r="16" fill="#8B5A2B" /><path d="M12 22c0-5 5-6 8-3 2-2 6-2 8 0 3-3 8-2 8 3 0 7-5 18-12 18S12 29 12 22z" fill="#F0D2AA" />{yeux(19, 29, 24)}<path d="M20 33c2.5 2 5.5 2 8 0" stroke={N} strokeWidth="2" strokeLinecap="round" fill="none" /></>,
  tortue: <><ellipse cx="38" cy="30" rx="6" ry="5" fill="#7BB661" /><circle cx="40" cy="29" r="1.3" fill={N} /><path d="M6 36c0-14 8-22 17-22s17 8 17 22z" fill="#4E9A5B" /><path d="M23 14v22M12 36c0-8 4-14 11-16M34 36c0-8-3-13-11-16" stroke="#2F6F3E" strokeWidth="2" fill="none" /><rect x="10" y="35" width="7" height="7" rx="2.5" fill="#7BB661" /><rect x="28" y="35" width="7" height="7" rx="2.5" fill="#7BB661" /></>,
  perroquet: <><path d="M10 40c-5-18 3-34 18-34 9 0 14 8 12 18-2 12-14 18-30 16z" fill={V} /><circle cx="28" cy="16" r="9" fill="#5DBB7A" /><path d="M35 14c5-1 8 2 7 6-1 3-4 4-6 2l-3-2z" fill={R} /><circle cx="27" cy="14" r="2.4" fill="#fff" /><circle cx="27.4" cy="14.2" r="1.2" fill={N} /><path d="M14 34c4-1 8-5 9-10 3 6 0 12-9 10z" fill="#2F7F4B" /><path d="M6 44l7-6" stroke={J} strokeWidth="4" strokeLinecap="round" /></>,
  elephant: <><path d="M8 11c-7 1-9 11-5 17 3 3 7 2 9-1z" fill="#A9B4C0" /><path d="M40 11c7 1 9 11 5 17-3 3-7 2-9-1z" fill="#A9B4C0" /><circle cx="24" cy="20" r="14" fill={G} /><path d="M20 28c-1 8-1 13 3 15 3 1 5-1 4-3-3 0-3-3-3-12z" fill={G} /><path d="M20 28c-1 8-1 13 3 15" stroke="#7B8896" strokeWidth="1.6" fill="none" />{yeux(17, 31, 18)}</>,
  fourmi: <><ellipse cx="11" cy="26" rx="7" ry="5.5" fill="#3B2A22" /><ellipse cx="24" cy="26" rx="4.5" ry="4" fill="#3B2A22" /><ellipse cx="37" cy="26" rx="7.5" ry="6" fill="#3B2A22" /><path d="M4 22c-2-6 0-10 4-12M8 22C6 16 8 13 11 11M20 30l-4 9M26 30l1 9M33 31l3 8M17 22l-3-8M24 22l1-8M30 22l5-6" stroke="#3B2A22" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
  guepard: <><path d="M9 20 10 6l10 6zM39 20 38 6 28 12z" fill="#E6B34A" /><circle cx="24" cy="26" r="16" fill="#F0C063" /><circle cx="14" cy="18" r="1.9" fill="#5B3B1A" /><circle cx="34" cy="18" r="1.9" fill="#5B3B1A" /><circle cx="22" cy="14" r="1.6" fill="#5B3B1A" /><circle cx="27" cy="15" r="1.6" fill="#5B3B1A" /><circle cx="11" cy="28" r="1.8" fill="#5B3B1A" /><circle cx="37" cy="28" r="1.8" fill="#5B3B1A" />{yeux(17.5, 30.5, 23)}<path d="M17 25c-1 5 0 8 3 10M31 25c1 5 0 8-3 10" stroke="#5B3B1A" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M22 30h4l-2 2.4z" fill={N} /></>,

  flamme: <><path d="M24 4c2 8 12 12 12 24a12 12 0 0 1-24 0c0-5 3-8 5-11 1 3 2 4 4 4 0-5-1-10 3-17z" fill={O} /><path d="M24 22c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 1 2 2 3 1z" fill={J} /></>,
  flocon: <><g stroke={C} strokeWidth="3" strokeLinecap="round" fill="none"><path d="M24 5v38M7.5 14.5l33 19M7.5 33.5l33-19" /><path d="M19 8l5 4 5-4M19 40l5-4 5 4M9 20l6 1-1 6M39 20l-6 1 1 6M9 28l6-1-1-6M39 28l-6-1 1-6" strokeWidth="2.4" /></g></>,
  soleil: <><circle cx="24" cy="24" r="9.5" fill={J} /><g stroke={O} strokeWidth="3.2" strokeLinecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2" /></g></>,
  nuit: <><path d="M36 30A15 15 0 1 1 20 9a12 12 0 0 0 16 21z" fill="#F7D774" /><circle cx="37" cy="12" r="2" fill="#F7D774" /><circle cx="42" cy="22" r="1.4" fill="#F7D774" /></>,
  haut: <><circle cx="24" cy="24" r="19" fill="#e4f4fc" /><path d="M24 36V14M14 23l10-10 10 10" stroke={C} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  bas: <><circle cx="24" cy="24" r="19" fill="#e4f4fc" /><path d="M24 12v22M14 25l10 10 10-10" stroke={C} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  pluie: <><path d="M13 28a8 8 0 0 1 1-16 11 11 0 0 1 21 3 7 7 0 0 1-1 13z" fill="#9DB4C8" /><g stroke={C} strokeWidth="3.2" strokeLinecap="round"><path d="M16 34l-2 7M25 34l-2 7M34 34l-2 7" /></g></>,
  sec: <><circle cx="35" cy="12" r="6" fill={J} /><path d="M4 44V32c0-3 3-5 6-5h28c3 0 6 2 6 5v12z" fill="#D9A760" /><path d="M10 32l5 5-3 5M22 30l-2 6 6 3-1 5M34 32l-4 5 5 3" stroke="#9C6B2F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,

  eau: <path d="M24 4s14 15 14 26a14 14 0 0 1-28 0C10 19 24 4 24 4z" fill={C} />,
  savon: <><rect x="8" y="22" width="30" height="18" rx="7" fill="#9AD8F2" /><rect x="8" y="22" width="30" height="8" rx="4" fill="#c4ebfa" /><circle cx="15" cy="12" r="5" fill="none" stroke={C} strokeWidth="2.4" /><circle cx="27" cy="9" r="3.6" fill="none" stroke={C} strokeWidth="2.4" /><circle cx="36" cy="15" r="4.4" fill="none" stroke={C} strokeWidth="2.4" /></>,
  mains: <><path d="M10 30 8 17a2.2 2.2 0 0 1 4.4-.6l1 6V9a2.2 2.2 0 0 1 4.4 0v11-13a2.2 2.2 0 0 1 4.4 0v13V9a2.2 2.2 0 0 1 4.4 0v12l2-5a2.2 2.2 0 0 1 4.2 1.4L33 34c-1 5-5 8-11 8-7 0-12-4-12-12z" fill="#E8B88A" /><circle cx="39" cy="12" r="3" fill="none" stroke={C} strokeWidth="2.2" /><circle cx="43" cy="21" r="2" fill="none" stroke={C} strokeWidth="2.2" /></>,
  serviette: <><path d="M6 12h30l6 6v24H12l-6-6z" fill="#fff" stroke="#C7D3DE" strokeWidth="2" strokeLinejoin="round" /><path d="M6 12l6 6h30M12 18v24" stroke="#C7D3DE" strokeWidth="2" fill="none" /><path d="M18 25h18M18 31h18M18 37h12" stroke={C} strokeWidth="2.6" strokeLinecap="round" /></>,
  palette: <><path d="M24 5C13 5 5 13 5 24s8 19 18 19c4 0 5-3 3-6-2-4 0-7 4-7h6c5 0 8-3 8-7C44 12 35 5 24 5z" fill="#F2DDB8" /><circle cx="15" cy="20" r="3.4" fill={R} /><circle cx="23" cy="13" r="3.4" fill={J} /><circle cx="33" cy="15" r="3.4" fill={V} /><circle cx="36" cy="25" r="3.4" fill={C} /></>,
  triangle: <><path d="M24 6 43 40H5z" fill={O} strokeLinejoin="round" /><path d="M24 14 35 34H13z" fill="#fff" opacity=".28" /></>,

  /* Le corps humain : une silhouette, la partie demandée est en couleur. */
}

/** Silhouette d'enfant : la partie à trouver est surlignée. */
function Corps({ partie }) {
  const base = '#C9D5E0', fort = O
  const col = (p) => (partie === p ? fort : base)
  if (partie === 'oeil') {
    return (
      <>
        <ellipse cx="24" cy="24" rx="19" ry="11" fill="#fff" stroke={base} strokeWidth="2.4" />
        <circle cx="24" cy="24" r="8.2" fill={C} /><circle cx="24" cy="24" r="3.6" fill={N} /><circle cx="27" cy="21" r="1.6" fill="#fff" />
      </>
    )
  }
  return (
    <>
      <circle cx="24" cy="8.5" r="6" fill={col('tete')} />
      <rect x="17" y="16" width="14" height="16" rx="5" fill={base} />
      {partie === 'epaules' && <><circle cx="17.5" cy="18.5" r="4" fill={fort} /><circle cx="30.5" cy="18.5" r="4" fill={fort} /></>}
      {partie === 'ventre' && <ellipse cx="24" cy="26" rx="5.5" ry="5" fill={fort} />}
      <path d="M17.5 18 8 28M30.5 18 40 28" stroke={base} strokeWidth="5" strokeLinecap="round" />
      {partie === 'main' && <><circle cx="7" cy="29" r="4" fill={fort} /><circle cx="41" cy="29" r="4" fill={fort} /></>}
      <path d="M20.5 31 19 42M27.5 31 29 42" stroke={base} strokeWidth="5.4" strokeLinecap="round" />
      {partie === 'genou' && <><circle cx="19.8" cy="37" r="3.4" fill={fort} /><circle cx="28.2" cy="37" r="3.4" fill={fort} /></>}
      {partie === 'pied' && <><ellipse cx="18" cy="44" rx="4.6" ry="2.6" fill={fort} /><ellipse cx="30" cy="44" rx="4.6" ry="2.6" fill={fort} /></>}
    </>
  )
}

export function Picto({ nom, taille, titre, className = '' }) {
  const dimension = taille ? `${taille}px` : '1em'
  const commun = {
    width: dimension, height: dimension, className: `picto ${className}`.trim(), focusable: 'false',
    ...(titre ? { role: 'img', 'aria-label': titre } : { 'aria-hidden': 'true' }),
  }
  if (TRAIT[nom]) {
    return (
      <svg {...commun} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={TRAIT[nom]} /></svg>
    )
  }
  if (nom && nom.startsWith('corps-')) {
    return <svg {...commun} viewBox="0 0 48 48"><Corps partie={nom.slice(6)} /></svg>
  }
  if (PLAT[nom]) return <svg {...commun} viewBox="0 0 48 48">{PLAT[nom]}</svg>
  return null
}

/** Nom des pictogrammes disponibles (pour la planche de contrôle et les tests). */
export const NOMS_PICTOS = [...Object.keys(TRAIT), ...Object.keys(PLAT), 'corps-tete', 'corps-main', 'corps-pied', 'corps-ventre', 'corps-genou', 'corps-oeil', 'corps-epaules']

export default Picto
