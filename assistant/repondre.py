"""Assistant Fil d'Or : réponses uniquement à partir des contenus approuvés.

Il informe et oriente. Il ne pose aucun diagnostic et n'invente pas de conseil.
"""

import json
import math
import re
import unicodedata
from collections import Counter
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

# Translittération des caractères des alphabets nationaux togolais (éwé, kabyè, tem)
TRANS_LOCAL = str.maketrans({
    "ɔ": "o", "ɛ": "e", "ɖ": "d", "ɩ": "i", "ʋ": "u", "ŋ": "n", "ñ": "n", "ɣ": "g", "ƒ": "f",
    "Ɔ": "o", "Ɛ": "e", "Ɖ": "d", "Ɩ": "i", "Ʋ": "u", "Ŋ": "n", "Ñ": "n", "Ɣ": "g", "Ƒ": "f",
})


def plier(texte):
    brut = unicodedata.normalize("NFD", (texte or "").lower().translate(TRANS_LOCAL))
    sans = "".join(c for c in brut if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", sans).strip()


def mots(texte):
    return [m for m in plier(texte).split() if m not in VIDES and len(m) > 1]


def charger(chemin=None):
    source = Path(chemin) if chemin else Path(__file__).with_name("corpus.json")
    return json.loads(source.read_text(encoding="utf-8"))


def _urgence(question_pliee):
    return any(signe in question_pliee for signe in URGENCE)


def detecter_langue(jetons, corpus):
    """Détecte si la question contient des termes en éwé, kabyè ou tem."""
    comptes = {"ewe": 0, "kabye": 0, "tem": 0}
    for doc in corpus:
        for m in doc.get("mots_ewe", []):
            for t in mots(m):
                if t in jetons:
                    comptes["ewe"] += 1
        for m in doc.get("mots_kabye", []):
            for t in mots(m):
                if t in jetons:
                    comptes["kabye"] += 1
        for m in doc.get("mots_tem", []):
            for t in mots(m):
                if t in jetons:
                    comptes["tem"] += 1

    meilleure_langue, max_pts = max(comptes.items(), key=lambda x: x[1])
    if max_pts > 0:
        return meilleure_langue
    return "fr"


def _calculer_confiance(sim):
    """Calcule un score de confiance de 0 à 100 basé sur la similarité cosinus TF-IDF."""
    if sim <= 0.04:
        return 0
    # Progression sigmoïde douce adaptée à la taille des documents du corpus
    score = 100.0 * (1.0 - math.exp(-6.5 * sim))
    return min(100, max(0, int(round(score))))


def _preparer_corpus_tfidf(corpus, langue_detectee="fr"):
    """Construit l'index TF-IDF en Python standard pour chaque document du corpus."""
    n_docs = len(corpus)
    termes_par_doc = []
    doc_freq = Counter()

    for doc in corpus:
        poids_termes = Counter()

        # Texte principal du sujet (poids standard 1.0)
        for t in mots(doc.get("texte", "")):
            poids_termes[t] += 1.0

        # Titre du sujet (poids élevé 2.5)
        for t in mots(doc.get("titre", "")):
            poids_termes[t] += 2.5

        # Mots-clés généraux français (poids fort 3.0)
        for kw in doc.get("mots", []):
            for t in mots(kw):
                poids_termes[t] += 3.0

        # Mots-clés en éwé
        poids_ewe = 4.0 if langue_detectee == "ewe" else 2.5
        for kw in doc.get("mots_ewe", []):
            for t in mots(kw):
                poids_termes[t] += poids_ewe

        # Mots-clés en kabyè
        poids_kabye = 4.0 if langue_detectee == "kabye" else 2.5
        for kw in doc.get("mots_kabye", []):
            for t in mots(kw):
                poids_termes[t] += poids_kabye

        # Mots-clés en tem
        poids_tem = 4.0 if langue_detectee == "tem" else 2.5
        for kw in doc.get("mots_tem", []):
            for t in mots(kw):
                poids_termes[t] += poids_tem

        termes_par_doc.append((doc, poids_termes))
        for t in poids_termes:
            doc_freq[t] += 1

    # Calcul de l'IDF lissé : ln(1 + N / DF) + 1.0
    idf = {}
    for t, df in doc_freq.items():
        idf[t] = math.log(1.0 + (n_docs / df)) + 1.0

    # Vecteurs TF-IDF normalisés pour chaque document
    vecteurs_docs = []
    for doc, poids_termes in termes_par_doc:
        vec = {}
        for t, tf in poids_termes.items():
            tf_log = 1.0 + math.log(tf)
            vec[t] = tf_log * idf[t]
        norme = math.sqrt(sum(v * v for v in vec.values()))
        vecteurs_docs.append((doc, vec, norme))

    return vecteurs_docs, idf, n_docs


def repondre(question, corpus, historique=None):
    """Répond à une question à partir des contenus validés du corpus.

    Prend en compte l'historique des échanges récents (3 dernières questions)
    et détecte automatiquement les langues nationales (éwé, kabyè, tem).
    """
    propre = (question or "").strip()
    if len(propre) < 3:
        return {
            "niveau": "INCONNU",
            "reponse": "Posez une question courte : un vaccin, la naissance, l'alimentation, un jeu, un signe qui inquiète.",
            "sources": [],
            "confiance": 0,
            "langue": "fr",
            "ambigu": False,
            "limite": LIMITE,
        }

    plie = plier(propre)
    jetons_question = mots(propre)
    jetons_ensemble = set(jetons_question)
    danger = next(c for c in corpus if c["sujet"] == "DANGER")

    # Détection de la langue de la question
    langue = detecter_langue(jetons_ensemble, corpus)

    # Vérification des signes d'urgence vitale
    if _urgence(plie):
        return {
            "niveau": "URGENCE",
            "reponse": danger["texte"],
            "sources": [{"sujet": danger["sujet"], "titre": danger["titre"]}],
            "confiance": 100,
            "langue": langue,
            "ambigu": False,
            "limite": LIMITE,
        }

    # Préparation de l'historique de conversation (3 dernières questions)
    poids_historique = [0.40, 0.25, 0.15]
    derniers = []
    if historique and isinstance(historique, list):
        for h in historique[-3:]:
            if isinstance(h, str) and h.strip():
                derniers.append(h.strip())
            elif isinstance(h, dict) and "question" in h and isinstance(h["question"], str):
                derniers.append(h["question"].strip())

    # Pondération TF de la requête : question actuelle prioritaire, enrichie par l'historique
    tf_requete = Counter()
    for t in jetons_question:
        tf_requete[t] += 1.0

    # Intégration du contexte conversationnel récent
    if derniers:
        for idx, question_passée in enumerate(reversed(derniers)):
            if idx < len(poids_historique):
                coeff = poids_historique[idx]
                for t in mots(question_passée):
                    tf_requete[t] += coeff

    # Indexation et scoring TF-IDF pur Python
    vecteurs_docs, idf, n_docs = _preparer_corpus_tfidf(corpus, langue_detectee=langue)

    # Construction du vecteur TF-IDF de la requête
    vec_q = {}
    for t, tf in tf_requete.items():
        val_idf = idf.get(t, math.log(1.0 + n_docs) + 1.0)
        tf_log = 1.0 + math.log(tf)
        vec_q[t] = tf_log * val_idf
    norme_q = math.sqrt(sum(v * v for v in vec_q.values()))

    if norme_q == 0:
        return {
            "niveau": "INCONNU",
            "reponse": "Cette question n'est pas dans les contenus de Fil d'Or. Parlez-en à l'agent de santé ou au centre de santé. En cas de signe grave, allez-y tout de suite.",
            "sources": [],
            "confiance": 0,
            "langue": langue,
            "ambigu": False,
            "limite": LIMITE,
        }

    # Calcul de similarité cosinus avec chaque document
    scores = []
    for doc, vec_d, norme_d in vecteurs_docs:
        if norme_d == 0:
            continue
        prod_scalaire = sum(vec_q[t] * vec_d[t] for t in vec_q if t in vec_d)
        sim = prod_scalaire / (norme_q * norme_d) if (norme_q * norme_d) > 0 else 0.0
        if sim > 0:
            scores.append((sim, doc))

    scores.sort(key=lambda paire: (-paire[0], paire[1]["sujet"]))

    if not scores or scores[0][0] <= 0.04:
        return {
            "niveau": "INCONNU",
            "reponse": "Cette question n'est pas dans les contenus de Fil d'Or. Parlez-en à l'agent de santé ou au centre de santé. En cas de signe grave, allez-y tout de suite.",
            "sources": [],
            "confiance": 0,
            "langue": langue,
            "ambigu": False,
            "limite": LIMITE,
        }

    meilleur_score, premier_doc = scores[0]
    confiance = _calculer_confiance(meilleur_score)

    # Détection de l'ambiguïté (2 à 3 sujets pertinents proches)
    sources = [{"sujet": premier_doc["sujet"], "titre": premier_doc["titre"]}]
    est_ambigu = False

    if len(scores) > 1:
        deuxieme_score, deuxieme_doc = scores[1]
        # Si le 2e sujet est à au moins 55% de pertinence du 1er
        if deuxieme_score >= 0.55 * meilleur_score and deuxieme_score > 0.04:
            est_ambigu = True
            sources.append({"sujet": deuxieme_doc["sujet"], "titre": deuxieme_doc["titre"]})

            # Si le 3e sujet est également très proche (au moins 50% du 1er)
            if len(scores) > 2:
                troisieme_score, troisieme_doc = scores[2]
                if troisieme_score >= 0.50 * meilleur_score and troisieme_score > 0.04:
                    sources.append({"sujet": troisieme_doc["sujet"], "titre": troisieme_doc["titre"]})

    return {
        "niveau": "INFO",
        "reponse": premier_doc["texte"],
        "sources": sources,
        "confiance": confiance,
        "langue": langue,
        "ambigu": est_ambigu,
        "limite": LIMITE,
    }
