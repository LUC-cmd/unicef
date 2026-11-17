// Clés USB pour le logiciel Windows : repérer les lecteurs amovibles, y écrire un fichier de saisies,
// y retrouver les fichiers fildor-cle-….json. Rien d'autre n'est lisible ni modifiable : seuls les fichiers
// nommés fildor-cle-*.json, à la racine d'un lecteur amovible.
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')

const NOM_VALIDE = /^fildor-cle-[A-Za-z0-9_-]{1,60}\.json$/
const TAILLE_MAX = 30 * 1024 * 1024

/** Dossier qui joue le rôle de « clés » pour les essais (un sous-dossier = une clé). Jamais défini en vrai usage. */
const simule = () => process.env.FILDOR_USB_SIMULE || ''

function lecteursWindows() {
  return new Promise((fin) => {
    const commande = 'Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | ' +
      'Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress'
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', commande], { timeout: 8000, windowsHide: true }, (err, sortie) => {
      if (err || !sortie || !sortie.trim()) return fin([])
      try {
        const brut = JSON.parse(sortie)
        const liste = Array.isArray(brut) ? brut : [brut]
        fin(liste.map((d) => ({ id: d.DeviceID, chemin: d.DeviceID + '\\', nom: d.VolumeName || 'Clé USB',
          taille: Number(d.Size) || 0, libre: Number(d.FreeSpace) || 0 })))
      } catch { fin([]) }
    })
  })
}

async function lecteurs() {
  const s = simule()
  if (s) {
    return fs.readdirSync(s, { withFileTypes: true }).filter((d) => d.isDirectory())
      .map((d) => ({ id: d.name, chemin: path.join(s, d.name), nom: 'Clé USB (essai)', taille: 0, libre: 0 }))
  }
  if (process.platform !== 'win32') return []
  return lecteursWindows()
}

function fichiersDe(lecteur) {
  try {
    return fs.readdirSync(lecteur.chemin).filter((n) => NOM_VALIDE.test(n)).map((nom) => {
      const st = fs.statSync(path.join(lecteur.chemin, nom))
      return { nom, taille: st.size, modifie: st.mtime.toISOString() }
    }).sort((a, b) => b.modifie.localeCompare(a.modifie))
  } catch { return [] }
}

/** Les clés branchées, avec les fichiers Fil d'Or qu'elles contiennent. */
async function lister() {
  const l = await lecteurs()
  return l.map((x) => ({ id: x.id, nom: x.nom, taille: x.taille, libre: x.libre, fichiers: fichiersDe(x) }))
}

async function trouver(id) {
  const l = (await lecteurs()).find((x) => x.id === id)
  if (!l) throw Object.assign(new Error('Cette clé n’est plus branchée.'), { statut: 404 })
  return l
}

async function ecrire(id, nom, contenu) {
  if (!NOM_VALIDE.test(nom || '')) throw Object.assign(new Error('Nom de fichier refusé.'), { statut: 400 })
  if (typeof contenu !== 'string' || contenu.length > TAILLE_MAX) throw Object.assign(new Error('Contenu refusé.'), { statut: 400 })
  const l = await trouver(id)
  const cible = path.join(l.chemin, nom)
  fs.writeFileSync(cible, contenu, 'utf8')
  if (fs.readFileSync(cible, 'utf8') !== contenu) throw Object.assign(new Error('La copie sur la clé a échoué. Réessayez.'), { statut: 500 })
  return { chemin: cible }
}

async function lire(id, nom) {
  if (!NOM_VALIDE.test(nom || '')) throw Object.assign(new Error('Nom de fichier refusé.'), { statut: 400 })
  const l = await trouver(id)
  const cible = path.join(l.chemin, nom)
  if (!fs.existsSync(cible) || fs.statSync(cible).size > TAILLE_MAX) throw Object.assign(new Error('Fichier introuvable.'), { statut: 404 })
  return fs.readFileSync(cible, 'utf8')
}

module.exports = { lister, ecrire, lire, NOM_VALIDE }
