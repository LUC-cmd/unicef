import { useMemo } from 'react'

const nom = (z) => z.nom.replace(/ \(.*\)/, '')
const moy = (l, f) => { const v = l.map(f).filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }

/** Indicateurs lus pour une zone : valeur, sens (plus haut = mieux ?), phrase d'action si la zone est la moins bonne. */
const INDICATEURS = [
  { id: 'suivi', titre: 'Rendez-vous réalisés', val: (z) => z.tauxSuiviPct, mieux: 'haut', unite: ' %', agir: 'envoyer une équipe mobile pour rattraper les rendez-vous manqués' },
  { id: 'naiss', titre: 'Naissances déclarées', val: (z) => z.tauxNaissancesDeclareesPct, mieux: 'haut', unite: ' %', agir: 'organiser une journée de déclaration avec l’état civil' },
  { id: 'eveil', titre: 'Jeux d’éveil cette semaine', val: (z) => z.tauxEveilPct, mieux: 'haut', unite: ' %', agir: 'relancer les jeux d’éveil par les agents et les crèches' },
  { id: 'repon', titre: 'Rappels sans réponse', val: (z) => (z.familles ? Math.round((100 * (z.famillesSansReponse ?? 0)) / z.familles) : null), mieux: 'bas', unite: ' %', agir: 'passer à la voix ou à la visite : le SMS ne suffit pas' },
  { id: 'tel', titre: 'Familles sans téléphone', val: (z) => (z.familles ? Math.round((100 * (z.famillesSansTelephone ?? 0)) / z.familles) : null), mieux: 'bas', unite: ' %', agir: 'prévoir des visites à domicile et un proche relais' },
]

function ton(v, m, mieux) {
  if (v == null || m == null) return 'neutre'
  const ecart = mieux === 'haut' ? v - m : m - v
  return ecart >= 8 ? 'bien' : ecart <= -8 ? 'mal' : 'moyen'
}

/** Lecture des données : ce que disent les chiffres, pourquoi une zone est en difficulté, et quoi faire. Zones masquées (< 5 familles) exclues. */
export default function AnalyseRegion({ zones }) {
  const a = useMemo(() => {
    const l = zones.filter((z) => !z.masquee && z.indiceOubli != null)
    if (!l.length) return null
    const moyennes = Object.fromEntries(INDICATEURS.map((i) => [i.id, moy(l, i.val)]))
    const pires = [...l].sort((x, y) => y.indiceOubli - x.indiceOubli).slice(0, 3).map((z) => {
      // L'écart le plus défavorable à la moyenne de la région dit pourquoi la zone décroche.
      const ecarts = INDICATEURS.map((i) => {
        const v = i.val(z), m = moyennes[i.id]
        return v == null || m == null ? null : { i, v, m, pire: i.mieux === 'haut' ? m - v : v - m }
      }).filter(Boolean).sort((p, q) => q.pire - p.pire)
      return { z, causes: ecarts.filter((e) => e.pire > 5).slice(0, 2), manque: ecarts[0] }
    })
    return { l, moyennes, pires }
  }, [zones])
  if (!a) return null
  const mieux = [...a.l].sort((x, y) => x.indiceOubli - y.indiceOubli)[0]
  return (
    <>
      <section className="carte analyse-region">
        <h2>Ce que disent les chiffres</h2>
        <p className="analyse-phrase">
          Sur {a.l.length} zone{a.l.length > 1 ? 's' : ''} détaillée{a.l.length > 1 ? 's' : ''}, {Math.round(a.moyennes.suivi ?? 0)} % des rendez-vous sont réalisés en moyenne.
          {a.pires[0] && <> <b>{nom(a.pires[0].z)}</b> est la plus en retard (indice {a.pires[0].z.indiceOubli} sur 100)</>}
          {mieux && mieux.code !== a.pires[0]?.z.code && <>, <b>{nom(mieux)}</b> la mieux suivie (indice {mieux.indiceOubli})</>}.
        </p>
        <ol className="analyse-liste">
          {a.pires.map(({ z, causes, manque }) => (
            <li key={z.code}>
              <b>{nom(z)}</b> <span className="petit">· indice {z.indiceOubli}</span>
              {causes.length ? (
                <p>
                  Pourquoi : {causes.map((c) => `${c.i.titre.toLowerCase()} à ${Math.round(c.v)}${c.i.unite} contre ${Math.round(c.m)}${c.i.unite} en moyenne`).join(' ; ')}.<br />
                  <b>À faire :</b> {causes[0].i.agir}.
                </p>
              ) : <p>Aucun écart marqué avec la moyenne : <b>À faire :</b> {manque?.i.agir ?? 'maintenir le suivi'}.</p>}
            </li>
          ))}
        </ol>
      </section>
      <section className="carte">
        <h2>Zone par zone : où ça va, où ça coince</h2>
        <p className="petit">Chaque case est comparée à la moyenne de la région : vert = mieux que la moyenne, rouge = nettement moins bien.</p>
        <div className="tableau-conteneur">
          <table className="chaleur">
            <thead><tr><th>Zone</th>{INDICATEURS.map((i) => <th key={i.id}>{i.titre}</th>)}</tr></thead>
            <tbody>
              {a.l.map((z) => (
                <tr key={z.code}>
                  <th scope="row">{nom(z)}</th>
                  {INDICATEURS.map((i) => { const v = i.val(z); return <td key={i.id} className={`chaleur-${ton(v, a.moyennes[i.id], i.mieux)}`}>{v == null ? '–' : `${Math.round(v)}${i.unite}`}</td> })}
                </tr>
              ))}
              <tr className="chaleur-moyenne"><th scope="row">Moyenne de la région</th>{INDICATEURS.map((i) => <td key={i.id}>{a.moyennes[i.id] == null ? '–' : `${Math.round(a.moyennes[i.id])}${i.unite}`}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
