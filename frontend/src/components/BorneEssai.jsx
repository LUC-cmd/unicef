import { useEffect, useMemo, useState } from 'react'
import LecteurQr from './LecteurQr.jsx'
import QrCode from './QrCode.jsx'
import { CARTES_DEMO, PRODUITS, assurerDemo, formater, lienQrCarte, nettoyer, utiliserCode } from '../lib/borne.js'

const LANGUES = ['Français', 'Éwé', 'Kabiyè', 'Mina']
const BESOINS = [
  ['preservatifs', 'Préservatifs', 'Me protéger'],
  ['serviettes', 'Serviettes hygiéniques', 'Mes règles'],
  ['antalgique', 'Douleurs de règles', 'Un antalgique simple'],
  ['bon', 'Parler à une soignante', 'Consultation sans nom'],
]
const RASSURANCE = {
  preservatifs: 'Il n’y a aucune honte à se protéger. Demander des préservatifs, c’est prendre soin de toi. Personne ne saura ton nom ici.',
  serviettes: 'Les règles sont normales. Tu as le droit d’avoir de quoi te protéger, sans honte et sans devoir le demander à quelqu’un.',
  antalgique: 'Avoir mal pendant les règles est fréquent. Tu peux être aidée, et tu n’as pas à souffrir en silence.',
  bon: 'Parler à une soignante sans donner ton nom, c’est possible. Tu choisis ce que tu dis.',
}
const CONSEILS = {
  preservatifs: ['Un préservatif ne sert qu’une seule fois. Mets-le avant tout contact et garde-le au sec, loin de la chaleur.', 'Il protège d’une grossesse et des infections. Pour un test ou une autre méthode, une agente de santé t’accueille sans jugement.', 'Après un rapport sans protection, va vite au centre de santé ou à la pharmacie.'],
  serviettes: ['Change ta serviette toutes les 4 à 6 heures, ou dès qu’elle est pleine.', 'Lave-toi les mains avant et après. Une serviette usagée s’enveloppe puis se jette, elle ne se rince pas dans les toilettes.', 'Des règles qui durent plus de 7 jours ou très abondantes : va au centre de santé.'],
  antalgique: ['Prends-le avec un peu de nourriture et de l’eau, une seule fois, selon la dose écrite sur le sachet.', 'Une bouillotte chaude sur le ventre et du repos peuvent aussi soulager.', 'Une douleur très forte, de la fièvre ou un saignement très abondant : va au centre de santé aujourd’hui. Protocole à valider par un professionnel.'],
  bon: ['Présente le numéro du bon au centre de santé : on te reçoit sans te demander ton nom.', 'Tu peux venir avec une personne de confiance.'],
}
const ICONES = { preservatifs: 'P', serviettes: 'S', antalgique: 'A', bon: 'B' }

/** Essai complet de la borne : langue, besoin, mot de réconfort, carte (numéro ou QR), puis les produits sortent selon ce que la carte permet. */
export default function BorneEssai({ etat, setEtat, cartePerso, besoinInitial, onEtape }) {
  const [etape, setEtape] = useState(0)
  const [langue, setLangue] = useState('Français')
  const [besoins, setBesoins] = useState(() => (besoinInitial ? [besoinInitial] : []))
  useEffect(() => { onEtape?.(etape) }, [etape]) // eslint-disable-line react-hooks/exhaustive-deps
  const [saisie, setSaisie] = useState('')
  const [scan, setScan] = useState(false)
  const [res, setRes] = useState(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => { setEtat(assurerDemo(etat)) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const cartes = useMemo(() => (cartePerso ? [{ serie: 'MA-CARTE', code: cartePerso, quota: null, qui: 'Ma carte personnelle (dans mon espace)' }, ...CARTES_DEMO] : CARTES_DEMO), [cartePerso])
  const ticket = useMemo(() => (res?.ok && res.remis.bon ? String(Math.floor(100000 + Math.random() * 900000)) : null), [res])

  const bascule = (k) => setBesoins((b) => (b.includes(k) ? b.filter((x) => x !== k) : [...b, k]))
  const recommencer = () => { setEtape(0); setBesoins(besoinInitial ? [besoinInitial] : []); setSaisie(''); setRes(null); setErreur(''); setScan(false) }
  const valider = (code) => {
    const demande = Object.fromEntries(Object.keys(PRODUITS).map((k) => [k, besoins.includes(k) ? 10 : 0]))
    const r = utiliserCode(etat, code, demande)
    setEtat(r.etat)
    if (r.ok) { setRes(r); setErreur(''); setEtape(4); return }
    setErreur({
      format: 'Le numéro doit avoir 8 chiffres. Vérifie ce que tu as tapé.',
      inconnu: `Ce numéro n’est pas reconnu. Il te reste ${r.essaisRestants ?? 0} essai(s) avant un blocage de 15 minutes.`,
      bloque: 'Trop d’essais. La borne se bloque 15 minutes.',
      rien: 'Cette carte ne permet pas de retirer ce que tu demandes. Choisis autre chose ou demande une autre carte.',
      'carte-vide': 'Cette carte est vide. Demande une nouvelle carte à l’agente de santé.',
    }[r.raison] ?? 'Réessaie.')
  }
  const apresScan = (texte) => { setScan(false); const c = nettoyer(texte); setSaisie(formater(c.slice(0, 8))); valider(c) }

  return (
    <section className="be" aria-label="Essai de la borne">
      <div className="be-ecran">
        <div className="be-pas" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={etape >= i ? 'on' : ''} />)}</div>
        {etape === 0 && (
          <div className="be-vue" key="0">
            <h2>Bienvenue</h2>
            <p>Choisis ta langue.</p>
            <div className="be-grille">{LANGUES.map((l) => <button key={l} type="button" className={`be-bouton${langue === l ? ' actif' : ''}`} onClick={() => setLangue(l)}>{l}</button>)}</div>
            {langue !== 'Français' && <p className="be-note">Les voix en {langue} sont enregistrées avec des locuteurs du village (page Voix de la borne). Ici, le texte reste en français.</p>}
            <button type="button" className="be-suite" onClick={() => setEtape(1)}>Commencer</button>
          </div>
        )}
        {etape === 1 && (
          <div className="be-vue" key="1">
            <h2>De quoi as-tu besoin ?</h2>
            <p>Tu peux en choisir plusieurs. Personne ne voit ton choix.</p>
            <div className="be-grille">{BESOINS.map(([k, t, s]) => <button key={k} type="button" className={`be-bouton gros${besoins.includes(k) ? ' actif' : ''}`} aria-pressed={besoins.includes(k)} onClick={() => bascule(k)}><b>{t}</b><small>{s}</small></button>)}</div>
            <button type="button" className="be-suite" disabled={!besoins.length} onClick={() => setEtape(2)}>Suivant</button>
          </div>
        )}
        {etape === 2 && (
          <div className="be-vue" key="2">
            <h2>Tu n’as rien à cacher ici</h2>
            {besoins.map((k) => <p key={k} className="be-douce">{RASSURANCE[k]}</p>)}
            <p className="be-note">La borne ne te demande ni nom, ni âge, ni numéro de téléphone.</p>
            <button type="button" className="be-suite" onClick={() => setEtape(3)}>Je continue</button>
          </div>
        )}
        {etape === 3 && (
          <div className="be-vue" key="3">
            <h2>Ta carte</h2>
            <p>Tape le numéro de ta carte, ou scanne le QR code de ta carte.</p>
            {scan ? <LecteurQr titre="Scanner le QR de ma carte" onScan={apresScan} onFermer={() => setScan(false)} /> : (
              <form onSubmit={(e) => { e.preventDefault(); valider(saisie) }} className="be-form">
                <input className="be-num" inputMode="numeric" autoComplete="off" maxLength={9} placeholder="0000 0000" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Numéro de la carte" />
                <div className="be-ligne">
                  <button type="submit" className="be-suite">Valider</button>
                  <button type="button" className="be-sec" onClick={() => setScan(true)}>Scanner mon QR</button>
                </div>
              </form>
            )}
            {erreur && <p className="be-erreur" role="alert">{erreur}</p>}
          </div>
        )}
        {etape === 4 && res?.ok && (
          <div className="be-vue" key="4">
            <h2>Voilà, prends dans le bac</h2>
            <div className="be-bac" role="status">
              {Object.entries(res.remis).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => <span key={k + i} className={`be-objet o-${k}`} style={{ '--d': `${0.2 + i * 0.3}s` }} title={PRODUITS[k]}>{ICONES[k]}</span>))}
              <em>Bac de retrait</em>
            </div>
            <ul className="be-liste">{Object.entries(res.remis).map(([k, n]) => <li key={k}><b>{n}</b> {PRODUITS[k]}</li>)}</ul>
            {ticket && <p className="be-douce">Ton numéro de consultation : <b>{ticket}</b>. Présente-le au centre de santé, sans donner ton nom. <i>(Règle à définir avec les centres.)</i></p>}
            <h3>Quelques conseils</h3>
            {Object.keys(res.remis).map((k) => <div key={k} className="be-conseil"><b>{PRODUITS[k]}</b><ul>{CONSEILS[k].map((c) => <li key={c}>{c}</li>)}</ul></div>)}
            <p className="be-note">Il reste sur ta carte : {Object.entries(res.reste).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${PRODUITS[k].toLowerCase()}`).join(', ') || 'rien'}. Un problème qui t’inquiète ? Va au centre de santé.</p>
            <button type="button" className="be-suite" onClick={recommencer}>Terminer</button>
          </div>
        )}
      </div>
      <aside className="be-cartes">
        <h3>Les cartes à essayer</h3>
        <p className="petit">Chaque carte donne droit à des quantités différentes. Dans la vraie vie, l’agente, l’école ou le village remet la carte. Cartes fictives.</p>
        {cartes.map((c) => (
          <div key={c.serie} className="be-carte">
            <div><b>{c.qui}</b>
              <p className="be-code">{formater(c.code)}</p>
              <small>{c.quota ? Object.entries(c.quota).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${PRODUITS[k].toLowerCase()}`).join(', ') : 'Droits liés à mon espace'}</small>
              <div className="be-ligne"><button type="button" className="be-sec" onClick={() => { setSaisie(formater(c.code)); if (etape === 3) setErreur('') }}>Utiliser ce numéro</button>
                <button type="button" className="be-sec" disabled={etape !== 3} onClick={() => apresScan(lienQrCarte(c.code))}>Simuler le scan du QR</button></div>
            </div>
            <QrCode valeur={lienQrCarte(c.code)} taille={96} titre={`QR de la carte ${c.serie}`} />
          </div>
        ))}
      </aside>
    </section>
  )
}
