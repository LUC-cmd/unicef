import { useMemo, useState } from 'react'

/**
 * Composant d'alertes automatiques pour les décideurs régionaux.
 * Détecte les zones critiques (indice >= 60), les dégradations rapides (tendance > 5 pts)
 * et les ruptures de communication (> 30% de familles sans réponse).
 */
export default function AlertesZones({ zones = [], tendances = {} }) {
  const [filtre, setFiltre] = useState('tous')

  // Génération des alertes automatiques selon les 3 règles métiers
  const alertes = useMemo(() => {
    if (!zones || !zones.length) return []
    const liste = []

    zones.forEach((z) => {
      if (z.masquee) return

      // 1. Zone au-dessus du seuil 60 (Critique - Rouge)
      if (typeof z.indiceOubli === 'number' && z.indiceOubli >= 60) {
        liste.push({
          id: `critique-${z.code}`,
          zone: z.nom,
          code: z.code,
          niveau: 'rouge',
          titre: `Zone oubliée prioritaire : ${z.nom}`,
          valeur: `${z.indiceOubli} / 100`,
          description: `L'indice d'oubli a atteint ${z.indiceOubli}/100, dépassant le seuil d'intervention d'urgence fixé à 60.`,
          action: 'Envoyer d’urgence une équipe mobile de santé cette semaine pour rattrapage vaccinal et consultations.',
          bordure: '#e2231a',
          fond: '#fff5f5',
          texteCouleur: '#9b2c2c',
          priorite: 1,
        })
      }

      // 2. Zone qui se dégrade (Tendance positive > 5 points - Orange)
      const delta = tendances ? tendances[z.code] : undefined
      if (typeof delta === 'number' && delta > 5) {
        liste.push({
          id: `degradation-${z.code}`,
          zone: z.nom,
          code: z.code,
          niveau: 'orange',
          titre: `Dégradation rapide : ${z.nom}`,
          valeur: `+${delta} pts`,
          description: `L'indice d'oubli a augmenté de ${delta} points par rapport à la semaine précédente.`,
          action: 'Vérifier la disponibilité des intrants de santé et mobiliser les agents de santé communautaires pour relancer les rappels.',
          bordure: '#f26a21',
          fond: '#fffaf0',
          texteCouleur: '#9c4221',
          priorite: 2,
        })
      }

      // 3. Plus de 30% de familles sans réponse (Communication rompue - Bleu)
      if (z.familles > 0 && typeof z.famillesSansReponse === 'number') {
        const ratio = z.famillesSansReponse / z.familles
        if (ratio > 0.3) {
          const pct = Math.round(ratio * 100)
          liste.push({
            id: `silence-${z.code}`,
            zone: z.nom,
            code: z.code,
            niveau: 'bleu',
            titre: `Rupture de communication : ${z.nom}`,
            valeur: `${pct} % sans contact`,
            description: `${z.famillesSansReponse} familles sur ${z.familles} (${pct} %) ne répondent plus aux rappels SMS ou vocaux.`,
            action: 'Organiser des visites à domicile avec les relais locaux pour mettre à jour les numéros et vérifier la couverture réseau.',
            bordure: '#1cabe2',
            fond: '#f0f9ff',
            texteCouleur: '#2b6cb0',
            priorite: 3,
          })
        }
      }
    })

    // Tri des alertes par niveau de priorité (critique d'abord, puis dégradation, puis contact)
    return liste.sort((a, b) => a.priorite - b.priorite)
  }, [zones, tendances])

  // Filtrage selon l'onglet sélectionné
  const alertesFiltrees = useMemo(() => {
    if (filtre === 'tous') return alertes
    return alertes.filter((a) => a.niveau === filtre)
  }, [alertes, filtre])

  const nbCritiques = alertes.filter((a) => a.niveau === 'rouge').length
  const nbDegradations = alertes.filter((a) => a.niveau === 'orange').length
  const nbCommunications = alertes.filter((a) => a.niveau === 'bleu').length

  function imprimerRapport() {
    window.print()
  }

  return (
    <section className="carte alertes-zones" style={{ padding: '1.25rem', marginTop: '1.2rem' }}>
      {/* En-tête avec bouton d'impression */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.85rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#16325c', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            Alertes automatiques du territoire
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#718096' }}>
            Détection automatique des urgences sanitaires, dégradations rapides et ruptures de contact
          </p>
        </div>

        <button
          type="button"
          className="bouton"
          onClick={imprimerRapport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            fontSize: '0.88rem',
          }}
          title="Imprimer ce rapport d'alertes"
        >
          Générer un rapport
        </button>
      </div>

      {/* Résumé chiffré des alertes */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <button
          type="button"
          onClick={() => setFiltre('tous')}
          style={{
            border: filtre === 'tous' ? '2px solid #16325c' : '1px solid #cbd5e0',
            backgroundColor: filtre === 'tous' ? '#edf2f7' : '#ffffff',
            borderRadius: '20px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#16325c',
          }}
        >
          Toutes ({alertes.length})
        </button>

        <button
          type="button"
          onClick={() => setFiltre('rouge')}
          style={{
            border: filtre === 'rouge' ? '2px solid #e2231a' : '1px solid #feb2b2',
            backgroundColor: filtre === 'rouge' ? '#fff5f5' : '#ffffff',
            borderRadius: '20px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#c53030',
          }}
        >
          Critiques : seuil 60 ({nbCritiques})
        </button>

        <button
          type="button"
          onClick={() => setFiltre('orange')}
          style={{
            border: filtre === 'orange' ? '2px solid #f26a21' : '1px solid #fbd38d',
            backgroundColor: filtre === 'orange' ? '#fffaf0' : '#ffffff',
            borderRadius: '20px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#c05621',
          }}
        >
          Dégradations rapides ({nbDegradations})
        </button>

        <button
          type="button"
          onClick={() => setFiltre('bleu')}
          style={{
            border: filtre === 'bleu' ? '2px solid #1cabe2' : '1px solid #bee3f8',
            backgroundColor: filtre === 'bleu' ? '#f0f9ff' : '#ffffff',
            borderRadius: '20px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#2b6cb0',
          }}
        >
          Sans réponse &gt; 30% ({nbCommunications})
        </button>
      </div>

      {/* Liste des alertes */}
      {alertes.length === 0 ? (
        <div
          style={{
            backgroundColor: '#f0fff4',
            border: '1px solid #9ae6b4',
            borderRadius: '8px',
            padding: '1.2rem',
            textAlign: 'center',
            color: '#22543d',
          }}
        >
          <b>Aucune alerte active sur les zones suivies.</b>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
            Tous les indicateurs sont stables ou en amélioration par rapport aux seuils de vigilance.
          </p>
        </div>
      ) : alertesFiltrees.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#718096', fontSize: '0.88rem' }}>
          Aucune alerte dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {alertesFiltrees.map((al) => (
            <article
              key={al.id}
              style={{
                borderLeft: `5px solid ${al.bordure}`,
                backgroundColor: al.fond,
                borderRadius: '0 8px 8px 0',
                padding: '0.95rem 1.15rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: al.texteCouleur }}>
                    {al.titre}
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    color: al.texteCouleur,
                    border: `1px solid ${al.bordure}`,
                  }}
                >
                  {al.valeur}
                </span>
              </div>

              {/* Description de l'alerte */}
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#2d3748', lineHeight: 1.45 }}>
                {al.description}
              </p>

              {/* Action recommandée */}
              <div
                style={{
                  marginTop: '0.25rem',
                  paddingTop: '0.45rem',
                  borderTop: '1px dashed rgba(0,0,0,0.12)',
                  fontSize: '0.85rem',
                  color: '#1a202c',
                }}
              >
                <b>Action recommandée :</b> {al.action}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
