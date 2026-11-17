# Application Android de Fil d'Or

L'application est une enveloppe Android (Capacitor) autour du site : elle s'ouvre comme une vraie application,
garde les saisies sur le téléphone sans réseau et les envoie au retour du réseau. Elle charge le site de Railway,
donc elle est toujours à jour sans réinstaller.

## Obtenir l'APK
1. Poussez le dépôt sur GitHub (le dossier `apk` et `.github/workflows/apk.yml` doivent y être).
2. Sur GitHub : onglet **Actions** > **Application Android (APK)** > **Run workflow**.
3. Après quelques minutes : l'APK est dans **Releases** (`apk-latest`) et dans les fichiers du lancement.
4. Pour l'offrir sur le site : dans Railway, service **frontend**, variable `APK_URL` =
   `https://github.com/<compte>/<dépôt>/releases/download/apk-latest/Fil-dOr.apk` (dépôt public), puis redéployer.
   Un bouton « Télécharger l'application Android » apparaît dans la page « Logiciel hors réseau ».

## Limites
- Première ouverture : une connexion est nécessaire une fois (ensuite le site reste disponible sans réseau).
- APK de démonstration (signé avec la clé de debug). Pour le Play Store il faudra une clé de signature et un bundle (AAB).
- Si le lien du site Railway change, modifier `server.url` dans `capacitor.config.json`.
