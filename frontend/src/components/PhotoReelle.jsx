/** Photographies réelles (Wikimedia Commons), pas des dessins générés. */

export const PHOTOS = {
  coq: { src: '/photos/coq.jpg', alt: 'Un coq', un: 'coq', plusieurs: 'coqs', credit: 'Clément Bardot, CC BY-SA 4.0' },
  vache: { src: '/photos/vache.jpg', alt: 'Une vache', un: 'vache', plusieurs: 'vaches', credit: 'Keith Weller, USDA, domaine public' },
  chevre: { src: '/photos/chevre.jpg', alt: 'Une chèvre', un: 'chèvre', plusieurs: 'chèvres', credit: 'Quartl, CC BY-SA 3.0' },
  poisson: { src: '/photos/poisson.jpg', alt: 'Un tilapia', un: 'poisson', plusieurs: 'poissons', credit: 'Wikimedia Commons, CC BY-SA 2.5' },
  singe: { src: '/photos/singe.jpg', alt: 'Un singe', un: 'singe', plusieurs: 'singes', credit: 'Wikimedia Commons, domaine public' },
  tortue: { src: '/photos/tortue.jpg', alt: 'Une tortue', un: 'tortue', plusieurs: 'tortues', credit: 'Wikimedia Commons, CC BY 4.0' },
  perroquet: { src: '/photos/perroquet.jpg', alt: 'Un perroquet', un: 'perroquet', plusieurs: 'perroquets', credit: 'Alex (Ithaca), CC BY 2.0' },
  banane: { src: '/photos/banane.jpg', alt: 'Des bananes', un: 'banane', plusieurs: 'bananes', credit: 'Wikimedia Commons, GFDL 1.2' },
  oeuf: { src: '/photos/oeuf.jpg', alt: 'Un œuf', un: 'œuf', plusieurs: 'œufs', credit: 'Wikimedia Commons, domaine public' },
}

export const ANIMAUX = ['coq', 'vache', 'chevre', 'poisson', 'singe', 'tortue', 'perroquet']

export function Photo({ id, className = 'photo-reelle' }) {
  const photo = PHOTOS[id]
  if (!photo) return null
  return <img src={photo.src} alt={photo.alt} className={className} />
}

export function CreditsPhotos() {
  return (
    <details className="credits-photos">
      <summary>D’où viennent les photos</summary>
      <ul>
        {Object.values(PHOTOS).map((p) => (
          <li key={p.src}>{p.alt} — {p.credit}</li>
        ))}
      </ul>
    </details>
  )
}
