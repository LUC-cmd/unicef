// Fil d'Or pour Windows. Le logiciel contient le site : il s'ouvre sans réseau.
// Les appels /api et /assistant sont relayés vers le serveur ; s'il n'est pas joignable, l'application le voit comme
// « hors ligne » et garde les saisies (file d'attente de l'appareil), prêtes à partir au retour du réseau ou par clé USB.
const { app, BrowserWindow, dialog, shell } = require('electron')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

const os = require('os')
const usb = require('./usb.js')
// Un fichier journal à côté du logiciel : en cas de souci, il dit pourquoi (à envoyer à l'équipe).
function journal(texte) {
  const ligne = `${new Date().toISOString()} ${texte}\n`
  for (const dossier of [path.dirname(process.execPath), os.tmpdir()]) {
    try { fs.appendFileSync(path.join(dossier, 'fildor-journal.txt'), ligne); return } catch { /* essai suivant */ }
  }
}
process.on('uncaughtException', (e) => {
  journal('ERREUR ' + (e && e.stack || e))
  try { dialog.showErrorBox("Fil d'Or", "Une erreur est survenue : " + (e && e.message || e) + "\nLe détail est dans fildor-journal.txt.") } catch { /* rien */ }
})
// Évite les fenêtres blanches sur certains ordinateurs (pilotes graphiques anciens)
app.disableHardwareAcceleration()

const PORT = 47831 // fixe : les saisies en attente sont rangées par adresse, elles ne doivent pas changer d'un jour à l'autre
const SERVEUR_PAR_DEFAUT = 'https://frontend-production-5667500e.up.railway.app'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' }

function lireConfig() {
  const dossier = app.isPackaged ? path.dirname(process.execPath) : __dirname
  try { return JSON.parse(fs.readFileSync(path.join(dossier, 'configuration.json'), 'utf8')) } catch { return {} }
}
const config = lireConfig()
const SERVEUR = new URL(config.serveur || SERVEUR_PAR_DEFAUT)
const RACINE = path.join(__dirname, 'site')
let fenetrePrincipale = null
let mdpServeur = ''

// Le mot de passe des comptes de démonstration est celui du serveur : on le lit sur le site au démarrage,
// et on le garde dans un fichier pour les ouvertures sans réseau.
function chargerMdpServeur() {
  const fichier = path.join(app.getPath('userData'), 'mdp-demo.txt')
  try { mdpServeur = fs.readFileSync(fichier, 'utf8').trim() } catch { /* pas encore de copie */ }
  return new Promise((fin) => {
    const client = SERVEUR.protocol === 'https:' ? https : http
    const req = client.get(new URL('/fildor-config.js', SERVEUR), { timeout: 6000 }, (r) => {
      let corps = ''
      r.on('data', (c) => { corps += c })
      r.on('end', () => {
        const m = /mdpDemo:\s*("(?:[^"\\]|\\.)*")/.exec(corps)
        if (m) { try { const v = JSON.parse(m[1]); if (v) { mdpServeur = v; fs.writeFileSync(fichier, v) } } catch { /* ignoré */ } }
        fin()
      })
    })
    req.on('timeout', () => { req.destroy(); fin() })
    req.on('error', () => fin())
  })
}

function relayer(req, res) {
  const client = SERVEUR.protocol === 'https:' ? https : http
  const entetes = { ...req.headers, host: SERVEUR.host }
  delete entetes.origin
  delete entetes.referer
  const amont = client.request({ protocol: SERVEUR.protocol, hostname: SERVEUR.hostname, port: SERVEUR.port || undefined,
    path: req.url, method: req.method, headers: entetes, timeout: 15000 }, (r) => {
    res.writeHead(r.statusCode, r.headers)
    r.pipe(res)
  })
  // Serveur injoignable : on coupe la connexion, comme un vrai réseau absent (le navigateur voit « hors ligne », pas une erreur 5xx)
  const couper = () => { try { res.socket.destroy() } catch { /* déjà fermé */ } }
  amont.on('timeout', () => { amont.destroy(); couper() })
  amont.on('error', couper)
  req.pipe(amont)
}

// Clés USB : réservé à l'application elle-même (en-tête X-Fildor que seul notre site envoie ; un autre site
// ouvert dans le navigateur ne peut pas l'ajouter sans autorisation).
async function servirCles(req, res, url) {
  const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)) }
  if (req.headers['x-fildor'] !== '1' || (req.headers.host || '') !== `127.0.0.1:${PORT}`) return json(403, { erreur: 'Refusé' })
  try {
    if (url.pathname === '/local/cles' && req.method === 'GET') return json(200, { cles: await usb.lister() })
    if (url.pathname === '/local/cles/lire' && req.method === 'GET') {
      return json(200, { contenu: await usb.lire(url.searchParams.get('id'), url.searchParams.get('nom')) })
    }
    if (url.pathname === '/local/cles/ecrire' && req.method === 'POST') {
      let corps = ''
      for await (const c of req) { corps += c; if (corps.length > 31 * 1024 * 1024) return json(413, { erreur: 'Trop gros' }) }
      const d = JSON.parse(corps)
      return json(200, await usb.ecrire(d.id, d.nom, d.contenu))
    }
    return json(404, { erreur: 'Inconnu' })
  } catch (e) {
    journal('usb : ' + e.message)
    return json(e.statut || 500, { erreur: e.message })
  }
}

function servir(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (url.pathname.startsWith('/local/cles')) return servirCles(req, res, url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/assistant/')) return relayer(req, res)
  if (url.pathname === '/fildor-config.js') {
    res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' })
    return res.end(`window.FILDOR_CONFIG = ${JSON.stringify({ mdpDemo: config.motDePasseDemo || mdpServeur || '', logiciel: true })}`)
  }
  let fichier = path.normalize(path.join(RACINE, decodeURIComponent(url.pathname)))
  if (!fichier.startsWith(RACINE)) { res.writeHead(403); return res.end() }
  if (!fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) fichier = path.join(RACINE, 'index.html')
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream',
    'Cache-Control': fichier.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' })
  fs.createReadStream(fichier).pipe(res)
}

function ouvrir() {
  const fenetre = new BrowserWindow({ width: 1366, height: 860, minWidth: 360, minHeight: 600, title: "Fil d'Or",
    icon: path.join(RACINE, 'icons', 'icon-512.png'), autoHideMenuBar: true, backgroundColor: '#ffffff' })
  fenetrePrincipale = fenetre
  fenetre.setMenuBarVisibility(false)
  fenetre.webContents.on('did-fail-load', (_e, code, desc) => {
    journal(`did-fail-load ${code} ${desc}`)
    fenetre.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<body style="font-family:sans-serif;padding:3rem"><h1>Fil d'Or ne s'est pas ouvert</h1><p>${desc}</p><p>Fermez le logiciel et ouvrez-le de nouveau. Si cela continue, envoyez le fichier <b>fildor-journal.txt</b> (à côté de FilDor.exe) à l'équipe.</p>`))
  })
  fenetre.loadURL(`http://127.0.0.1:${PORT}/`)
  // Les liens vers d'autres sites s'ouvrent dans le navigateur, pas dans le logiciel
  fenetre.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  // Deuxième ouverture : on ramène la fenêtre existante au premier plan au lieu de ne rien faire
  app.on('second-instance', () => { if (fenetrePrincipale) { if (fenetrePrincipale.isMinimized()) fenetrePrincipale.restore(); fenetrePrincipale.focus() } })
  app.whenReady().then(() => {
    // Ouvert depuis l'intérieur du zip sans l'avoir extrait : Windows ne copie pas tous les fichiers, le logiciel ne peut pas marcher.
    if (/\\Temp\\Temp\d+_/i.test(process.execPath) || /\.zip\\/i.test(process.execPath)) {
      dialog.showErrorBox("Fil d'Or", "Le logiciel est encore dans le fichier zip.\n\nFermez cette fenêtre, faites un clic droit sur le fichier zip, « Extraire tout », puis ouvrez FilDor.exe depuis le dossier extrait.")
      app.quit(); return
    }
    if (!fs.existsSync(path.join(RACINE, 'index.html'))) {
      journal('site introuvable : ' + RACINE)
      dialog.showErrorBox("Fil d'Or", "Des fichiers du logiciel manquent. Supprimez le dossier et extrayez de nouveau le zip complet.")
      app.quit(); return
    }
    journal('démarrage ' + app.getVersion())
    const serveur = http.createServer(servir)
    serveur.on('error', (e) => {
      dialog.showErrorBox("Fil d'Or", e.code === 'EADDRINUSE'
        ? "Fil d'Or est déjà ouvert, ou le port " + PORT + ' est pris par un autre logiciel.' : String(e))
      app.quit()
    })
    chargerMdpServeur().then(() => serveur.listen(PORT, '127.0.0.1', ouvrir))
  })
  app.on('window-all-closed', () => app.quit())
}
