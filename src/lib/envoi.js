// Envoyer tout de suite si le réseau est là, sinon mettre en file d'attente pour la synchronisation.
// Une erreur du serveur (donnée refusée) est renvoyée à l'agent : on ne met pas en file ce qui sera refusé.

/**
 * @param {{enLigne: boolean, envoyer: () => Promise<any>, mettreEnFile: () => void}} p
 * @returns {Promise<{envoye: boolean, resultat?: any}>}
 */
export async function envoyerOuMettreEnFile({ enLigne, envoyer, mettreEnFile }) {
  if (enLigne) {
    try {
      const resultat = await envoyer()
      return { envoye: true, resultat }
    } catch (e) {
      if (e.statut !== 0) throw e // le serveur a répondu : donnée refusée, l'agent doit corriger
      // statut 0 : réseau coupé en route, on met en file
    }
  }
  mettreEnFile()
  return { envoye: false }
}
