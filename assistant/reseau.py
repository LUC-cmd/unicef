"""Réseau Fil d'Or (prototype) : orientation, alertes aux centres, nutrition, boutiques, questions anonymes.

Ce module est PUR : il ne dépend ni de FastAPI ni du serveur standard. Les deux le branchent sur la même fonction `traiter`.
Données FICTIVES. Stockage : un fichier JSON (FILDOR_DONNEES, par défaut /tmp). À remplacer par la base pour un vrai déploiement.
Aucun nom de personne n'est jamais demandé ni conservé.
Les repères de santé sont des repères généraux (OMS, PCIME) à faire valider par un professionnel.
"""

import base64
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import threading
import time
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------- données fictives
VILLAGES = {
    "agbele": ("Agbélé", 0, 0, "Éwé"),
    "kpadape": ("Kpadapé", 9, 6, "Kabiyè"),
    "zogbedji": ("Zogbédji", 19, -4, "Mina"),
    "davie": ("Davié", 31, 11, "Éwé"),
    "tovegan": ("Tovégan", 42, -8, "Kabiyè"),
}
CENTRES = {
    "c1": ("Dispensaire d’Agbélé (fictif)", "agbele", 1, "Soins de base, vaccination"),
    "c2": ("Centre de santé de Kpadapé (fictif)", "kpadape", 2, "Sage-femme, accouchement simple"),
    "c3": ("Centre de santé de Zogbédji (fictif)", "zogbedji", 2, "Sage-femme, accouchement simple"),
    "c4": ("Hôpital de Davié (fictif)", "davie", 3, "Césarienne, urgences, réanimation du nouveau-né"),
}
POINTS = {
    "n1": ("Nutritionniste du centre de Kpadapé (fictif)", "kpadape", "Nutritionniste"),
    "n2": ("Boutique « Bonne bouillie » d’Agbélé (fictive)", "agbele", "Boutique partenaire"),
    "n3": ("Boutique du marché de Zogbédji (fictive)", "zogbedji", "Boutique partenaire"),
}
CAS = ("grossesse", "accouchement", "nouveauNe", "enfant")
LIBELLE_CAS = {"grossesse": "Femme enceinte", "accouchement": "Accouchement", "nouveauNe": "Nouveau-né", "enfant": "Enfant"}
POUR_DEMANDE = ("grossesse", "allaitement", "petit", "muac")
POUR_PRODUIT = ("ado", "grossesse", "allaitement", "petit")
POINTS_CONTROLE = ("periodes", "hygiene", "prix", "substituts", "bons")

# (id, libellé, gravité, mots-clés)
SIGNES = {
    "grossesse": [
        ("saigne", "Elle saigne", "urgent", ("saign", "sang")),
        ("convulse", "Convulsions", "urgent", ("convuls", "crise")),
        ("tete", "Maux de tête violents, vue trouble", "urgent", ("mal de tete", "maux de tete", "vue")),
        ("liquide", "Perte de liquide avant le terme", "urgent", ("liquide", "eau")),
        ("mouvement", "Le bébé ne bouge plus", "urgent", ("bouge",)),
        ("fievre", "Forte fièvre", "urgent", ("fievre", "chaud")),
        ("gonfle", "Visage ou mains gonflés", "consulter", ("gonfl", "enfl")),
        ("vomit", "Vomissements importants", "consulter", ("vomi",)),
    ],
    "accouchement": [
        ("long", "Le travail dure depuis plus de 12 heures", "urgent", ("long", "heures")),
        ("hemorragie", "Saignement abondant", "urgent", ("saign", "sang", "hemorrag")),
        ("placenta", "Le placenta n’est pas sorti", "urgent", ("placenta",)),
        ("infection", "Fièvre ou mauvaise odeur après l’accouchement", "urgent", ("fievre", "odeur")),
        ("convulse2", "Convulsions", "urgent", ("convuls",)),
    ],
    "nouveauNe": [
        ("tete2", "Ne tète plus", "urgent", ("tete", "teter")),
        ("convulse3", "Convulsions", "urgent", ("convuls",)),
        ("respire", "Respire vite ou avec effort", "urgent", ("respir",)),
        ("froid", "Très froid ou très chaud", "urgent", ("froid", "chaud", "fievre")),
        ("jaune", "Jaune dès le premier jour", "urgent", ("jaune",)),
        ("cordon", "Cordon rouge ou qui coule", "consulter", ("cordon",)),
    ],
    "enfant": [
        ("boit", "Ne peut plus boire ni manger", "urgent", ("boit", "boire", "manger")),
        ("vomitout", "Vomit tout ce qu’il prend", "urgent", ("vomit",)),
        ("convulse4", "Convulsions", "urgent", ("convuls",)),
        ("dort", "Très endormi, mou, ne réagit pas", "urgent", ("endormi", "mou", "reagit")),
        ("fievre2", "Fièvre", "consulter", ("fievre",)),
        ("diarrhee", "Diarrhée", "consulter", ("diarrh", "selles")),
        ("toux", "Toux ou respiration difficile", "consulter", ("toux", "respir")),
    ],
}

# comptes de démonstration : identifiant -> (rôle, rattachement, nom affiché)
COMPTES = {
    "boutique.agbele": ("boutique", "n2", "Boutique « Bonne bouillie » d’Agbélé"),
    "boutique.zogbedji": ("boutique", "n3", "Boutique du marché de Zogbédji"),
    "agent.nutrition": ("agent", "", "Agent de santé (réseau nutrition)"),
    "centre.agbele": ("centre", "c1", CENTRES["c1"][0]),
    "centre.kpadape": ("centre", "c2", CENTRES["c2"][0]),
    "centre.zogbedji": ("centre", "c3", CENTRES["c3"][0]),
    "centre.davie": ("centre", "c4", CENTRES["c4"][0]),
    "district.togo": ("district", "", "Responsable de district (démonstration)"),
    "ecole.agbele": ("ecole", "e1", "Jardin d’enfants d’Agbélé (fictif)"),
    "ecole.davie": ("ecole", "e2", "École maternelle de Davié (fictive)"),
    "ecole.zogbedji": ("ecole", "e3", "Crèche communautaire de Zogbédji (fictive)"),
}

# Structures d'accueil des 0-5 ans (FICTIVES) : id -> (nom, village, type, enfants inscrits, enfants vaccinés à jour, repas servis par jour)
STRUCTURES = {
    "e1": ("Jardin d’enfants d’Agbélé (fictif)", "agbele", "Jardin d’enfants (3 à 5 ans)", 38, 31, 38),
    "e2": ("École maternelle de Davié (fictive)", "davie", "École maternelle (4 à 5 ans)", 54, 36, 0),
    "e3": ("Crèche communautaire de Zogbédji (fictive)", "zogbedji", "Crèche (0 à 3 ans)", 22, 20, 22),
}
MOTIFS_SIGNALEMENT = {"absent": "Absent depuis plus de 3 jours", "maigre": "Semble très maigre (mesure du bras à faire)", "fievre": "Fièvre ou toux persistante",
                      "vaccin": "Vaccin en retard", "comportement": "Changement de comportement inquiétant"}

# Suivi des enfants par village (FICTIF) : (enfants inscrits, enfants vus ces 30 derniers jours avant les saisies du prototype)
SUIVI_BASE = {"agbele": (62, 51), "kpadape": (48, 21), "zogbedji": (71, 26), "davie": (95, 36), "tovegan": (27, 9)}
ETATS_REF = ("envoyee", "recue", "arrivee", "prise", "suivie")
ETAT_ALERTE_VERS_REF = {"en-route": "envoyee", "arrive": "arrivee", "pris": "prise"}
ETAT_REF_VERS_ALERTE = {"arrivee": "arrive", "prise": "pris"}
FINALES = ("prise", "suivie")
DELAI_RETARD_H = 24
SUJETS_APPEL = {"vaccination": "Rappel de vaccination", "naissance": "Déclaration de naissance", "rendez-vous": "Rendez-vous de consultation",
                "nutrition": "Conseil de nutrition", "croissance": "Mesure de croissance"}
TENTATIVES_MAX = 3
RE_ID_CLIENT = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
RE_CODE_ENFANT = re.compile(r"^[A-Z0-9-]{3,12}$")
RE_CODE_FAMILLE = re.compile(r"^FAM-[A-Z0-9]{4}$")

MAX_PAR_COLLECTION = 2000
ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def plier(texte):
    brut = unicodedata.normalize("NFD", (texte or "").lower())
    return "".join(c for c in brut if unicodedata.category(c) != "Mn")


def maintenant():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def distance_km(a, b):
    va, vb = VILLAGES[a], VILLAGES[b]
    return round(math.hypot(va[1] - vb[1], va[2] - vb[2]), 1)


def centre_pour(village, besoin):
    candidats = [(distance_km(village, c[1]), cid) for cid, c in CENTRES.items() if c[2] >= besoin]
    if not candidats:
        return None
    km, cid = min(candidats)
    c = CENTRES[cid]
    return {"id": cid, "nom": c[0], "niveau": c[2], "services": c[3], "km": km}


def _mot_present(mot, texte, jetons):
    """Un mot-clé de 3 lettres ou moins doit être un mot entier (évite « eau » dans « beaucoup »). Les autres sont des débuts de mot."""
    if " " in mot:
        return mot in texte
    return any(t == mot for t in jetons) if len(mot) <= 3 else any(t.startswith(mot) for t in jetons)


def signes_depuis_texte(cas, texte):
    s = plier(texte)
    jetons = re.findall(r"[a-z0-9]+", s)
    return [sid for sid, _lib, _g, mots in SIGNES[cas] if any(_mot_present(plier(m), s, jetons) for m in mots)]


def orienter(cas, signes, village):
    liste = [x for x in SIGNES[cas] if x[0] in signes]
    if not liste:
        return {"niveau": "bon", "titre": "Aucun signe de danger coché",
                "texte": "Continuer le suivi habituel. En cas de doute, orienter vers le centre le plus proche.", "centre": None, "signes": []}
    urgent = any(x[2] == "urgent" for x in liste)
    obstetrical = cas in ("grossesse", "accouchement", "nouveauNe")
    besoin = (3 if obstetrical else 2) if urgent else 1
    return {
        "niveau": "urgent" if urgent else "surveiller",
        "titre": "Urgence : orienter tout de suite" if urgent else "À voir au centre de santé aujourd’hui",
        "texte": ("Ne pas attendre. Prévenir le centre pour qu’il prépare l’accueil, et prévoir un transport sûr. Rester auprès de la personne."
                  if urgent else "Orienter vers le centre de santé le plus proche."),
        "centre": centre_pour(village, besoin), "signes": [x[1] for x in liste],
    }


# ---------------------------------------------------------------- authentification (démonstration)
def _secret():
    return os.environ.get("FILDOR_JETON", "") or _SECRET_ALEATOIRE


_SECRET_ALEATOIRE = secrets.token_hex(32)


def mot_de_passe_demo():
    # une variable vide (référence non résolue) ne doit jamais devenir « pas de mot de passe »
    return os.environ.get("FILDOR_MDP_DEMO") or "FilDor2026!demo"


def emettre_jeton(identifiant, duree=8 * 3600):
    corps = base64.urlsafe_b64encode(json.dumps({"u": identifiant, "exp": int(time.time()) + duree}).encode()).decode().rstrip("=")
    sig = hmac.new(_secret().encode(), corps.encode(), hashlib.sha256).hexdigest()
    return f"{corps}.{sig}"


def lire_jeton(jeton):
    """Retourne (identifiant, rôle, rattachement, nom) ou None."""
    try:
        corps, sig = (jeton or "").split(".", 1)
        attendu = hmac.new(_secret().encode(), corps.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, attendu):
            return None
        donnees = json.loads(base64.urlsafe_b64decode(corps + "=" * (-len(corps) % 4)))
        if donnees["exp"] < time.time() or donnees["u"] not in COMPTES:
            return None
        role, ref, nom = COMPTES[donnees["u"]]
        return donnees["u"], role, ref, nom
    except (ValueError, KeyError, TypeError):
        return None


# ---------------------------------------------------------------- stockage
class Stock:
    def __init__(self, chemin=None, graine=False):
        self.chemin = Path(chemin) if chemin else None
        self.verrou = threading.Lock()
        self.d = {"alertes": [], "demandes": [], "produits": [], "controles": [], "questions": [], "references": [], "visites": [], "appels": [], "presences": []}
        if self.chemin and self.chemin.exists():
            try:
                lu = json.loads(self.chemin.read_text(encoding="utf-8"))
                for k in self.d:
                    if isinstance(lu.get(k), list):
                        self.d[k] = lu[k]
            except (OSError, ValueError):
                pass
        if not self.d["produits"]:
            self.d["produits"] = _produits_depart()
            if graine:
                for k, v in _demo_depart().items():
                    if k == "produits":
                        self.d[k] = v + self.d[k]
                    elif not self.d[k]:
                        self.d[k] = v
            if not self.d["references"]:
                self.d["references"], appels = _demo_suivi(self.d["alertes"])
                if not self.d["appels"]:
                    self.d["appels"] = appels

    def sauver(self):
        if not self.chemin:
            return
        try:
            tmp = self.chemin.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.d, ensure_ascii=False), encoding="utf-8")
            tmp.replace(self.chemin)
        except OSError:
            pass  # le prototype continue en mémoire

    def ajouter(self, nom, item):
        with self.verrou:
            self.d[nom].insert(0, item)
            del self.d[nom][MAX_PAR_COLLECTION:]
            self.sauver()
        return item

    def trouver(self, nom, ident):
        return next((x for x in self.d[nom] if x.get("id") == ident), None)

    def modifier(self, nom, ident, **champs):
        with self.verrou:
            x = self.trouver(nom, ident)
            if x is None:
                return None
            x.update(champs)
            self.sauver()
            return x


def _produits_depart():
    base = [
        ("n2", "Farine enrichie pour bouillie", "petit", "Farine de maïs, soja et arachide, pour bébé dès 6 mois", "1 000 FCFA (fictif)"),
        ("n2", "Haricots niébé", "grossesse", "Riche en fer, pour la femme enceinte", "600 FCFA le kilo (fictif)"),
        ("n3", "Poisson séché", "allaitement", "Protéines pour la mère qui allaite", "800 FCFA (fictif)"),
    ]
    return [{"id": uuid.uuid4().hex[:10], "pointId": p, "nom": n, "pour": pour, "description": d, "prix": prix, "etat": "valide", "motif": "", "date": maintenant()}
            for p, n, pour, d, prix in base]


def _demo_depart():
    """Données fictives pour que chaque tableau de bord soit déjà rempli à l'ouverture. Rien ne vient d'une vraie personne."""
    def i():
        return uuid.uuid4().hex[:10]
    d = maintenant()[:10]
    donnees = {
        "produits": [
            {"id": i(), "pointId": "n2", "nom": "Bouillie enrichie au soja", "pour": "petit", "description": "Pour bébé dès 6 mois, sans sucre ajouté", "prix": "900 FCFA (fictif)", "etat": "attente", "motif": "", "date": maintenant()},
            {"id": i(), "pointId": "n2", "nom": "Serviettes lavables (lot de 3)", "pour": "ado", "description": "Lavables et séchées au soleil", "prix": "1 500 FCFA (fictif)", "etat": "valide", "motif": "", "date": maintenant()},
            {"id": i(), "pointId": "n3", "nom": "Sirop sucré miracle", "pour": "petit", "description": "Annonce « fait grossir vite »", "prix": "2 000 FCFA (fictif)", "etat": "refuse", "motif": "Produit sucré, sans intérêt nutritionnel : refusé.", "date": maintenant()},
            {"id": i(), "pointId": "n3", "nom": "Œufs frais (plateau)", "pour": "grossesse", "description": "Protéines et fer", "prix": "1 800 FCFA (fictif)", "etat": "attente", "motif": "", "date": maintenant()},
        ],
        "demandes": [
            {"id": i(), "pointId": "n2", "pour": "grossesse", "village": "agbele", "date": d, "etat": "demande"},
            {"id": i(), "pointId": "n2", "pour": "petit", "village": "agbele", "date": d, "etat": "visite"},
            {"id": i(), "pointId": "n3", "pour": "allaitement", "village": "zogbedji", "date": d, "etat": "demande"},
            {"id": i(), "pointId": "n1", "pour": "muac", "village": "kpadape", "date": d, "etat": "suivi"},
        ],
        "controles": [
            {"id": i(), "pointId": "n2", "date": d, "ok": ["bons", "hygiene", "periodes", "prix", "substituts"], "n": 5, "conforme": True},
            {"id": i(), "pointId": "n3", "date": d, "ok": ["hygiene", "prix"], "n": 2, "conforme": False},
        ],
        "alertes": [
            {"id": i(), "centreId": "c4", "cas": "grossesse", "niveau": "urgent", "signes": ["Elle saigne"], "depuis": "tovegan", "heure": maintenant(), "etat": "en-route"},
            {"id": i(), "centreId": "c4", "cas": "nouveauNe", "niveau": "surveiller", "signes": ["Fièvre"], "depuis": "davie", "heure": maintenant(), "etat": "en-route"},
            {"id": i(), "centreId": "c2", "cas": "enfant", "niveau": "surveiller", "signes": ["Diarrhée depuis 2 jours"], "depuis": "kpadape", "heure": maintenant(), "etat": "arrive"},
            {"id": i(), "centreId": "c3", "cas": "accouchement", "niveau": "urgent", "signes": ["Contractions rapprochées"], "depuis": "zogbedji", "heure": maintenant(), "etat": "en-route"},
        ],
        "references": [], "appels": [],
        "questions": [
            {"id": i(), "code": "KM4Q7TXA", "texte": "J'ai mal au ventre à chaque règle, est-ce normal ?", "date": d, "reponse": ""},
            {"id": i(), "code": "RT9W2HPN", "texte": "Mes règles ont du retard de deux semaines. Que faire ?", "date": d, "reponse": "Un retard peut avoir plusieurs causes. Va au centre de santé pour un test, avec une personne de confiance : tu seras bien reçue."},
            {"id": i(), "code": "ZH6C3VDE", "texte": "Où trouver des préservatifs sans que personne ne me connaisse ?", "date": d, "reponse": ""},
        ],
    }
    donnees["references"], donnees["appels"] = _demo_suivi(donnees["alertes"])
    donnees["presences"] = []
    auj = datetime.now(timezone.utc).date()
    for sid, st in STRUCTURES.items():
        for i, taux in zip(range(6, 0, -1), (0.9, 0.88, 0.92, 0.8, 0.86, 0.84)):
            donnees["presences"].append({"id": uuid.uuid4().hex[:10], "structure": sid, "jour": (auj - timedelta(days=i)).isoformat(), "presents": round(st[3] * taux)})
    return donnees


def avant(heures):
    return (datetime.now(timezone.utc) - timedelta(hours=heures)).isoformat(timespec="seconds")


def _ref(village, cas, niveau, centre, origine, parcours, alerte=""):
    """Une référence : une orientation suivie jusqu'à la prise en charge. `parcours` = [(état, il y a combien d'heures)]. Aucun nom."""
    hist = [{"etat": e, "heure": avant(h)} for e, h in parcours]
    return {"id": uuid.uuid4().hex[:10], "village": village, "cas": cas, "niveau": niveau, "centreId": centre, "origine": origine,
            "etat": parcours[-1][0], "heure": hist[0]["heure"], "historique": hist, "alerteId": alerte, "idClient": ""}


def _demo_suivi(alertes):
    refs = []
    for a in alertes:
        refs.append(_ref(a["depuis"], a["cas"], a["niveau"], a["centreId"], "alerte", [(ETAT_ALERTE_VERS_REF[a["etat"]], 1)], a["id"]))
    refs += [
        _ref("agbele", "enfant", "surveiller", "c1", "visite", [("envoyee", 30), ("arrivee", 28), ("prise", 27)]),
        _ref("kpadape", "nouveauNe", "urgent", "c4", "visite", [("envoyee", 52), ("arrivee", 50), ("prise", 48), ("suivie", 10)]),
        _ref("tovegan", "grossesse", "urgent", "c4", "agent", [("envoyee", 40)]),
        _ref("zogbedji", "enfant", "surveiller", "c3", "visite", [("envoyee", 26), ("recue", 25)]),
        _ref("davie", "grossesse", "surveiller", "c4", "agent", [("envoyee", 20), ("arrivee", 18), ("prise", 17)]),
        _ref("tovegan", "enfant", "urgent", "c2", "visite", [("envoyee", 8), ("arrivee", 6)]),
        _ref("agbele", "grossesse", "urgent", "c4", "agent", [("envoyee", 76), ("arrivee", 74), ("prise", 72)]),
        _ref("zogbedji", "enfant", "surveiller", "c3", "visite", [("envoyee", 100), ("arrivee", 96), ("prise", 94)]),
        _ref("davie", "nouveauNe", "urgent", "c4", "visite", [("envoyee", 124), ("arrivee", 123), ("prise", 122)]),
        _ref("kpadape", "enfant", "surveiller", "c2", "agent", [("envoyee", 148), ("arrivee", 144), ("prise", 140), ("suivie", 100)]),
        _ref("tovegan", "enfant", "surveiller", "c2", "visite", [("envoyee", 172), ("arrivee", 166), ("prise", 160)]),
    ]
    appels = [
        {"id": uuid.uuid4().hex[:10], "famille": "FAM-7K2Q", "village": "tovegan", "sujet": "vaccination", "langue": "Kabiyè", "etat": "a-visiter", "tentatives": 3, "heure": avant(30)},
        {"id": uuid.uuid4().hex[:10], "famille": "FAM-4M9D", "village": "agbele", "sujet": "naissance", "langue": "Éwé", "etat": "en-attente", "tentatives": 0, "heure": avant(2)},
        {"id": uuid.uuid4().hex[:10], "famille": "FAM-H3XP", "village": "kpadape", "sujet": "rendez-vous", "langue": "Kabiyè", "etat": "en-attente", "tentatives": 1, "heure": avant(5)},
        {"id": uuid.uuid4().hex[:10], "famille": "FAM-B8RT", "village": "zogbedji", "sujet": "nutrition", "langue": "Mina", "etat": "joint", "tentatives": 1, "heure": avant(9)},
    ]
    return refs, appels


def court(v, n):
    return str(v or "").strip()[:n]


class Erreur(Exception):
    def __init__(self, code, detail):
        super().__init__(detail)
        self.code = code
        self.detail = detail


# ---------------------------------------------------------------- le routeur commun
class Reseau:
    def __init__(self, stock=None, repondre=None, corpus=None):
        self.s = stock or Stock(os.environ.get("FILDOR_DONNEES", "/tmp/fildor-reseau.json"), graine=True)
        self.repondre = repondre
        self.corpus = corpus

    def _auth(self, jeton, *roles):
        u = lire_jeton(jeton)
        if not u:
            raise Erreur(401, "Connexion requise.")
        if roles and u[1] not in roles:
            raise Erreur(403, "Cet espace n’est pas le vôtre.")
        return u

    def traiter(self, methode, chemin, corps=None, jeton=""):
        """Retourne (code HTTP, objet JSON)."""
        try:
            return 200, self._route(methode.upper(), [p for p in chemin.strip("/").split("/") if p], corps or {}, jeton)
        except Erreur as e:
            return e.code, {"detail": e.detail}

    def _route(self, m, p, c, jeton):
        if not isinstance(c, dict):
            raise Erreur(422, "Corps JSON attendu.")
        n = len(p)
        if m == "POST" and p == ["connexion"]:
            ident = court(c.get("identifiant"), 60).lower()
            if ident not in COMPTES or not hmac.compare_digest(str(c.get("mdp", "")).encode(), mot_de_passe_demo().encode()):
                raise Erreur(401, "Identifiant ou mot de passe incorrect.")
            role, ref, nom = COMPTES[ident]
            return {"jeton": emettre_jeton(ident), "identifiant": ident, "role": role, "ref": ref, "nom": nom}
        if m == "GET" and p == ["points"]:
            return {"villages": [{"id": k, "nom": v[0], "langue": v[3]} for k, v in VILLAGES.items()],
                    "centres": [{"id": k, "nom": v[0], "village": v[1], "niveau": v[2], "services": v[3]} for k, v in CENTRES.items()],
                    "points": [{"id": k, "nom": v[0], "village": v[1], "type": v[2]} for k, v in POINTS.items()]}
        if m == "POST" and p == ["orienter"]:
            return self._orienter(c)
        # ---- alertes
        if p[:1] == ["alertes"]:
            if m == "POST" and n == 1:
                return self._creer_alerte(c)
            if m == "GET" and n == 1:
                u = self._auth(jeton, "centre", "agent")
                liste = [a for a in self.s.d["alertes"] if u[1] == "agent" or a["centreId"] == u[2]]
                return {"alertes": liste}
            if m == "PATCH" and n == 2:
                u = self._auth(jeton, "centre")
                a = self.s.trouver("alertes", p[1])
                if not a or a["centreId"] != u[2]:
                    raise Erreur(404, "Alerte introuvable.")
                if c.get("etat") not in ("arrive", "pris"):
                    raise Erreur(422, "État attendu : arrive ou pris.")
                x = self.s.modifier("alertes", p[1], etat=c["etat"])
                r = next((r for r in self.s.d["references"] if r.get("alerteId") == p[1]), None)
                if r:
                    self._avancer_reference(r, ETAT_ALERTE_VERS_REF[c["etat"]])
                return x
        # ---- demandes de nutrition
        if p[:1] == ["demandes"]:
            if m == "POST" and n == 1:
                pt, pour, vil = c.get("pointId"), c.get("pour"), c.get("village")
                if pt not in POINTS or pour not in POUR_DEMANDE or vil not in VILLAGES:
                    raise Erreur(422, "Point, motif et village attendus.")
                return self.s.ajouter("demandes", {"id": uuid.uuid4().hex[:10], "pointId": pt, "pour": pour, "village": vil, "date": maintenant()[:10], "etat": "demande"})
            if m == "GET" and n == 1:
                u = self._auth(jeton, "boutique", "agent")
                return {"demandes": [d for d in self.s.d["demandes"] if u[1] == "agent" or d["pointId"] == u[2]]}
            if m == "PATCH" and n == 2:
                u = self._auth(jeton, "boutique", "agent")
                d = self.s.trouver("demandes", p[1])
                if not d or (u[1] == "boutique" and d["pointId"] != u[2]):
                    raise Erreur(404, "Demande introuvable.")
                if c.get("etat") not in ("visite", "suivi"):
                    raise Erreur(422, "État attendu : visite ou suivi.")
                return self.s.modifier("demandes", p[1], etat=c["etat"])
        # ---- produits des boutiques
        if p[:1] == ["produits"]:
            if m == "GET" and n == 1:
                u = lire_jeton(jeton)
                tous = self.s.d["produits"]
                if u and u[1] == "agent":
                    return {"produits": tous}
                if u and u[1] == "boutique":
                    return {"produits": [x for x in tous if x["pointId"] == u[2]]}
                return {"produits": [x for x in tous if x["etat"] == "valide"]}
            if m == "POST" and n == 1:
                u = self._auth(jeton, "boutique")
                nom, pour = court(c.get("nom"), 80), c.get("pour")
                if not nom or pour not in POUR_PRODUIT:
                    raise Erreur(422, "Nom et public attendus.")
                return self.s.ajouter("produits", {"id": uuid.uuid4().hex[:10], "pointId": u[2], "nom": nom, "pour": pour, "description": court(c.get("description"), 200),
                                                   "prix": court(c.get("prix"), 40), "etat": "attente", "motif": "", "date": maintenant()})
            if m == "PATCH" and n == 2:
                self._auth(jeton, "agent")
                if c.get("etat") not in ("valide", "refuse"):
                    raise Erreur(422, "État attendu : valide ou refuse.")
                x = self.s.modifier("produits", p[1], etat=c["etat"], motif=court(c.get("motif"), 200))
                if not x:
                    raise Erreur(404, "Produit introuvable.")
                return x
        # ---- contrôles des boutiques
        if p[:1] == ["controles"]:
            if m == "GET" and n == 1:
                u = self._auth(jeton, "agent", "boutique")
                return {"controles": [x for x in self.s.d["controles"] if u[1] == "agent" or x["pointId"] == u[2]]}
            if m == "POST" and n == 1:
                self._auth(jeton, "agent")
                pt = c.get("pointId")
                if pt not in POINTS or POINTS[pt][2] != "Boutique partenaire":
                    raise Erreur(422, "Boutique attendue.")
                ok = [x for x in (c.get("ok") or []) if x in POINTS_CONTROLE] if isinstance(c.get("ok"), list) else []
                ok = sorted(set(ok))
                return self.s.ajouter("controles", {"id": uuid.uuid4().hex[:10], "pointId": pt, "date": maintenant()[:10], "ok": ok, "n": len(ok), "conforme": len(ok) == len(POINTS_CONTROLE)})
        # ---- questions anonymes
        if p[:1] == ["questions"]:
            if m == "POST" and n == 1:
                texte = court(c.get("texte"), 600)
                if not texte:
                    raise Erreur(422, "Question attendue.")
                code = court(c.get("code"), 8).upper()
                valide = len(code) == 8 and all(x in ALPHABET_CODE for x in code)
                if not valide or any(q["code"] == code for q in self.s.d["questions"]):
                    code = "".join(secrets.choice(ALPHABET_CODE) for _ in range(8))
                self.s.ajouter("questions", {"id": uuid.uuid4().hex[:10], "code": code, "texte": texte, "date": maintenant()[:10], "reponse": ""})
                return {"code": code}
            if m == "GET" and n == 1:
                self._auth(jeton, "agent")
                return {"questions": [{k: v for k, v in q.items() if k != "code"} for q in self.s.d["questions"]]}
            if m == "GET" and n == 2:
                q = next((x for x in self.s.d["questions"] if x["code"] == p[1].upper()), None)
                if not q:
                    raise Erreur(404, "Numéro inconnu.")
                return {"reponse": q["reponse"]}
            if m == "PATCH" and n == 2:
                self._auth(jeton, "agent")
                rep = court(c.get("reponse"), 800)
                if not rep:
                    raise Erreur(422, "Réponse attendue.")
                x = self.s.modifier("questions", p[1], reponse=rep)
                if not x:
                    raise Erreur(404, "Question introuvable.")
                return {k: v for k, v in x.items() if k != "code"}
        # ---- visites des agents (une saisie envoyée deux fois n'est enregistrée qu'une fois)
        if p[:1] == ["visites"]:
            if m == "POST" and n == 1:
                u = self._auth(jeton, "agent")
                return self._enregistrer_visite(c, u[0])
            if m == "GET" and n == 1:
                self._auth(jeton, "agent", "district")
                return {"visites": self.s.d["visites"][:200]}
        # ---- références : une orientation suivie jusqu'à la prise en charge
        if p[:1] == ["references"]:
            if m == "GET" and n == 1:
                u = self._auth(jeton, "agent", "district", "centre")
                liste = [self._vue_reference(r) for r in self.s.d["references"] if u[1] != "centre" or r["centreId"] == u[2]]
                return {"references": liste}
            if m == "POST" and n == 1:
                self._auth(jeton, "agent")
                return self._reference_manuelle(c)
            if m == "PATCH" and n == 2:
                u = self._auth(jeton, "agent", "centre")
                r = self.s.trouver("references", p[1])
                if not r or (u[1] == "centre" and r["centreId"] != u[2]):
                    raise Erreur(404, "Référence introuvable.")
                etat = c.get("etat")
                if u[1] == "centre" and etat not in ("recue", "arrivee", "prise"):
                    raise Erreur(422, "État attendu : recue, arrivee ou prise.")
                if u[1] == "agent" and etat not in ("suivie", "relance"):
                    raise Erreur(422, "État attendu : suivie ou relance.")
                if etat == "relance":
                    with self.s.verrou:
                        r["historique"].append({"etat": "relance", "heure": maintenant()})
                        self.s.sauver()
                    return self._vue_reference(r)
                if etat == "suivie" and r["etat"] != "prise":
                    raise Erreur(422, "Le suivi à la maison vient après la prise en charge.")
                self._avancer_reference(r, etat)
                return self._vue_reference(r)
        # ---- jardins d'enfants, écoles et crèches
        if p[:1] == ["structures"]:
            if m == "GET" and n == 1:
                self._auth(jeton, "agent", "district")
                return {"structures": [self._vue_structure(k) for k in STRUCTURES]}
            if m == "GET" and p[1:] == ["moi"]:
                u = self._auth(jeton, "ecole")
                return self._vue_structure(u[2], detail=True)
            if m == "POST" and p[1:] == ["moi", "presence"]:
                u = self._auth(jeton, "ecole")
                return self._noter_presence(u[2], c)
            if m == "POST" and p[1:] == ["moi", "signalement"]:
                u = self._auth(jeton, "ecole")
                return self._signaler(u[2], c)
        # ---- tableau d'un centre ou de l'hôpital
        if m == "GET" and p == ["centre", "moi"]:
            u = self._auth(jeton, "centre")
            return self._vue_centre(u[2])
        # ---- villages et district
        if m == "GET" and p == ["villages"]:
            self._auth(jeton, "agent", "district")
            return {"villages": self._villages()}
        if m == "GET" and p == ["district"]:
            self._auth(jeton, "district", "agent")
            return self._district()
        # ---- appels vocaux : le service va chercher la famille
        if p[:1] == ["appels"]:
            if m == "GET" and n == 1:
                self._auth(jeton, "agent", "district")
                return {"appels": [self._vue_appel(a) for a in self.s.d["appels"]]}
            if m == "POST" and n == 1:
                self._auth(jeton, "agent")
                fam = court(c.get("famille"), 12).upper()
                if not RE_CODE_FAMILLE.match(fam) or c.get("sujet") not in SUJETS_APPEL or c.get("village") not in VILLAGES:
                    raise Erreur(422, "Code famille (FAM-XXXX), sujet et village attendus. Aucun numéro ni nom n'est gardé.")
                return self._vue_appel(self.s.ajouter("appels", {"id": uuid.uuid4().hex[:10], "famille": fam, "village": c["village"], "sujet": c["sujet"],
                                                                 "langue": VILLAGES[c["village"]][3], "etat": "en-attente", "tentatives": 0, "heure": maintenant()}))
            if m == "POST" and n == 3 and p[2] == "tenter":
                self._auth(jeton, "agent")
                a = self.s.trouver("appels", p[1])
                if not a:
                    raise Erreur(404, "Appel introuvable.")
                if a["etat"] != "en-attente":
                    raise Erreur(422, "Cet appel est déjà traité.")
                joint = bool(c.get("reponse"))
                with self.s.verrou:
                    a["tentatives"] += 1
                    a["etat"] = "joint" if joint else ("a-visiter" if a["tentatives"] >= TENTATIVES_MAX else "en-attente")
                    self.s.sauver()
                return self._vue_appel(a)
        raise Erreur(404, "Introuvable.")

    # ---------------------------------------------------------------- références, villages, appels, visites
    def _vue_reference(self, r):
        debut = datetime.fromisoformat(r["historique"][0]["heure"])
        fin = datetime.fromisoformat(next((h["heure"] for h in r["historique"] if h["etat"] in FINALES), maintenant()))
        age = max(0.0, (fin - debut).total_seconds() / 3600)
        v = dict(r)
        v["ageH"] = round(age, 1)
        v["retard"] = r["etat"] not in FINALES and age > DELAI_RETARD_H
        v["priseEnMin"] = round(age * 60) if r["etat"] in FINALES else None
        return v

    def _avancer_reference(self, r, etat):
        """Une référence ne recule jamais. Garde aussi l'alerte liée dans le même état."""
        if etat not in ETATS_REF or ETATS_REF.index(etat) <= ETATS_REF.index(r["etat"]):
            return r
        with self.s.verrou:
            r["etat"] = etat
            r["historique"].append({"etat": etat, "heure": maintenant()})
            self.s.sauver()
        if r.get("alerteId") and etat in ETAT_REF_VERS_ALERTE:
            self.s.modifier("alertes", r["alerteId"], etat=ETAT_REF_VERS_ALERTE[etat])
        return r

    def _existant(self, nom, id_client):
        return next((x for x in self.s.d[nom] if id_client and x.get("idClient") == id_client), None)

    def _nouvelle_reference(self, village, cas, niveau, centre_id, origine, signes, id_client="", alerte_id=""):
        r = {"id": uuid.uuid4().hex[:10], "village": village, "cas": cas, "niveau": niveau, "centreId": centre_id, "origine": origine,
             "etat": "envoyee", "heure": maintenant(), "historique": [{"etat": "envoyee", "heure": maintenant()}], "alerteId": alerte_id, "idClient": id_client}
        return self.s.ajouter("references", r)

    def _reference_manuelle(self, c):
        idc = court(c.get("idClient"), 64)
        if not RE_ID_CLIENT.match(idc):
            raise Erreur(422, "Identifiant d'envoi attendu (8 à 64 caractères).")
        deja = self._existant("references", idc)
        if deja:
            return {"doublon": True, "reference": self._vue_reference(deja)}
        cas, vil = c.get("cas"), c.get("village")
        if cas not in CAS or vil not in VILLAGES:
            raise Erreur(422, "Type de cas et village attendus.")
        signes = [x for x in (c.get("signes") or []) if isinstance(x, str)] if isinstance(c.get("signes"), list) else []
        o = orienter(cas, signes, vil)
        niveau = o["niveau"] if o["niveau"] in ("urgent", "surveiller") else "surveiller"
        centre = o["centre"] or centre_pour(vil, 1)
        a = self.s.ajouter("alertes", {"id": uuid.uuid4().hex[:10], "centreId": centre["id"], "cas": cas, "niveau": niveau, "signes": o["signes"], "depuis": vil,
                                       "heure": maintenant(), "etat": "en-route", "idClient": idc + "-a"})
        r = self._nouvelle_reference(vil, cas, niveau, centre["id"], "agent", o["signes"], idc, a["id"])
        return {"doublon": False, "reference": self._vue_reference(r), "alerte": a}

    def _enregistrer_visite(self, c, agent):
        idc = court(c.get("idClient"), 64)
        if not RE_ID_CLIENT.match(idc):
            raise Erreur(422, "Identifiant d'envoi attendu (8 à 64 caractères).")
        deja = self._existant("visites", idc)
        if deja:
            return {"doublon": True, "visite": deja}
        cas, vil = c.get("cas"), c.get("village")
        if cas not in CAS or vil not in VILLAGES:
            raise Erreur(422, "Type de cas et village attendus.")
        code = court(c.get("code"), 12).upper()
        if code and not RE_CODE_ENFANT.match(code):
            raise Erreur(422, "Code enfant invalide (lettres, chiffres, tiret). Aucun nom n'est accepté.")
        valides = {x[0] for x in SIGNES[cas]}
        signes = sorted({x for x in (c.get("signes") or []) if x in valides}) if isinstance(c.get("signes"), list) else []
        v = self.s.ajouter("visites", {"id": uuid.uuid4().hex[:10], "idClient": idc, "village": vil, "cas": cas, "code": code, "signes": signes, "agent": agent, "heure": maintenant()})
        res = {"doublon": False, "visite": v}
        if signes:
            o = orienter(cas, signes, vil)
            res["orientation"] = {"niveau": o["niveau"], "titre": o["titre"], "centre": o["centre"]}
            if o["niveau"] in ("urgent", "surveiller") and o["centre"]:
                a = self.s.ajouter("alertes", {"id": uuid.uuid4().hex[:10], "centreId": o["centre"]["id"], "cas": cas, "niveau": o["niveau"], "signes": o["signes"],
                                               "depuis": vil, "heure": maintenant(), "etat": "en-route", "idClient": idc + "-a"})
                r = self._nouvelle_reference(vil, cas, o["niveau"], o["centre"]["id"], "visite", o["signes"], idc, a["id"])
                res["alerte"] = a
                res["reference"] = self._vue_reference(r)
        return res

    def _vue_structure(self, sid, detail=False):
        nom, village, type_, inscrits, vaccines, repas = STRUCTURES[sid]
        pres = {x["jour"]: x["presents"] for x in self.s.d["presences"] if x["structure"] == sid}
        auj = datetime.now(timezone.utc).date()
        sem = [{"jour": (auj - timedelta(days=i)).isoformat()} for i in range(6, -1, -1)]
        for j in sem:
            j["presents"] = pres.get(j["jour"])
        connus = [j["presents"] for j in sem if j["presents"] is not None]
        taux = round(100 * sum(connus) / (len(connus) * inscrits)) if connus and inscrits else None
        signal = [r for r in self.s.d["references"] if r.get("structure") == sid]
        v = {"id": sid, "nom": nom, "village": village, "type": type_, "inscrits": inscrits, "vaccinesAJour": vaccines, "vaccinesPct": round(100 * vaccines / inscrits),
             "repas": repas, "presenceAujourdhui": pres.get(auj.isoformat()), "presenceMoyennePct": taux,
             "signalements": len(signal), "signalementsPris": len([r for r in signal if r["etat"] in FINALES])}
        if detail:
            v["semaine"] = sem
            v["motifs"] = [{"id": k, "libelle": x} for k, x in MOTIFS_SIGNALEMENT.items()]
            v["suivi"] = [self._vue_reference(r) for r in signal][:20]
        return v

    def _noter_presence(self, sid, c):
        try:
            n = int(c.get("presents"))
        except (TypeError, ValueError):
            raise Erreur(422, "Nombre d’enfants présents attendu.")
        if not 0 <= n <= STRUCTURES[sid][3]:
            raise Erreur(422, f"Entre 0 et {STRUCTURES[sid][3]} enfants.")
        jour = datetime.now(timezone.utc).date().isoformat()
        ex = next((x for x in self.s.d["presences"] if x["structure"] == sid and x["jour"] == jour), None)
        if ex:
            with self.s.verrou:
                ex["presents"] = n
                self.s.sauver()
        else:
            self.s.ajouter("presences", {"id": uuid.uuid4().hex[:10], "structure": sid, "jour": jour, "presents": n})
        return self._vue_structure(sid, detail=True)

    def _signaler(self, sid, c):
        """Une école ou une crèche signale un enfant par son code (jamais son nom) : le centre le plus proche reçoit une référence."""
        motif = c.get("motif")
        if motif not in MOTIFS_SIGNALEMENT:
            raise Erreur(422, "Motif attendu.")
        code = court(c.get("code"), 12).upper()
        if not RE_CODE_ENFANT.match(code):
            raise Erreur(422, "Code enfant attendu (lettres, chiffres, tiret). Aucun nom n’est accepté.")
        idc = court(c.get("idClient"), 64)
        if not RE_ID_CLIENT.match(idc):
            raise Erreur(422, "Identifiant d'envoi attendu (8 à 64 caractères).")
        deja = self._existant("references", idc)
        if deja:
            return {"doublon": True, "reference": self._vue_reference(deja)}
        village = STRUCTURES[sid][1]
        urgent = motif in ("maigre", "fievre")
        centre = centre_pour(village, 2 if urgent else 1)
        a = self.s.ajouter("alertes", {"id": uuid.uuid4().hex[:10], "centreId": centre["id"], "cas": "enfant", "niveau": "urgent" if urgent else "surveiller",
                                       "signes": [MOTIFS_SIGNALEMENT[motif]], "depuis": village, "heure": maintenant(), "etat": "en-route", "idClient": idc + "-a"})
        r = self._nouvelle_reference(village, "enfant", a["niveau"], centre["id"], "ecole", [], idc, a["id"])
        r["structure"] = sid
        with self.s.verrou:
            self.s.sauver()
        return {"doublon": False, "reference": self._vue_reference(r), "centre": centre["nom"]}

    def _vue_centre(self, cid):
        nom, village, niveau, services = CENTRES[cid]
        refs = [self._vue_reference(r) for r in self.s.d["references"] if r["centreId"] == cid]
        delais = sorted(r["priseEnMin"] for r in refs if r["priseEnMin"] is not None)
        origine = {}
        for r in refs:
            origine[r["village"]] = origine.get(r["village"], 0) + 1
        return {"id": cid, "nom": nom, "niveau": niveau, "services": services, "hopital": niveau >= 3,
                "attendus": len([r for r in refs if r["etat"] in ("envoyee", "recue")]),
                "urgentsEnRoute": len([r for r in refs if r["etat"] in ("envoyee", "recue") and r["niveau"] == "urgent"]),
                "surPlace": len([r for r in refs if r["etat"] == "arrivee"]),
                "prises": len([r for r in refs if r["etat"] in FINALES]),
                "enRetard": len([r for r in refs if r["retard"]]),
                "delaiMedianMin": delais[len(delais) // 2] if delais else None,
                "tendance": self._tendance([r for r in self.s.d["references"] if r["centreId"] == cid]),
                "provenance": sorted(({"village": k, "total": v} for k, v in origine.items()), key=lambda x: -x["total"]),
                "parOrigine": {o: len([r for r in refs if r["origine"] == o]) for o in ("alerte", "visite", "agent", "ecole")}}

    def _vue_appel(self, a):
        v = dict(a)
        v["libelle"] = SUJETS_APPEL.get(a["sujet"], a["sujet"])
        v["restantes"] = max(0, TENTATIVES_MAX - a["tentatives"]) if a["etat"] == "en-attente" else 0
        return v

    def _villages(self):
        refs = [self._vue_reference(r) for r in self.s.d["references"]]
        out = []
        for vid, (nom, _x, _y, langue) in VILLAGES.items():
            inscrits, vus = SUIVI_BASE.get(vid, (0, 0))
            vus += len({v["code"] or v["id"] for v in self.s.d["visites"] if v["village"] == vid})
            vus = min(vus, inscrits)
            mes = [r for r in refs if r["village"] == vid]
            ouvertes = [r for r in mes if r["etat"] not in FINALES]
            retard = [r for r in ouvertes if r["retard"]]
            appels = [a for a in self.s.d["appels"] if a["village"] == vid and a["etat"] == "a-visiter"]
            cov = round(100 * vus / inscrits) if inscrits else 0
            if cov < 40 or retard or appels:
                prio, raison = "prioritaire", ("Références en retard" if retard else "Familles injoignables" if appels else "Moins de 40 % des enfants vus")
            elif cov < 60:
                prio, raison = "renforcer", "Couverture à renforcer"
            else:
                prio, raison = "bonne", "En bonne voie"
            centre = centre_pour(vid, 1)
            out.append({"id": vid, "nom": nom, "langue": langue, "enfants": inscrits, "vus": vus, "sansVisite": max(0, inscrits - vus), "couverture": cov,
                        "referencesOuvertes": len(ouvertes), "referencesEnRetard": len(retard), "famillesAVisiter": len(appels),
                        "priorite": prio, "raison": raison, "centre": centre["nom"] if centre else ""})
        ordre = {"prioritaire": 0, "renforcer": 1, "bonne": 2}
        return sorted(out, key=lambda v: (ordre[v["priorite"]], v["couverture"]))

    def _district(self):
        villages = self._villages()
        refs = [self._vue_reference(r) for r in self.s.d["references"]]
        prises = [r for r in refs if r["etat"] in FINALES]
        delais = sorted(r["priseEnMin"] for r in prises if r["priseEnMin"] is not None)
        median = delais[len(delais) // 2] if delais else None
        enfants = sum(v["enfants"] for v in villages)
        vus = sum(v["vus"] for v in villages)
        return {
            "enfants": enfants, "vus": vus, "couverture": round(100 * vus / enfants) if enfants else 0,
            "references": {"total": len(refs), "envoyees": len([r for r in refs if r["etat"] == "envoyee"]), "recues": len([r for r in refs if r["etat"] == "recue"]),
                           "arrivees": len([r for r in refs if r["etat"] == "arrivee"]), "prises": len(prises), "enRetard": len([r for r in refs if r["retard"]]),
                           "taux": round(100 * len(prises) / len(refs)) if refs else 0, "delaiMedianMin": median},
            "appels": {"enAttente": len([a for a in self.s.d["appels"] if a["etat"] == "en-attente"]), "joints": len([a for a in self.s.d["appels"] if a["etat"] == "joint"]),
                       "aVisiter": len([a for a in self.s.d["appels"] if a["etat"] == "a-visiter"])},
            "prioritaires": [v["nom"] for v in villages if v["priorite"] == "prioritaire"],
            "villages": villages,
            "tendance": self._tendance(refs),
            "parCas": [{"cas": k, "libelle": LIBELLE_CAS[k], "total": len([r for r in refs if r["cas"] == k])} for k in CAS],
            "parCentre": self._par_centre(refs),
            "structures": [self._vue_structure(k) for k in STRUCTURES],
        }

    def _tendance(self, refs):
        """Sept derniers jours : références envoyées et prises en charge, par jour (UTC)."""
        auj = datetime.now(timezone.utc).date()
        jours = [auj - timedelta(days=i) for i in range(6, -1, -1)]
        def compte(evenements):
            n = {j: 0 for j in jours}
            for e in evenements:
                d = datetime.fromisoformat(e).date()
                if d in n:
                    n[d] += 1
            return n
        env = compte(r["historique"][0]["heure"] for r in refs)
        pri = compte(h["heure"] for r in refs for h in r["historique"] if h["etat"] == "prise")
        return [{"jour": j.isoformat(), "envoyees": env[j], "prises": pri[j]} for j in jours]

    def _par_centre(self, refs):
        out = []
        for cid, c in CENTRES.items():
            mes = [r for r in refs if r["centreId"] == cid]
            delais = sorted(r["priseEnMin"] for r in mes if r["priseEnMin"] is not None)
            out.append({"id": cid, "nom": c[0], "total": len(mes), "prises": len([r for r in mes if r["etat"] in FINALES]),
                        "delaiMedianMin": delais[len(delais) // 2] if delais else None})
        return out

    def _orienter(self, c):
        cas, village = c.get("cas"), c.get("village")
        if cas not in CAS or village not in VILLAGES:
            raise Erreur(422, "Type de cas et village attendus.")
        texte = court(c.get("texte"), 400)
        signes = [s for s in (c.get("signes") or []) if isinstance(s, str)] if isinstance(c.get("signes"), list) else []
        reperes = signes_depuis_texte(cas, texte) if texte else []
        res = orienter(cas, sorted(set(signes) | set(reperes)), village)
        res["reperes"] = reperes
        if texte and self.repondre and self.corpus is not None:
            r = self.repondre(texte, self.corpus)
            res["assistant"] = {"niveau": r.get("niveau"), "reponse": r.get("reponse"), "limite": r.get("limite"), "confiance": r.get("confiance")}
        return res

    def _creer_alerte(self, c):
        idc = court(c.get("idClient"), 64)
        if idc and not RE_ID_CLIENT.match(idc):
            idc = ""
        deja = self._existant("alertes", idc)
        if deja:
            return {**deja, "doublon": True}
        cid, cas, vil = c.get("centreId"), c.get("cas"), c.get("depuis")
        if cid not in CENTRES or cas not in CAS or vil not in VILLAGES or c.get("niveau") not in ("urgent", "surveiller"):
            raise Erreur(422, "Centre, cas, niveau et village attendus.")
        signes = [court(s, 80) for s in c.get("signes", [])[:8]] if isinstance(c.get("signes"), list) else []
        a = self.s.ajouter("alertes", {"id": uuid.uuid4().hex[:10], "centreId": cid, "cas": cas, "niveau": c["niveau"], "signes": signes, "depuis": vil, "heure": maintenant(), "etat": "en-route", "idClient": idc})
        self._nouvelle_reference(vil, cas, c["niveau"], cid, "alerte", signes, "", a["id"])
        return a
