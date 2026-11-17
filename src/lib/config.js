// Mot de passe commun des comptes de démonstration : défini à la construction du site (VITE_MDP_DEMO),
// ou dans le fichier de configuration du logiciel Windows.
export const MDP_DEMO = globalThis.FILDOR_CONFIG?.mdpDemo || import.meta.env.VITE_MDP_DEMO || 'FilDor2026!demo'
