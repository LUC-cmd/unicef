import { useMemo, useState } from 'react'
import { analyser, dateDepuisAge } from '../lib/acte.js'
import { aujourdhuiIso, formaterDate } from '../lib/format.js'

function Choix({ nom, valeur, onChange, options }) {
  return (
    <div className="choix-puces" role="radiogroup" aria-label={nom}>
      {options.map(([v, t]) => (
        <button type="button" key={v} role="radio" aria-checked={valeur === v} className={`puce ${valeur === v ? 'active' : ''}`} onClick={() => onChange(v)}>{t}</button>
      ))}
    </div>
  )
}

/** Guide pas à pas : « Que faire pour que cet enfant ait un acte de naissance ? » (rien n'est enregistré, aucun nom demandé). */
export default function CheminActe({ dateInitiale = '' }) {
  const aujourdhui = aujourdhuiIso()
  const [etat, setEtat] = useState(dateInitiale ? 'ne' : '')
  const [precision, setPrecision] = useState(dateInitiale ? 'exacte' : '')
  const [date, setDate] = useState(dateInitiale)
  const [age, setAge] = useState(1)
  const [unite, setUnite] = useState('ans')
  const [dejaDeclare, setDejaDeclare] = useState('')
  const [pereInconnu, setPereInconnu] = useState(false)
  const [sansNom, setSansNom] = useState(false)

  const dateEffective = precision === 'approx' ? dateDepuisAge(Number(age) || 0, unite, aujourdhui) : date
  const pret = etat === 'grossesse' || (etat === 'ne' && dejaDeclare && (precision === 'inconnue' || (precision === 'exacte' && date) || (precision === 'approx' && Number(age) > 0)))
  const r = useMemo(() => pret ? analyser({ etat, precision, date: dateEffective, dejaDeclare, pereInconnu, merePrefereSansNom: sansNom, aujourdhui }) : null,
    [pret, etat, precision, dateEffective, dejaDeclare, pereInconnu, sansNom, aujourdhui])

  return (
    <div className="chemin-acte">
      <section className="carte">
        <h2>1. Où en est-on ?</h2>
        <Choix nom="Situation" valeur={etat} onChange={setEtat} options={[['grossesse', 'La femme est enceinte'], ['ne', "L'enfant est déjà né"]]} />

        {etat === 'ne' && (
          <>
            <h2>2. Connaît-on la date de naissance ?</h2>
            <Choix nom="Date de naissance" valeur={precision} onChange={setPrecision}
                   options={[['exacte', 'Oui, la date exacte'], ['approx', "À peu près (l'âge)"], ['inconnue', 'On ne sait pas']]} />
            {precision === 'exacte' && (
              <label>Date de naissance
                <input type="date" value={date} max={aujourdhui} onChange={(e) => setDate(e.target.value)} />
              </label>
            )}
            {precision === 'approx' && (
              <div className="ligne-age">
                <label>Âge environ
                  <input type="number" min="1" max="40" value={age} onChange={(e) => setAge(e.target.value)} />
                </label>
                <label>Unité
                  <select value={unite} onChange={(e) => setUnite(e.target.value)}>
                    <option value="mois">mois</option><option value="ans">ans</option>
                  </select>
                </label>
                <p className="petit">Date estimée : {formaterDate(dateEffective)}</p>
              </div>
            )}

            <h2>3. La naissance est-elle déjà déclarée à la mairie ?</h2>
            <Choix nom="Déjà déclarée" valeur={dejaDeclare} onChange={setDejaDeclare} options={[['non', 'Non'], ['oui', 'Oui'], ['nsp', 'On ne sait pas']]} />
          </>
        )}

        {etat && (
          <fieldset className="case-groupe">
            <legend>Situations particulières (facultatif)</legend>
            <label className="case"><input type="checkbox" checked={sansNom} onChange={(e) => setSansNom(e.target.checked)} />La mère ne veut pas donner son nom</label>
            <label className="case"><input type="checkbox" checked={pereInconnu} onChange={(e) => setPereInconnu(e.target.checked)} />Le père est inconnu ou n'est pas déclaré</label>
          </fieldset>
        )}
      </section>

      {r && (
        <section className={`carte resultat-acte ${r.ton}`} aria-live="polite">
          <p className="etiquette-cas">{r.cout}</p>
          <h2>{r.titre}</h2>
          <p className="gros">{r.resume}</p>
          <h3>Ce qu'il faut faire</h3>
          <ol className="pas-a-pas">{r.etapes.map((t) => <li key={t}>{t}</li>)}</ol>
          {r.pieces.length > 0 && (<><h3>Ce qui aide à rassembler</h3><ul>{r.pieces.map((t) => <li key={t}>{t}</li>)}</ul></>)}
          {r.notes.map((n) => <div key={n.titre} className="note-acte"><b>{n.titre}</b><p>{n.texte}</p></div>)}
          <p className="petit">Informations générales à confirmer auprès de la mairie ou du tribunal. Sources : UNICEF Togo (enregistrement universel des naissances), règle des 45 jours.</p>
        </section>
      )}
    </div>
  )
}
