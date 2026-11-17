import { useEffect, useState } from 'react'

const cle = (u) => `fildor.photo.${u || 'anonyme'}`
export const lirePhoto = (u) => { try { return localStorage.getItem(cle(u)) || '' } catch { return '' } }
export function ecrirePhoto(u, data) {
  try { if (data) localStorage.setItem(cle(u), data); else localStorage.removeItem(cle(u)) } catch { /* sans stockage */ }
  window.dispatchEvent(new Event('fildor-photo'))
}
const initiales = (nom) => (nom || '?').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase()

/** Photo de profil (gardée sur l'appareil) ou initiales. */
export default function Avatar({ username, nom, taille = 40 }) {
  const [photo, setPhoto] = useState(() => lirePhoto(username))
  useEffect(() => {
    const maj = () => setPhoto(lirePhoto(username))
    maj()
    window.addEventListener('fildor-photo', maj)
    return () => window.removeEventListener('fildor-photo', maj)
  }, [username])
  const style = { width: taille, height: taille, fontSize: taille * 0.4 }
  return photo
    ? <img className="avatar" style={style} src={photo} alt="" />
    : <span className="avatar avatar-initiales" style={style} aria-hidden="true">{initiales(nom)}</span>
}

/** Recadre une image choisie en carré de 160 px (JPEG) : elle reste sur l'appareil, rien n'est envoyé. */
export function preparerPhoto(fichier) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onerror = () => reject(new Error('Image illisible'))
    lecteur.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image illisible'))
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = 160; c.height = 160
        const cote = Math.min(img.width, img.height)
        c.getContext('2d').drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, 160, 160)
        resolve(c.toDataURL('image/jpeg', 0.85))
      }
      img.src = lecteur.result
    }
    lecteur.readAsDataURL(fichier)
  })
}
