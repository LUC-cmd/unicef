import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import LecteurQr from '../components/LecteurQr.jsx'
import QrCode from '../components/QrCode.jsx'
import { envoyerOuGarder, reseau } from '../lib/reseauClient.js'

const STATUT = { fait: ['Déjà fait', 'etat-prise'], 'a-faire': ['À donner', 'etat-envoyee'], 'non-concerne': ['Pas concerné à cet âge', ''] }
const VILLAGES = [['agbele', 'Agbélé'], ['kpadape', 'Kpadapé'], ['zogbedji', 'Zogbédji'], ['davie', 'Davié'], ['tovegan', 'Tovégan']]
const age = (m) => (m < 24 ? `${m} mois` : `${Math.floor(m / 12)} an${m >= 24 ? 's' : ''}${m % 12 ? ` ${m % 12} mois` : ''}`)

/** Campagne porte-à-porte : un QR collé sur la maison. L'agent le scanne, voit qui a déjà reçu quoi, et ne donne que ce qui manque. */
export default function Campagne({ s }) {
  const [liste, setListe] = useState([])
  const [code, setCode] = useState('')
  const [foyer, setFoyer] = useState(null)
  const [scan, setScan] = useState(false)
  const [msg, setMsg] = useState('')
  const [nouveau, setNouveau] = useState({ village: 'agbele', ages: [''] })
  const [cree, setCree] = useState(null)

  const charger = useCallback(async () => { try { setListe((await reseau.get('foyers', s.jeton)).foyers) } catch { /* hors ligne */ } }, [s.jeton])
  useEffect(() => { charger() }, [charger])
  const [params] = useSearchParams()

  const ouvrir = async (c) => {
    const brut = String(c || code).trim().toUpperCase().replace('FILDOR-FOYER:', '')
    setMsg(''); setCree(null)
    try { setFoyer(await reseau.get(`foyers/${encodeURIComponent(brut)}`, s.jeton)); setCode(brut) } catch (e) { setFoyer(null); setMsg(e.message) }
  }
  const depuis = params.get('foyer')
  useEffect(() => { if (depuis) ouvrir(depuis) }, [depuis]) // eslint-disable-line react-hooks/exhaustive-deps
  const donner = async (enfant, soin) => {
    setMsg('')
    const r = await envoyerOuGarder(`foyers/${foyer.code}/soins`, { enfant, soin })
    if (r.ok) { setMsg(r.donnees.message ?? 'Enregistré.'); setFoyer(await reseau.get(`foyers/${foyer.code}`, s.jeton)); charger() }
    else if (r.gardee) setMsg('Pas de réseau : le soin est gardé sur ce téléphone et sera envoyé dès le retour de la connexion. Ne le redonnez pas.')
    else setMsg(r.erreur)
  }
  const creer = async (e) => {
    e.preventDefault(); setMsg('')
    const enfants = nouveau.ages.filter((a) => a !== '').map((a) => ({ ageMois: Number(a) }))
    const r = await envoyerOuGarder('foyers', { village: nouveau.village, enfants })
    if (r.ok) { setCree(r.donnees); setFoyer(null); setNouveau({ ...nouveau, ages: [''] }); charger() }
    else setMsg(r.gardee ? 'Pas de réseau : la création est gardée. Le QR sera disponible dès le retour de la connexion.' : r.erreur)
  }

  return (
    <>
      <Bandeau titre="Campagne porte-à-porte">Chaque maison reçoit un QR à coller sur la porte. À chaque passage, scannez-le : vous voyez quels enfants ont déjà reçu vitamine A, déparasitage ou rappel, et vous ne donnez que ce qui manque. Aucun nom, seulement des codes. Règles de démonstration, à valider avec le ministère de la Santé.</Bandeau>
      <section className="carte">
        <h2>Scanner ou saisir le code de la maison</h2>
        <div className="ado-champs">
          <label>Code du foyer<input value={code} placeholder="FOY-1037" maxLength={24} onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
          <p><button type="button" className="bouton" onClick={() => ouvrir()}>Ouvrir</button> <button type="button" className="bouton secondaire" onClick={() => setScan(true)}>Scanner avec la caméra</button></p>
        </div>
        {scan && <LecteurQr titre="Scanner le QR de la maison" onScan={(v) => { setScan(false); ouvrir(v) }} onFermer={() => setScan(false)} />}
        {msg && <p role="status">{msg}</p>}
      </section>

      {foyer && (
        <section className="carte">
          <h2>Maison {foyer.code} · {VILLAGES.find((v) => v[0] === foyer.village)?.[1]}</h2>
          <p className="petit">{foyer.nbEnfants} enfant{foyer.nbEnfants > 1 ? 's' : ''} · {foyer.faits} soin{foyer.faits > 1 ? 's' : ''} déjà fait{foyer.faits > 1 ? 's' : ''} · {foyer.aFaire} à donner</p>
          <ul className="foyer-enfants">
            {foyer.enfants.map((e) => (
              <li key={e.code}>
                <b>{e.code}</b> <span className="petit">{age(e.ageMois)}</span>
                <ul>{e.soins.map((x) => (
                  <li key={x.soin}>
                    <span>{x.libelle}</span>
                    <span className={`etat ${STATUT[x.statut][1]}`}>{STATUT[x.statut][0]}{x.statut === 'fait' ? ` (${x.date})` : ''}</span>
                    {x.statut === 'a-faire' && <button type="button" className="bouton petit-bouton" onClick={() => donner(e.code, x.soin)}>Donné</button>}
                  </li>
                ))}</ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="carte">
        <h2>Nouvelle maison</h2>
        <form onSubmit={creer} className="ado-champs">
          <label>Village<select value={nouveau.village} onChange={(e) => setNouveau({ ...nouveau, village: e.target.value })}>{VILLAGES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          {nouveau.ages.map((a, i) => <label key={i}>Âge de l’enfant {i + 1} (mois)<input type="number" min="0" max="71" value={a} onChange={(e) => setNouveau({ ...nouveau, ages: nouveau.ages.map((x, j) => (j === i ? e.target.value : x)) })} required={i === 0} /></label>)}
          <p>{nouveau.ages.length < 8 && <button type="button" className="bouton secondaire petit-bouton" onClick={() => setNouveau({ ...nouveau, ages: [...nouveau.ages, ''] })}>Ajouter un enfant</button>} <button className="bouton" type="submit">Créer la maison et son QR</button></p>
        </form>
        {cree && (
          <div className="fiche-acces">
            <h3>QR de la maison {cree.code}</h3>
            <QrCode valeur={cree.qr} taille={200} titre={`QR de la maison ${cree.code}`} />
            <p className="petit">À imprimer et coller sur la porte. Codes des enfants : {cree.enfants.map((e) => e.code).join(', ')}.</p>
            <p><button type="button" className="bouton secondaire petit-bouton" onClick={() => window.print()}>Imprimer</button></p>
          </div>
        )}
      </section>

      <section className="carte">
        <h2>Maisons suivies ({liste.length})</h2>
        <ul className="liste-coches">{liste.map((f) => <li key={f.code}><button type="button" className="lien-bouton" onClick={() => ouvrir(f.code)}><b>{f.code}</b></button> · {VILLAGES.find((v) => v[0] === f.village)?.[1]} · {f.nbEnfants} enfant{f.nbEnfants > 1 ? 's' : ''} · {f.aFaire === 0 ? <span className="etat etat-prise">Tout est fait</span> : <span className="etat etat-envoyee">{f.aFaire} à donner</span>}</li>)}</ul>
      </section>
    </>
  )
}
