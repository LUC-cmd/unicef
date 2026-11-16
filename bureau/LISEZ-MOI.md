# Fil d'Or pour Windows (Electron)

Le logiciel contient le site construit (`site/`) et un petit serveur local (port 47831) qui relaie `/api` et `/assistant`
vers le serveur Fil d'Or. Sans réseau, le relais coupe la connexion : l'application se voit « hors ligne » et garde les saisies.

Pour reconstruire :
1. `cd frontend && npm run build`, puis copier `frontend/dist` dans `bureau/site`.
2. `cd bureau && npm install electron @electron/packager`
3. `npx electron-packager . "Fil d'Or" --platform=win32 --arch=x64 --out=sortie --overwrite --no-asar`
4. Ajouter `configuration.json` (`{"serveur": "https://...", "motDePasseDemo": ""}`) à côté de `Fil d'Or.exe`.
