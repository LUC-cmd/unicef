"""Assistant Fil d'Or : réponses uniquement à partir des contenus approuvés.

Il informe et oriente. Il ne pose aucun diagnostic et n'invente pas de conseil.
"""

import json
import re
import unicodedata
from pathlib import Path

LIMITE = "Fil d'Or informe et oriente. Il ne pose aucun diagnostic et ne prescrit aucun traitement."

# Signes qui doivent ouvrir le message d'urgence, même si un autre sujet marque aussi.
URGENCE = (
    "convulsion", "convulsions", "inconscient", "saignement", "hemorragie",
    "respire difficilement", "respire vite", "ne boit plus", "ne tete plus",
    "vomit tout", "tres faible", "difficile a reveiller", "bouge moins",
    "vue trouble", "maux de tete",
)

VIDES = {
    "le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "a", "au", "aux",
    "en", "pour", "mon", "ma", "mes", "son", "sa", "ses", "est", "que", "qui", "quoi",
    "dans", "sur", "avec", "pas", "ne", "je", "tu", "il", "elle", "on", "nous", "vous",
    "ce", "cette", "ces", "d", "l", "n", "y", "plus", "tout", "comme", "comment",
    "enfant", "bebe", "mere", "famille",
}


def plier(texte):
    brut = unicodedata.normalize("NFD", (texte or "").lower())
    sans = "".join(c for c in brut if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", sans).strip()


def mots(texte):
    return [m for m in plier(texte).split() if m not in VIDES and len(m) > 1]


def charger(chemin=None):
    source = Path(chemin) if chemin else Path(__file__).with_name("corpus.json")
    return json.loads(source.read_text(encoding="utf-8"))


def _urgence(question_pliee):
    return any(signe in question_pliee for signe in URGENCE)


def repondre(question, corpus):
    propre = (question or "").strip()
    if len(propre) < 3:
        return {
            "niveau": "INCONNU",
            "reponse": "Posez une question courte : un vaccin, la naissance, l'alimentation, un jeu, un signe qui inquiète.",
            "sources": [],
            "limite": LIMITE,
        }

    plie = plier(propre)
    jetons = set(mots(propre))
    danger = next(c for c in corpus if c["sujet"] == "DANGER")

    if _urgence(plie):
        return {
            "niveau": "URGENCE",
            "reponse": danger["texte"],
            "sources": [{"sujet": danger["sujet"], "titre": danger["titre"]}],
            "limite": LIMITE,
        }

    notes = []
    for doc in corpus:
        sac = set(doc.get("mots", [])) | set(mots(doc["titre"])) | set(mots(doc["texte"]))
        commun = jetons & sac
        if not commun:
            continue
        notes.append((len(commun), doc))
    notes.sort(key=lambda paire: (-paire[0], paire[1]["sujet"]))

    if not notes:
        return {
            "niveau": "INCONNU",
            "reponse": "Cette question n'est pas dans les contenus de Fil d'Or. Parlez-en à l'agent de santé ou au centre de santé. En cas de signe grave, allez-y tout de suite.",
            "sources": [],
            "limite": LIMITE,
        }

    choisi = notes[0][1]
    return {
        "niveau": "INFO",
        "reponse": choisi["texte"],
        "sources": [{"sujet": choisi["sujet"], "titre": choisi["titre"]}],
        "limite": LIMITE,
    }
