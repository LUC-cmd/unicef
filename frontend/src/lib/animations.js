// Animations d'apparition au défilement : douces, une seule fois, coupées si la personne a réduit les animations.
const CIBLES = [
  '.titre-section', '.chapeau', '.carte', '.chiffre', '.carte-etape', '.action-grande', '.domaine-bouton', '.moments li',
  '.innovations li', '.etapes-cartes li', '.illustration-bloc', '.tableau-conteneur', '.essai-grille > *', '.grille > *', '.principe', '.source',
].join(',')

function compter(el) {
  const m = /^([\d\s  ]+(?:,\d+)?)(.*)$/.exec(el.textContent.trim())
  if (!m) return
  const dec = (m[1].split(',')[1] || '').length
  const cible = parseFloat(m[1].replace(/[\s  ]/g, '').replace(',', '.'))
  if (!Number.isFinite(cible)) return
  const debut = performance.now(), duree = 1100
  const fmt = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const pas = (t) => {
    const k = Math.min(1, (t - debut) / duree), e = 1 - Math.pow(1 - k, 3)
    el.textContent = fmt(cible * e) + m[2]
    if (k < 1) requestAnimationFrame(pas); else el.textContent = m[1] + m[2]
  }
  requestAnimationFrame(pas)
}

export function demarrerAnimations() {
  try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {} } catch { return () => {} }
  if (!('IntersectionObserver' in window)) return () => {}
  const vu = new IntersectionObserver((entrees) => {
    for (const en of entrees) {
      if (!en.isIntersecting) continue
      const el = en.target
      el.classList.add('rev-ok')
      if (el.matches('.chiffre')) { const b = el.querySelector('b'); if (b) compter(b) }
      vu.unobserve(el)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  let attente = false
  const marquer = () => {
    attente = false
    document.querySelectorAll(CIBLES).forEach((el) => {
      if (el.dataset.rev || el.closest('.modale, .intro, .entete-bloc, .shell, .espace-contenu')) return
      el.dataset.rev = '1'
      const frere = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0
      el.style.setProperty('--d', `${Math.min(frere, 5) * 70}ms`)
      el.classList.add('rev')
      vu.observe(el)
    })
  }
  const planifier = () => { if (!attente) { attente = true; requestAnimationFrame(marquer) } }
  const obs = new MutationObserver(planifier)
  obs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  planifier()
  return () => { obs.disconnect(); vu.disconnect() }
}
