// Clé PUBLIQUE de vérification des QR signés du carnet (Ed25519, 32 octets en Base64).
// Elle n'est pas secrète : elle sert seulement à vérifier. La clé privée qui signe vit uniquement
// sur le serveur (variable FILDOR_CLE_QR) et n'est jamais dans ce dépôt.
// Embarquée dans l'application, elle permet de vérifier un carnet SANS réseau (Windows, Android, navigateur).
export const CLE_QR_PUBLIQUE = 'BwhdwT2jh+vrHVDhQh/Kdeu9bl34F344viIpqVIsdRw='
