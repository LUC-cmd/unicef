# Fil d'Or — prototype Hack4Children Togo 2026

*Ne perdons le fil d'aucun enfant.* Fil d'Or suit chaque enfant de la grossesse à 5 ans, avec ou sans téléphone,
avec ou sans réseau : un seul carnet, quatre portes d'entrée (voix et SMS, agent de santé, carnet illustré, point d'écoute).

> **Prototype avec données fictives.** Aucun vrai enfant, aucun vrai SMS, aucun opérateur branché.
> Les contenus de santé et le calendrier vaccinal doivent être validés par des professionnels avant tout usage réel.

## Ce que fait la démo

| Porte / rôle | Ce que l'on peut démontrer |
|---|---|
| **Voix et SMS** (`/telephone`) | Un faux téléphone : appeler un sujet (grossesse, vaccins, nutrition…), lire les SMS de rappel et répondre OK, faire un appel manqué. |
| **Agent de santé** (`/agent`) | Liste de visites **priorisée** (un rappel sans réponse fait monter la famille), fiche enfant, saisie hors ligne (périmètre brachial, vaccins faits), déclaration de naissance, synchronisation. Interrupteur « simuler un village sans réseau ». |
| **Carnet illustré** (`/carnet/F-0045`) | Page imprimable : pictogrammes, cases à cocher, ruban de mesure, code famille, aucun nom. Un **QR signé** permet à tout centre de retrouver l'historique de suivi, même sans réseau (voir « Le carnet devient la base de données »). |
| **Inscription** (`/agent/inscription`) | L'agent inscrit une famille avec son accord (langue, porte, téléphone facultatif, enfants, grossesses, vaccins déjà faits, proches). Marche hors ligne : les codes arrivent à la synchronisation. Bouton « Le bébé est né » et retrait de consentement sur la fiche. |
| **Ma grossesse, mois par mois** (`/grossesse`) | Rendez-vous CPN, exercices illustrés (avec emplacements vidéo), **postures douces d'aide au positionnement du bébé** (7ᵉ-9ᵉ mois, avec la règle « jamais de manœuvre sur le ventre »), signes d'alerte, kit d'accouchement, lien vers la déclaration de naissance. Contenus à valider par des professionnels. |
| **Éveil** (fiche, téléphone, carnet) | Un jeu par jour selon l'âge (20 jeux avec objets de la maison), « On l'a fait ✓ », SMS « jeu de la semaine », taux d'éveil sur la carte. **Chansons et petits films** de 1 à 2 minutes (alphabet, nombres, jours, mois, couleurs, corps) : paroles affichées, lettres et nombres **touchers pour les entendre**, versions français / éwé / kabyè / tem (enregistrements à venir). Chaque jeu et chaque chanson a un emplacement de **vidéo pédagogique** (enregistrée pour l'offline). |
| **Annuaire** (`/annuaire`) | Centres de santé, crèches, centres sociaux, état civil par zone. Chaque structure a une **position réelle** : bouton « Autour de moi » (la position du téléphone sert une fois, rien n'est enregistré), distances, et liens **« Suivre la route »** (Google Maps) et « Voir sur la carte » (OpenStreetMap). La famille ou l'agent demande un rappel ou une orientation ; la structure répond depuis `/structure` et la famille reçoit un SMS. La structure entre elle-même ses coordonnées (ou les prend sur place) dans « Mes informations ». |
| **Proches / numéro relais** | Père, grand-parent ou relais reçoivent des rappels généraux sans détail, avec leur accord. Essayez `91000046` dans le simulateur. |
| **Mairie** (`/mairie`) | Reçoit les dossiers de naissance pré-remplis, valide ou rejette (motif obligatoire). |
| **Carte des zones oubliées** (`/carte`) | Indice d'oubli par zone, anonyme, sans point GPS précis ; zones de moins de 5 familles masquées. |
| **Coulisses** (`/admin`) | État des quatre services, et horloge qui fait avancer le temps pour montrer les rendez-vous manqués. |

## Lancer le projet

### Option 1 : Docker (le plus simple)
```bash
docker compose up --build
```
Site : http://localhost:8081 · API : http://localhost:8080 · Assistant : http://localhost:8092 · Base : localhost:5432

### Option 2 : en développement
Prérequis : Java 21, Maven 3.9, Node 22, PostgreSQL 16.

```bash
# 1. Base de données
createdb -U postgres fildor      # ou : docker compose up db
#    utilisateur/mot de passe par défaut : fildor / fildor (voir backend/src/main/resources/application.yml)

# 2. Serveur (migrations Flyway et données fictives au premier démarrage)
cd backend && mvn spring-boot:run          # http://localhost:8080

# 3. Assistant (questions sur les contenus, aucun accès aux dossiers)
cd assistant && pip install -r requirements.txt && python -m uvicorn app:app --host 127.0.0.1 --port 8092

# 4. Site
cd frontend && npm install && npm run dev  # http://localhost:5173
```

### Option 3 : application Android (APK)
L'enveloppe Android (Capacitor) est générée automatiquement : poussez le dépôt sur GitHub, puis
**Actions › Application Android (APK) › Run workflow**. L'APK sort dans **Releases** (`apk-latest`) ;
voir `apk/LISEZ-MOI.md`. L'application garde les saisies sur le téléphone sans réseau et les envoie
au retour du réseau.

### Option 4 : logiciel de bureau Windows (villages sans réseau)
```bash
cd bureau && npm install && npm start
```
Application Electron qui sert le site en local et **synchronise par clé USB** : les saisies de
l'agent partent dans un fichier `fildor-cle-*.json` à la racine d'une clé, que l'on dépose ensuite
au point où le réseau passe (voir `bureau/LISEZ-MOI.md`).

### Comptes de démonstration
Créés au premier démarrage (`FILDOR_COMPTES_DEMO=true`). Mot de passe par défaut : `FilDor2026!demo`
(changez-le avec `FILDOR_MDP_DEMO`).

| Identifiant | Rôle |
|---|---|
| `agent.vo` | Agent de santé, zone rurale de Vo (beaucoup de familles à relancer) |
| `agent.golfe`, `agent.zio` | Agents des zones du Golfe et de Zio |
| `mairie` | Agent d'état civil |
| `structure.golfe`, `structure.vo` | Centre de santé (annuaire et demandes) |
| `decideur` | Responsable régional (carte) |
| `admin` | Tout, plus l'outil de démo |

Téléphones de démo pour le simulateur : familles `90000001` à `90000045` ; proches `91000001` (père), `91000002` (grand-parent), `91000046` (relais d'une famille sans téléphone).

## Scénario de démo conseillé (5 minutes)
1. **Simulateur** : numéro `90000031`, appeler « Vaccins », puis « Signes de danger ». Montrer que la voix éwé/kabyè/tem n'est pas encore enregistrée et que l'application le dit.
2. **Démo** (`admin`) : avancer de 5 jours. Des rendez-vous deviennent manqués, des rappels « sans réponse ».
3. **Agent** (`agent.vo`) : la liste est triée, les raisons sont affichées. Cocher « simuler un village sans réseau », ouvrir un enfant, saisir un périmètre brachial de 112 mm (l'application dit d'orienter vers le centre de santé), lancer une déclaration de naissance.
4. Décocher : la synchronisation part toute seule. La relancer ne crée aucun doublon.
5. **Mairie** : valider le dossier reçu. **Carte** : montrer Vo, Yoto et Lacs en rouge/orange.

## Scénario complémentaire : les nouvelles fonctions
1. **Agent** (`agent.golfe`) : « Inscrire une famille », ajouter un enfant et un proche relais, cocher « sans réseau » : l'inscription part au retour du réseau, sans doublon.
2. **Simulateur** : numéro `91000046` (relais) : messages généraux seulement. Numéro `90000001` : onglet « Jeu du jour », puis « Structures » > « Me rappeler ».
3. **Structure** (`structure.golfe`) : voir la demande par code famille, répondre : la famille reçoit un SMS.
4. **Carnet et QR signé** : depuis la fiche d'un enfant (`agent.golfe`), ouvrir le carnet : chaque feuille porte un QR signé. Ouvrir « Vérifier un QR du carnet » (côté agent ou côté structure), coller le code : l'état du suivi s'affiche, garanti non falsifié par la signature.
5. **Structure** (`structure.golfe`) : les quatre services, puis le cycle (rappels aux proches et jeux de la semaine). **Assistant** : une question sur les vaccins, une sur les convulsions.

## Architecture
```
frontend/ (React + Vite, PWA)  ──/api──▶  backend/ (Spring Boot 3, Java 21)  ──JDBC──▶  PostgreSQL 16
   mode hors ligne (file locale)        API REST, sécurité par rôle                  migrations Flyway
        │                                   ▲
        │                                   │ fichier fildor-cle-*.json (clé USB)
        ├──/assistant──▶  assistant/ (Python)        bureau/ (Electron, Windows)
        │                 textes approuvés          sert le site en local + sync par clé USB
        └── apk/ (Capacitor) : enveloppe Android de la PWA, générée par GitHub Actions
```
Si `uvicorn` ne démarre pas, `python serveur.py` dans `assistant/` sert les mêmes adresses sur le port 8092.
- **Priorité de visite** (`PrioriteService`) : périmètre brachial bas, rappels sans réponse, rendez-vous manqués, naissance non déclarée. Chaque score est renvoyé avec ses raisons.
- **Le carnet devient la base de données** (`CarnetQrService`) : le carnet illustré porte un **QR signé** (Ed25519) qui résume le suivi de chaque enfant (rendez-vous faits, prochain rendez-vous) — aucun nom, aucune adresse. Un agent, un centre ou la mairie le relit depuis « Vérifier un QR » (`/agent/verifier-qr`, `/structure/verifier-qr`), sans contacter le site d'origine : la signature garantit que le code n'a pas été falsifié. Le papier et le numérique forment un seul carnet, qui voyage avec la famille.
- **Hors ligne** : chaque saisie porte un identifiant créé sur le téléphone ; le serveur ignore ce qu'il a déjà reçu (`ON CONFLICT DO NOTHING`).
- **Cycle des rappels** (`RappelService`) : chaque jour à 6 h, ou à la demande via `/api/admin/cycle`.
- **Inscription** : validations avant écriture, transaction unique, idempotente par `client_uuid`. Codes `F-0001` (famille) et `T001A` (enfant).
- **Naissance sans déplacement** : les noms sont pris à la CPN (`identite_parents`, accord de chaque parent), la déclaration part du village, la mairie valide à distance, la famille reçoit un SMS à la validation (reçu + code) puis un SMS « acte prêt ». Le formulaire de déclaration est pré-rempli avec l'identité prénatale.
- **Jeu du jour** (`ChoixJeu`) : choix déterministe par âge et semaine (lundi), identique au téléphone, sur la fiche et dans le carnet.
- **SMS simulés** : écrits en base. L'envoi réel dépend d'un accord avec un opérateur togolais.

## Protection de l'enfant et des données
- Aucun nom, photo, adresse ni point GPS précis. Familles et enfants identifiés par un **code**.
- Le QR du carnet suit la même règle : **codes et dates seulement**, signé cryptographiquement (Ed25519, clé configurable par `FILDOR_CLE_QR` ; clé de démonstration dans `application.yml`), jamais de nom ni de position.
- Téléphones stockés sous forme de **hash** (SHA-256 avec un poivre secret), jamais en clair.
- Accès **par rôle** et **par zone** ; **journal des accès** (`journal_acces`) pour chaque consultation.
- Carte **anonyme** : taux par zone, zones de moins de 5 familles masquées.
- Aucun appel enregistré. Contenus de santé : informer et orienter, jamais de diagnostic (`a_valider = TRUE` tant que non validés).
- Cadre légal visé : loi n° 2019-014 du 29 octobre 2019 (déclaration à l'IPDCP et autorisation pour les données de santé **avant tout test réel**).

## Ce qui reste à faire avant un vrai pilote
- Brancher un opérateur (voix, SMS, USSD) ; enregistrer les voix éwé, kabyè, tem avec des locuteurs natifs.
- Faire valider les contenus de santé et le calendrier vaccinal (PEV), et la valeur légale du reçu de naissance.
- Authentification de production (jetons, HTTPS obligatoire, mots de passe personnels, double facteur pour la mairie), limitation d'appels côté proxy.
- Mesurer la couverture réseau réelle par zone (colonne `zone.couverture_reseau`, aujourd'hui `INCONNUE`).
- Stockage chiffré de la file hors ligne sur le téléphone (aujourd'hui `localStorage`) ; distribution de la clé de signature Android (l'APK de démo est signé avec la clé de debug, passer à un bundle AAB pour le Play Store).
- Hébergement et transferts de données conformes à la loi togolaise (art. 28).

## Tests
```bash
cd backend && mvn test      # priorités, indice d'oubli, hash des téléphones, calendrier vaccinal, choix des jeux, règles d'inscription, QR signé
cd frontend && npm test     # formats, âge, périmètre brachial, file hors ligne, lecture du QR
```
Une CI GitHub Actions (`.github/workflows/ci.yml`) lance les deux à chaque poussée sur `main` :
backend avec un vrai PostgreSQL en conteneur (Testcontainers), frontend avec Vitest.
