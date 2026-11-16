// Fil d'Or pour Windows. Le logiciel contient le site : il s'ouvre sans réseau.
// Les appels /api et /assistant sont relayés vers le serveur ; s'il n'est pas joignable, l'application le voit comme
// « hors ligne » et garde les saisies (file d'attente de l'appareil), prêtes à partir au retour du réseau ou par clé USB.
const { app, BrowserWindow, dialog, shell } = require('electron')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

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

function servir(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/assistant/')) return relayer(req, res)
  if (url.pathname === '/fildor-config.js') {
    res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' })
    return res.end(`window.FILDOR_CONFIG = ${JSON.stringify({ mdpDemo: config.motDePasseDemo || '', logiciel: true })}`)
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
  fenetre.setMenuBarVisibility(false)
  fenetre.loadURL(`http://127.0.0.1:${PORT}/`)
  // Les liens vers d'autres sites s'ouvrent dans le navigateur, pas dans le logiciel
  fenetre.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.whenReady().then(() => {
    const serveur = http.createServer(servir)
    serveur.on('error', (e) => {
      dialog.showErrorBox("Fil d'Or", e.code === 'EADDRINUSE'
        ? "Fil d'Or est déjà ouvert, ou le port " + PORT + ' est pris par un autre logiciel.' : String(e))
      app.quit()
    })
    serveur.listen(PORT, '127.0.0.1', ouvrir)
  })
  app.on('window-all-closed', () => app.quit())
}
