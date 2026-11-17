#!/bin/sh
# Écrit /fildor-config.js au démarrage du conteneur : le site ET le logiciel Windows y lisent le mot de passe
# des comptes de démonstration, qui est celui de Railway (une seule source, plus de décalage).
MDP="${VITE_MDP_DEMO:-${FILDOR_MDP_DEMO:-FilDor2026!demo}}"
ECHAPPE=$(printf '%s' "$MDP" | sed 's/\\/\\\\/g; s/"/\\"/g')
APK=$(printf '%s' "${APK_URL:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')
REG=$(printf '%s' "${REGION_DEPLOIEMENT:-Maritime}" | sed 's/[^A-Za-zéèêîô -]//g')
printf 'window.FILDOR_CONFIG = Object.assign(window.FILDOR_CONFIG || {}, { mdpDemo: "%s", apkUrl: "%s", region: "%s" })\n' "$ECHAPPE" "$APK" "$REG" > /usr/share/nginx/html/fildor-config.js
