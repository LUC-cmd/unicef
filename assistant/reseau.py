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
    "national.togo": ("national", "", "Responsable national (démonstration)"),
    "ecole.agbele": ("ecole", "e1", "Jardin d’enfants d’Agbélé (fictif)"),
    "ecole.davie": ("ecole", "e2", "École maternelle de Davié (fictive)"),
    "ecole.zogbedji": ("ecole", "e3", "Crèche communautaire de Zogbédji (fictive)"),
}

# Structures d'accueil des 0-5 ans (FICTIVES) : id -> (nom, village, type, enfants inscrits, enfants vaccinés à jour, repas servis par jour)
# Routes entre villages (FICTIVES) : (village A, village B, revêtement). Longueur = distance entre les villages.
ROUTES = [("agbele", "kpadape", "goudron"), ("kpadape", "zogbedji", "piste"), ("agbele", "zogbedji", "piste"), ("zogbedji", "davie", "goudron"), ("kpadape", "davie", "piste"), ("davie", "tovegan", "piste")]
MODES = {"moto": "Moto", "voiture": "Voiture ou ambulance", "pied": "À pied"}
VITESSES = {"moto": {"goudron": 45, "piste": 30}, "voiture": {"goudron": 60, "piste": 25}, "pied": {"goudron": 5, "piste": 5}}
OBSTACLES = {  # type -> (libellé, effet par mode : None = bloqué, sinon coefficient de temps)
    "inondation": ("Route inondée", {"moto": 2.0, "voiture": None, "pied": 1.4}),
    "pont": ("Pont coupé", {"moto": None, "voiture": None, "pied": 3.0}),
    "arbre": ("Arbre tombé", {"moto": 1.2, "voiture": None, "pied": 1.0}),
    "travaux": ("Travaux", {"moto": 1.3, "voiture": 1.6, "pied": 1.0}),
    "boue": ("Piste boueuse", {"moto": 1.8, "voiture": 2.5, "pied": 1.3}),
    "marche": ("Jour de marché, route encombrée", {"moto": 1.3, "voiture": 1.6, "pied": 1.0}),
}
TYPES_ETABLISSEMENT = {"creche": "Crèche (0 à 3 ans)", "jardin": "Jardin d’enfants (3 à 5 ans)", "ecole": "École maternelle (4 à 5 ans)", "centre": "Centre de santé", "hopital": "Hôpital"}
ROLES_CREABLES = {"district": ("agent", "centre", "ecole"), "national": ("district", "agent", "centre", "ecole")}
# Règles de démonstration de la campagne porte-à-porte : (libellé, âge minimum en mois, âge maximum, intervalle en jours ; None = une seule fois). À valider avec le ministère de la Santé.
SOINS_CAMPAGNE = {"vitamineA": ("Vitamine A", 6, 59, 180), "deparasitage": ("Déparasitage", 12, 59, 180), "rougeole": ("Vaccin rougeole (rappel)", 9, 59, None)}
REGIONS = [("maritime", "Maritime"), ("plateaux", "Plateaux"), ("centrale", "Centrale"), ("kara", "Kara"), ("savanes", "Savanes")]
DOMAINES_NAT = {"vaccination": "Vaccination des enfants", "nutrition": "Nutrition des enfants", "sante": "Santé de la mère et de l’enfant",
                "eveil": "Éveil et préscolaire", "filles": "Jeunes filles : usage des services"}
ALPHABET_ACTIVATION = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

STRUCTURES = {
    "e1": ("Jardin d’enfants d’Agbélé (fictif)", "agbele", "Jardin d’enfants (3 à 5 ans)", 38, 31, 38),
    "e2": ("École maternelle de Davié (fictive)", "davie", "École maternelle (4 à 5 ans)", 54, 36, 0),
    "e3": ("Crèche communautaire de Zogbédji (fictive)", "zogbedji", "Crèche (0 à 3 ans)", 22, 20, 22),
}
DOMAINES = {"langage": "Langage et communication", "motricite": "Motricité et coordination", "social": "Vie sociale et émotions", "cognition": "Découverte et apprentissage"}
NIVEAUX_EVEIL = {1: "À stimuler", 2: "En progrès", 3: "Acquis", 4: "Très à l’aise"}
ACTIVITES = {
    "langage": "Chanter et nommer les objets ensemble, lire des images, laisser l’enfant raconter sa journée.",
    "motricite": "Jeux de balle, marcher sur une ligne, enfiler des perles, pâte à modeler.",
    "social": "Jeux à deux, attendre son tour, nommer ses émotions, câlins et routines régulières.",
    "cognition": "Trier par couleur ou taille, compter des cailloux, puzzles simples, questions « pourquoi ? ».",
}
MOTIFS_SIGNALEMENT = {"developpement": "Retard de développement à évaluer", "absent": "Absent depuis plus de 3 jours", "maigre": "Semble très maigre (mesure du bras à faire)", "fievre": "Fièvre ou toux persistante",
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


_DYN = {}  # comptes créés par le district ou le national et activés : identifiant -> (rôle, rattachement, nom)


def _hash_mdp(mdp, sel):
    return hashlib.pbkdf2_hmac("sha256", mdp.encode(), bytes.fromhex(sel), 120_000).hex()


def lire_jeton(jeton):
    """Retourne (identifiant, rôle, rattachement, nom) ou None."""
    try:
        corps, sig = (jeton or "").split(".", 1)
        attendu = hmac.new(_secret().encode(), corps.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, attendu):
            return None
        donnees = json.loads(base64.urlsafe_b64decode(corps + "=" * (-len(corps) % 4)))
        u = donnees["u"]
        if donnees["exp"] < time.time() or (u not in COMPTES and u not in _DYN):
            return None
        role, ref, nom = COMPTES[u] if u in COMPTES else _DYN[u]
        return u, role, ref, nom
    except (ValueError, KeyError, TypeError):
        return None


# ---------------------------------------------------------------- stockage
VILLAGES_BASE, CENTRES_BASE, ROUTES_BASE, STRUCTURES_BASE, SUIVI_ORIG = dict(VILLAGES), dict(CENTRES), list(ROUTES), dict(STRUCTURES), dict(SUIVI_BASE)


class Stock:
    def __init__(self, chemin=None, graine=False):
        self.chemin = Path(chemin) if chemin else None
        self.verrou = threading.Lock()
        self.d = {"alertes": [], "demandes": [], "produits": [], "controles": [], "questions": [], "references": [], "visites": [], "appels": [], "presences": [], "observations": [], "obstacles": [], "etablissements": [], "comptes": [], "villages": [], "foyers": []}
        if self.chemin and self.chemin.exists():
            try:
                lu = json.loads(self.chemin.read_text(encoding="utf-8"))
                for k in self.d:
                    if isinstance(lu.get(k), list):
                        self.d[k] = lu[k]
            except (OSError, ValueError):
                pass
        premiere = not self.d["produits"]
        if premiere:
            self.d["produits"] = _produits_depart()
        if graine:
            for k, v in _demo_depart().items():
                if k == "produits":
                    if premiere:
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
    donnees["observations"] = _demo_observations()
    donnees["foyers"] = _demo_foyers()
    donnees["obstacles"] = [
        {"id": uuid.uuid4().hex[:10], "de": "zogbedji", "vers": "davie", "type": "inondation", "note": "Le pont bas est sous l’eau depuis la pluie de cette nuit.", "heure": avant(5), "actif": True, "par": "agent.nutrition"},
        {"id": uuid.uuid4().hex[:10], "de": "kpadape", "vers": "zogbedji", "type": "boue", "note": "Piste glissante après le marigot.", "heure": avant(20), "actif": True, "par": "centre.kpadape"},
    ]
    donnees["presences"] = []
    auj = datetime.now(timezone.utc).date()
    for sid, st in STRUCTURES_BASE.items():
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


def _demo_foyers():
    """Foyers de la campagne porte-à-porte (FICTIFS). Un QR collé sur la maison, des codes d'enfants, aucun nom."""
    out = []
    plan = [("agbele", "AG", [(14, ["vitamineA"]), (30, ["vitamineA", "deparasitage"])]), ("agbele", "AG", [(8, [])]),
            ("kpadape", "KP", [(20, ["vitamineA"]), (40, []), (3, [])]), ("zogbedji", "ZO", [(26, ["vitamineA", "deparasitage"])]),
            ("davie", "DA", [(18, []), (50, ["vitamineA"])]), ("tovegan", "TO", [(12, [])])]
    n = 0
    for i, (vil, pref, enfants) in enumerate(plan, 1):
        f = {"code": f"FOY-{1000 + i * 37:04d}", "village": vil, "heure": avant(24 * 9), "enfants": [], "soins": []}
        for j, (age, faits) in enumerate(enfants, 1):
            n += 1
            code = f"{pref}-{n:04d}"
            f["enfants"].append({"code": code, "ageMois": age})
            for t in faits:
                f["soins"].append({"enfant": code, "soin": t, "heure": avant(24 * 8), "par": "agent.nutrition", "idClient": f"seed{n}{t}"[:20].ljust(8, "x")})
        out.append(f)
    return out


def _demo_observations():
    """Observations d'éveil FICTIVES sur 6 mois : un petit progrès général, quelques enfants à stimuler. Codes anonymes."""
    import random
    rnd = random.Random(7)
    out = []
    auj = datetime.now(timezone.utc).date()
    for sid, st in STRUCTURES_BASE.items():
        pref = {"e1": "AG", "e2": "DA", "e3": "ZO"}[sid]
        for n in range(1, 9):
            base = {d: rnd.choice((1, 2, 2, 3)) for d in DOMAINES}
            for m in range(5, -1, -1):
                jour = (auj.replace(day=15) - timedelta(days=30 * m)).isoformat()
                notes = {d: min(4, max(1, base[d] + (1 if (m < 3 and rnd.random() < 0.45) else 0))) for d in DOMAINES}
                out.append({"id": uuid.uuid4().hex[:10], "structure": sid, "code": f"{pref}-{n:04d}", "ageMois": 30 + n * 3, "jour": jour, "notes": notes, "idClient": ""})
    return out


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
        self._appliquer_dynamique()

    def _appliquer_dynamique(self):
        """Remet les données de base puis y ajoute ce que le district a créé : villages, centres, écoles, comptes activés."""
        VILLAGES.clear(); VILLAGES.update(VILLAGES_BASE)
        CENTRES.clear(); CENTRES.update(CENTRES_BASE)
        STRUCTURES.clear(); STRUCTURES.update(STRUCTURES_BASE)
        ROUTES[:] = ROUTES_BASE
        SUIVI_BASE.clear(); SUIVI_BASE.update(SUIVI_ORIG)
        _DYN.clear()
        for v in self.s.d["villages"]:
            self._village_en_memoire(v)
        for e in self.s.d["etablissements"]:
            self._etablissement_en_memoire(e)
        for c in self.s.d["comptes"]:
            if c.get("actif") and c.get("hash"):
                _DYN[c["identifiant"]] = (c["role"], c["ref"], c["nom"])

    @staticmethod
    def _village_en_memoire(v):
        VILLAGES[v["id"]] = (v["nom"], v["x"], v["y"], v["langue"])
        SUIVI_BASE[v["id"]] = (v.get("enfants", 0), 0)
        for r in v.get("relie", []):
            if r in VILLAGES:
                ROUTES.append((r, v["id"], "piste"))

    @staticmethod
    def _etablissement_en_memoire(e):
        if e["type"] in ("centre", "hopital"):
            CENTRES[e["id"]] = (e["nom"], e["village"], 3 if e["type"] == "hopital" else 2,
                                "Césarienne, urgences, réanimation du nouveau-né" if e["type"] == "hopital" else "Consultations, vaccination, accouchement simple")
        else:
            STRUCTURES[e["id"]] = (e["nom"], e["village"], TYPES_ETABLISSEMENT[e["type"]], max(1, e.get("capacite") or 1), None, 0)

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
            dyn = next((x for x in self.s.d["comptes"] if x["identifiant"] == ident), None)
            if ident in COMPTES:
                bon = hmac.compare_digest(str(c.get("mdp", "")).encode(), mot_de_passe_demo().encode())
            elif dyn and dyn.get("actif") and dyn.get("hash"):
                bon = hmac.compare_digest(_hash_mdp(str(c.get("mdp", "")), dyn["sel"]), dyn["hash"])
            else:
                bon = False
            if not bon:
                raise Erreur(401, "Identifiant ou mot de passe incorrect, ou compte pas encore activé.")
            role, ref, nom = COMPTES[ident] if ident in COMPTES else _DYN[ident]
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
            if m == "POST" and p[1:] == ["moi", "observation"]:
                u = self._auth(jeton, "ecole")
                return self._observer(u[2], c)
            if m == "POST" and p[1:] == ["moi", "signalement"]:
                u = self._auth(jeton, "ecole")
                return self._signaler(u[2], c)
        # ---- gouvernance : qui crée quoi, et les accès
        if m == "POST" and p == ["activer"]:
            return self._activer(c)
        if p[:1] == ["comptes"]:
            u = self._auth(jeton, "district", "national")
            if m == "GET" and n == 1:
                return {"comptes": [self._vue_compte(x) for x in self.s.d["comptes"]], "creables": list(ROLES_CREABLES[u[1]])}
            if m == "POST" and n == 1:
                return self._creer_compte(c, u)
            if m == "POST" and n == 3 and p[2] == "code":
                x = self._compte(p[1])
                code = self._nouveau_code(x)
                return {"compte": self._vue_compte(x), "codeActivation": code}
            if m == "PATCH" and n == 2:
                x = self._compte(p[1])
                with self.s.verrou:
                    x["actif"] = bool(c.get("actif"))
                    self.s.sauver()
                self._appliquer_dynamique()
                return self._vue_compte(x)
        if m == "POST" and p == ["villages"]:
            u = self._auth(jeton, "district", "national")
            return self._creer_village(c)
        if m == "GET" and p == ["manques"]:
            self._auth(jeton, "district", "national", "agent")
            return {"manques": self._manques()}
        if m == "GET" and p == ["national"]:
            self._auth(jeton, "national")
            return self._national()
        # ---- campagne porte-à-porte : un QR collé sur la maison
        if p[:1] == ["foyers"]:
            if m == "GET" and n == 1:
                self._auth(jeton, "agent", "district")
                return {"foyers": [self._vue_foyer(f, court=True) for f in self.s.d["foyers"]], "soins": {k: v[0] for k, v in SOINS_CAMPAGNE.items()}}
            if m == "POST" and n == 1:
                u = self._auth(jeton, "agent")
                return self._creer_foyer(c)
            if m == "GET" and n == 2:
                self._auth(jeton, "agent", "district")
                return self._vue_foyer(self._foyer(p[1]))
            if m == "POST" and n == 3 and p[2] == "soins":
                u = self._auth(jeton, "agent")
                return self._donner_soin(self._foyer(p[1]), c, u[0])
        # ---- carte, itinéraires, obstacles : ouverts à tous (une famille en a besoin), la saisie est réservée aux professionnels
        if m == "GET" and p == ["lieux"]:
            return {"lieux": self._lieux(), "routes": self._routes_carte()}
        if m == "POST" and p == ["itineraire"]:
            return self._itineraire(c)
        if p[:1] == ["obstacles"]:
            if m == "GET" and n == 1:
                return {"obstacles": [self._vue_obstacle(o) for o in self.s.d["obstacles"] if o["actif"]]}
            if m == "POST" and n == 1:
                u = self._auth(jeton, "agent", "centre", "district")
                return self._signaler_obstacle(c, u[0])
            if m == "PATCH" and n == 2:
                self._auth(jeton, "agent", "centre", "district")
                o = self.s.trouver("obstacles", p[1])
                if not o:
                    raise Erreur(404, "Obstacle introuvable.")
                with self.s.verrou:
                    o["actif"] = False
                    self.s.sauver()
                return self._vue_obstacle(o)
        if m == "POST" and p == ["etablissements"]:
            u = self._auth(jeton, "district", "national")
            nom, village, type_ = court(c.get("nom"), 80), c.get("village"), c.get("type")
            if len(nom) < 3 or village not in VILLAGES or type_ not in TYPES_ETABLISSEMENT:
                raise Erreur(422, "Nom, village et type attendus.")
            try:
                capacite = max(0, min(500, int(c.get("capacite") or 0)))
            except (TypeError, ValueError):
                capacite = 0
            e = self.s.ajouter("etablissements", {"id": "x" + uuid.uuid4().hex[:8], "nom": nom, "village": village, "type": type_, "capacite": capacite, "cree": u[0], "heure": maintenant()})
            self._etablissement_en_memoire(e)
            return self._vue_lieu_etab(e)
        if m == "GET" and p == ["notifications"]:
            u = self._auth(jeton)
            return {"notifications": self._notifications(u)}
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
        v = {"id": sid, "nom": nom, "village": village, "type": type_, "inscrits": inscrits, "vaccinesAJour": vaccines, "vaccinesPct": None if vaccines is None else round(100 * vaccines / inscrits),
             "repas": repas, "presenceAujourdhui": pres.get(auj.isoformat()), "presenceMoyennePct": taux,
             "signalements": len(signal), "signalementsPris": len([r for r in signal if r["etat"] in FINALES])}
        ev = self._eveil(sid)
        v["eveilIndice"], v["eveilAStimuler"] = ev["indice"], len(ev["aStimuler"])
        if detail:
            v["eveil"] = ev
            v["semaine"] = sem
            v["motifs"] = [{"id": k, "libelle": x} for k, x in MOTIFS_SIGNALEMENT.items()]
            v["suivi"] = [self._vue_reference(r) for r in signal][:20]
        return v

    def _notifications(self, u):
        """Ce qui demande l'attention du rôle connecté, calculé sur les données réelles du service."""
        ident, role, ref = u[0], u[1], u[2]
        refs = [self._vue_reference(r) for r in self.s.d["references"]]
        out = []
        def ajoute(niveau, texte, to):
            out.append({"niveau": niveau, "texte": texte, "to": to})
        if role == "centre":
            mes = [r for r in refs if r["centreId"] == ref]
            urg = [r for r in mes if r["etat"] in ("envoyee", "recue") and r["niveau"] == "urgent"]
            if urg:
                ajoute("urgent", f"{len(urg)} urgence(s) en route vers votre centre", "/reseau/references")
            att = [r for r in mes if r["etat"] == "arrivee"]
            if att:
                ajoute("info", f"{len(att)} cas sur place à prendre en charge", "/reseau/references")
            ret = [r for r in mes if r["retard"]]
            if ret:
                ajoute("urgent", f"{len(ret)} référence(s) en retard de plus de 24 h", "/reseau/references")
        elif role == "agent":
            ret = [r for r in refs if r["retard"]]
            if ret:
                ajoute("urgent", f"{len(ret)} référence(s) en retard : relancer le centre", "/reseau/references")
            av = [a for a in self.s.d["appels"] if a["etat"] == "a-visiter"]
            if av:
                ajoute("urgent", f"{len(av)} famille(s) injoignable(s) : visite à domicile", "/reseau/appels")
            ec = [r for r in refs if r["origine"] == "ecole" and r["etat"] not in FINALES]
            if ec:
                ajoute("info", f"{len(ec)} enfant(s) signalé(s) par une école ou une crèche", "/reseau/references")
        elif role == "district":
            pri = [v for v in self._villages() if v["priorite"] == "prioritaire"]
            if pri:
                ajoute("urgent", f"{len(pri)} village(s) prioritaire(s) : {', '.join(v['nom'] for v in pri)}", "/reseau/villages")
            ret = [r for r in refs if r["retard"]]
            if ret:
                ajoute("urgent", f"{len(ret)} référence(s) en retard dans le district", "/reseau/references")
            for k in STRUCTURES:
                e = self._vue_structure(k)
                if e["eveilAStimuler"]:
                    ajoute("info", f"{e['eveilAStimuler']} enfant(s) à stimuler : {e['nom'].replace(' (fictif)', '').replace(' (fictive)', '')}", "/reseau/structures")
        elif role == "ecole":
            v = self._vue_structure(ref)
            if v["vaccinesPct"] is not None and v["vaccinesPct"] < 80:
                ajoute("info", f"Vaccins à jour : {v['vaccinesPct']} %, sous l’objectif de 80 %", "/reseau")
            if v["eveilAStimuler"]:
                ajoute("info", f"{v['eveilAStimuler']} enfant(s) à stimuler : voir les activités conseillées", "/reseau")
            pris = [r for r in refs if r.get("structure") == ref and r["etat"] in FINALES]
            if pris:
                ajoute("info", f"{len(pris)} enfant(s) signalé(s) pris en charge par un centre", "/reseau")
        return out

    def _eveil(self, sid):
        """Synthèse d'éveil d'un établissement : moyenne par domaine, évolution sur 6 mois, enfants à stimuler."""
        obs = [o for o in self.s.d["observations"] if o["structure"] == sid]
        if not obs:
            return {"observes": 0, "indice": None, "domaines": [], "evolution": [], "aStimuler": []}
        derniere = {}
        for o in sorted(obs, key=lambda o: o["jour"]):
            derniere[o["code"]] = o
        dom = [{"id": d, "libelle": lib, "pct": round(100 * sum(o["notes"][d] for o in derniere.values()) / (4 * len(derniere))), "activite": ACTIVITES[d]} for d, lib in DOMAINES.items()]
        mois = {}
        for o in obs:
            mois.setdefault(o["jour"][:7], []).append(sum(o["notes"].values()) / (4 * len(o["notes"])))
        evo = [{"mois": k, "pct": round(100 * sum(v) / len(v))} for k, v in sorted(mois.items())][-6:]
        stim = sorted({o["code"]: [DOMAINES[d] for d, n in o["notes"].items() if n <= 1] for o in derniere.values() if any(n <= 1 for n in o["notes"].values())}.items())
        return {"observes": len(derniere), "indice": round(sum(x["pct"] for x in dom) / len(dom)), "domaines": dom, "evolution": evo,
                "aStimuler": [{"code": k, "domaines": v} for k, v in stim]}

    def _observer(self, sid, c):
        idc = court(c.get("idClient"), 64)
        if not RE_ID_CLIENT.match(idc):
            raise Erreur(422, "Identifiant d'envoi attendu (8 à 64 caractères).")
        deja = self._existant("observations", idc)
        if deja:
            return {"doublon": True, "eveil": self._eveil(sid)}
        code = court(c.get("code"), 12).upper()
        if not RE_CODE_ENFANT.match(code):
            raise Erreur(422, "Code enfant attendu (lettres, chiffres, tiret). Aucun nom n’est accepté.")
        notes = {}
        for d in DOMAINES:
            try:
                n = int(c.get(d))
            except (TypeError, ValueError):
                raise Erreur(422, "Une note de 1 à 4 est attendue pour chaque domaine.")
            if not 1 <= n <= 4:
                raise Erreur(422, "Une note de 1 à 4 est attendue pour chaque domaine.")
            notes[d] = n
        try:
            age = int(c.get("ageMois"))
        except (TypeError, ValueError):
            age = 0
        age = min(71, max(0, age))
        self.s.ajouter("observations", {"id": uuid.uuid4().hex[:10], "structure": sid, "code": code, "ageMois": age, "jour": datetime.now(timezone.utc).date().isoformat(), "notes": notes, "idClient": idc})
        faibles = [DOMAINES[d] for d, n in notes.items() if n <= 1]
        res = {"doublon": False, "aStimuler": faibles, "conseils": [ACTIVITES[d] for d, n in notes.items() if n <= 1], "eveil": self._eveil(sid)}
        if len(faibles) >= 2:
            res["signalement"] = self._signaler(sid, {"code": code, "motif": "developpement", "idClient": idc + "-s"})
        return res

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

    # ---- carte et itinéraires
    def _vue_obstacle(self, o):
        v = dict(o)
        v["libelle"] = OBSTACLES[o["type"]][0]
        return v

    def _vue_lieu_etab(self, e):
        return {"id": e["id"], "nom": e["nom"], "village": e["village"], "type": e["type"], "libelle": TYPES_ETABLISSEMENT[e["type"]], "capacite": e["capacite"], "cree": True}

    def _lieux(self):
        out = []
        for k, c in CENTRES.items():
            out.append({"id": k, "nom": c[0], "village": c[1], "type": "hopital" if c[2] >= 3 else "centre", "libelle": "Hôpital" if c[2] >= 3 else "Centre de santé", "services": c[3]})
        for k, st in STRUCTURES.items():
            t = "creche" if "Crèche" in st[2] else "jardin" if "Jardin" in st[2] else "ecole"
            out.append({"id": k, "nom": st[0], "village": st[1], "type": t, "libelle": st[2]})
        for e in self.s.d["etablissements"]:
            if e["type"] not in ("centre", "hopital"):
                out.append(self._vue_lieu_etab(e))
        for k, pt in POINTS.items():
            out.append({"id": k, "nom": pt[0], "village": pt[1], "type": "boutique" if "Boutique" in pt[2] else "nutrition", "libelle": pt[2]})
        for v in out:
            v["x"], v["y"] = VILLAGES[v["village"]][1], VILLAGES[v["village"]][2]
        return out

    def _routes_carte(self):
        actifs = [o for o in self.s.d["obstacles"] if o["actif"]]
        res = []
        for a, b, surf in ROUTES:
            obs = [self._vue_obstacle(o) for o in actifs if {o["de"], o["vers"]} == {a, b}]
            res.append({"de": a, "vers": b, "surface": surf, "km": distance_km(a, b), "obstacles": obs})
        villages = {k: {"nom": v[0], "x": v[1], "y": v[2]} for k, v in VILLAGES.items()}
        return {"segments": res, "villages": villages}

    def _signaler_obstacle(self, c, auteur):
        a, b, t = c.get("de"), c.get("vers"), c.get("type")
        if t not in OBSTACLES or not any({a, b} == {r[0], r[1]} for r in ROUTES):
            raise Erreur(422, "Type d’obstacle et tronçon de route attendus.")
        o = self.s.ajouter("obstacles", {"id": uuid.uuid4().hex[:10], "de": a, "vers": b, "type": t, "note": court(c.get("note"), 140), "heure": maintenant(), "actif": True, "par": auteur})
        return self._vue_obstacle(o)

    def _itineraire(self, c):
        """Le meilleur chemin par mode de transport, en tenant compte des obstacles signalés. Destination : un lieu (centre, crèche, école…) ou un village."""
        de = c.get("de")
        vers = c.get("vers")
        lieux = {x["id"]: x for x in self._lieux()}
        arrivee = lieux[vers]["village"] if vers in lieux else vers
        if de not in VILLAGES or arrivee not in VILLAGES:
            raise Erreur(422, "Village de départ et destination attendus.")
        actifs = [o for o in self.s.d["obstacles"] if o["actif"]]
        res = []
        for mode in MODES:
            def cout(a, b, surf):
                km = distance_km(a, b)
                t = 60 * km / VITESSES[mode][surf]
                bloque, raisons = False, []
                for o in actifs:
                    if {o["de"], o["vers"]} == {a, b}:
                        coef = OBSTACLES[o["type"]][1][mode]
                        raisons.append(o)
                        if coef is None:
                            bloque = True
                        else:
                            t *= coef
                return (None if bloque else t), km, raisons
            dist = {de: (0.0, 0.0, [de], [])}
            fait = set()
            while True:
                cand = [(d[0], k) for k, d in dist.items() if k not in fait]
                if not cand:
                    break
                _t, u = min(cand)
                fait.add(u)
                for a, b, surf in ROUTES:
                    if u not in (a, b):
                        continue
                    v = b if u == a else a
                    t, km, obs = cout(u, v, surf)
                    if t is None or v in fait:
                        continue
                    nt = dist[u][0] + t
                    if v not in dist or nt < dist[v][0]:
                        dist[v] = (nt, dist[u][1] + km, dist[u][2] + [v], dist[u][3] + [{"de": u, "vers": v, "surface": surf, "obstacles": [self._vue_obstacle(o) for o in obs]}])
            if arrivee in dist:
                t, km, etapes, segs = dist[arrivee]
                res.append({"mode": mode, "libelle": MODES[mode], "possible": True, "minutes": round(t), "km": round(km, 1), "etapes": etapes, "segments": segs,
                            "obstacles": [o for s_ in segs for o in s_["obstacles"]]})
            else:
                res.append({"mode": mode, "libelle": MODES[mode], "possible": False, "minutes": None, "km": None, "etapes": [], "segments": [], "obstacles": []})
        possibles = [r for r in res if r["possible"] and r["mode"] != "pied"] or [r for r in res if r["possible"]]
        reco = min(possibles, key=lambda r: r["minutes"])["mode"] if possibles else None
        conseil = "Aucun chemin n’est ouvert pour le moment : prévenir le district." if reco is None else (
            f"Meilleur choix : {MODES[reco].lower()}, environ {min(possibles, key=lambda r: r['minutes'])['minutes']} min." +
            (" La voiture est bloquée par un obstacle : prendre la moto." if reco == "moto" and not next(r for r in res if r["mode"] == "voiture")["possible"] else ""))
        return {"de": de, "vers": vers, "destination": lieux.get(vers), "modes": res, "recommande": reco, "conseil": conseil}

    # ---- gouvernance : comptes, villages
    @staticmethod
    def _slug(t):
        return re.sub(r"[^a-z0-9]+", "-", plier(t)).strip("-")[:24] or "x"

    def _compte(self, ident):
        x = next((c for c in self.s.d["comptes"] if c["identifiant"] == ident), None)
        if not x:
            raise Erreur(404, "Compte introuvable.")
        return x

    def _vue_compte(self, x):
        etat = "suspendu" if (x.get("hash") and not x.get("actif")) else "actif" if x.get("hash") else "a-activer"
        return {"identifiant": x["identifiant"], "role": x["role"], "ref": x["ref"], "nom": x["nom"], "etat": etat, "cree": x["cree"], "heure": x["heure"],
                "expire": x.get("expire") if etat == "a-activer" else None}

    def _nouveau_code(self, x):
        code = "".join(secrets.choice(ALPHABET_ACTIVATION) for _ in range(8))
        with self.s.verrou:
            x["sel"] = secrets.token_hex(16)
            x["code"] = _hash_mdp(code, x["sel"])
            x["essais"] = 0
            x["expire"] = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(timespec="seconds")
            self.s.sauver()
        return code

    def _creer_compte(self, c, u):
        role, nom = c.get("role"), court(c.get("nom"), 80)
        if role not in ROLES_CREABLES[u[1]]:
            raise Erreur(403, "Vous ne pouvez pas créer ce type de compte.")
        if len(nom) < 3:
            raise Erreur(422, "Un nom (3 lettres au moins) est attendu.")
        ref = court(c.get("ref"), 20)
        if role == "centre" and ref not in CENTRES:
            raise Erreur(422, "Choisissez le centre ou l’hôpital de ce compte.")
        if role == "ecole" and ref not in STRUCTURES:
            raise Erreur(422, "Choisissez l’établissement de ce compte.")
        if role == "agent" and ref and ref not in VILLAGES:
            raise Erreur(422, "Village de rattachement inconnu.")
        base = f"{role}.{self._slug(nom)}"
        ident, i = base, 1
        pris = set(COMPTES) | {x["identifiant"] for x in self.s.d["comptes"]}
        while ident in pris:
            i += 1
            ident = f"{base}{i}"
        x = {"identifiant": ident, "role": role, "ref": ref, "nom": nom, "cree": u[0], "heure": maintenant(), "actif": False, "hash": "", "sel": "", "code": "", "essais": 0, "expire": ""}
        x = self.s.ajouter("comptes", x)
        code = self._nouveau_code(x)
        return {"compte": self._vue_compte(x), "codeActivation": code}

    def _activer(self, c):
        ident, code, mdp = court(c.get("identifiant"), 60).lower(), court(c.get("code"), 12).upper().replace(" ", ""), str(c.get("mdp") or "")
        x = next((y for y in self.s.d["comptes"] if y["identifiant"] == ident), None)
        if not x or not x.get("code") or x.get("hash"):
            raise Erreur(422, "Code d’activation invalide ou déjà utilisé.")
        if x["essais"] >= 5 or x["expire"] < maintenant():
            raise Erreur(422, "Ce code n’est plus valable. Demandez-en un nouveau à votre responsable.")
        if not hmac.compare_digest(_hash_mdp(code, x["sel"]), x["code"]):
            with self.s.verrou:
                x["essais"] += 1
                self.s.sauver()
            raise Erreur(422, "Code d’activation invalide ou déjà utilisé.")
        if len(mdp) < 8:
            raise Erreur(422, "Choisissez un mot de passe de 8 caractères au moins.")
        with self.s.verrou:
            x["sel"] = secrets.token_hex(16)
            x["hash"] = _hash_mdp(mdp, x["sel"])
            x["code"] = ""
            x["actif"] = True
            self.s.sauver()
        self._appliquer_dynamique()
        return {"ok": True, "identifiant": ident, "role": x["role"]}

    def _creer_village(self, c):
        nom, langue = court(c.get("nom"), 40), c.get("langue") or "Autre"
        try:
            x, y, enfants = float(c.get("x")), float(c.get("y")), max(0, min(5000, int(c.get("enfants") or 0)))
        except (TypeError, ValueError):
            raise Erreur(422, "Position (x, y en km) attendue.")
        relie = [r for r in (c.get("relie") or []) if r in VILLAGES] if isinstance(c.get("relie"), list) else []
        if len(nom) < 3 or not -200 <= x <= 300 or not -200 <= y <= 300 or not relie:
            raise Erreur(422, "Nom, position et au moins un village voisin relié par une route sont attendus.")
        vid = self._slug(nom)
        if vid in VILLAGES:
            raise Erreur(422, "Ce village existe déjà.")
        v = self.s.ajouter("villages", {"id": vid, "nom": nom, "x": x, "y": y, "langue": langue if langue in ("Éwé", "Kabiyè", "Mina") else "Autre", "enfants": enfants, "relie": relie[:3], "heure": maintenant()})
        self._village_en_memoire(v)
        return {"id": vid, "nom": nom}

    def _manques(self):
        """Pour chaque village : ce qui manque à proximité (centre de santé, hôpital, crèche ou jardin d'enfants). Distances à vol d'oiseau, en km."""
        out = []
        for vid, (nom, _x, _y, _l) in VILLAGES.items():
            enfants = SUIVI_BASE.get(vid, (0, 0))[0]
            dc = sorted((distance_km(vid, c[1]), k) for k, c in CENTRES.items())
            dh = sorted((distance_km(vid, c[1]), k) for k, c in CENTRES.items() if c[2] >= 3)
            de = sorted((distance_km(vid, e[1]), k) for k, e in STRUCTURES.items())
            dans = [k for k, e in STRUCTURES.items() if e[1] == vid]
            flags = []
            if dc and dc[0][0] > 10:
                flags.append({"code": "centre", "gravite": "haute" if dc[0][0] > 20 else "moyenne", "texte": f"Aucun centre de santé à moins de 10 km (le plus proche : {dc[0][0]} km)", "conseil": f"Ouvrir un centre de santé ou une antenne à {nom}."})
            if dh and dh[0][0] > 30:
                flags.append({"code": "hopital", "gravite": "haute", "texte": f"Hôpital à {dh[0][0]} km : un transfert urgent est long", "conseil": "Prévoir un moyen de transport d’urgence (moto-ambulance) et un point de relais."})
            if not dans and (not de or de[0][0] > 8):
                flags.append({"code": "prescolaire", "gravite": "haute" if (not de or de[0][0] > 15) else "moyenne",
                              "texte": "Aucune crèche ni jardin d’enfants" + (f" à moins de 8 km (le plus proche : {de[0][0]} km)" if de else ""), "conseil": f"Créer un jardin d’enfants ou une crèche communautaire à {nom}."})
            out.append({"id": vid, "nom": nom, "enfants": enfants, "plusProcheCentre": dc[0][0] if dc else None, "plusProcheHopital": dh[0][0] if dh else None,
                        "plusProchePrescolaire": 0 if dans else (de[0][0] if de else None), "manques": flags})
        return sorted(out, key=lambda v: (-sum(2 if f["gravite"] == "haute" else 1 for f in v["manques"]), -v["enfants"]))

    def _national(self):
        """Tableau national : une série par région et par domaine sur 6 mois. Données FICTIVES, sauf les valeurs du mois courant du district de démonstration (Plateaux), calculées en direct."""
        import random
        auj = datetime.now(timezone.utc).date().replace(day=1)
        mois = []
        for i in range(5, -1, -1):
            y, m = auj.year, auj.month - i
            while m <= 0:
                m += 12; y -= 1
            mois.append(f"{y}-{m:02d}")
        dist = self._district()
        ev = [self._vue_structure(k)["eveilIndice"] for k in STRUCTURES]
        ev = [e for e in ev if e is not None]
        direct = {"vaccination": dist["couverture"], "eveil": round(sum(ev) / len(ev)) if ev else None}
        regions = []
        for rid, rnom in REGIONS:
            rnd = random.Random(f"fildor-{rid}")
            vals = {}
            for d in DOMAINES_NAT:
                debut = rnd.randint(38, 72)
                pente = rnd.choice((-1.6, -0.8, 0.5, 1.1, 1.8, 2.4))
                serie = [max(5, min(98, round(debut + pente * i + rnd.uniform(-1.5, 1.5)))) for i in range(6)]
                reel = False
                if rid == "plateaux" and direct.get(d) is not None:
                    ecart = direct[d] - serie[-1]
                    serie = [max(5, min(98, round(v + ecart * i / 5))) for i, v in enumerate(serie)]
                    serie[-1], reel = direct[d], True
                var = serie[-1] - serie[-4]
                vals[d] = {"serie": serie, "dernier": serie[-1], "variation": var, "tendance": "hausse" if var >= 2 else "baisse" if var <= -2 else "stable", "reel": reel}
            alertes = [DOMAINES_NAT[d] for d, v in vals.items() if v["tendance"] == "baisse"]
            regions.append({"id": rid, "nom": rnom, "valeurs": vals, "alertes": alertes})
        pays = {d: [round(sum(r["valeurs"][d]["serie"][i] for r in regions) / len(regions)) for i in range(6)] for d in DOMAINES_NAT}
        return {"mois": mois, "domaines": [{"id": k, "libelle": v} for k, v in DOMAINES_NAT.items()], "regions": regions, "pays": {"nom": "Togo", "series": pays},
                "avertissement": "Données fictives de démonstration, sauf la région Plateaux (mois courant) calculée sur le district de démonstration."}

    # ---- campagne porte-à-porte
    def _foyer(self, code):
        f = next((x for x in self.s.d["foyers"] if x["code"] == court(code, 12).upper()), None)
        if not f:
            raise Erreur(404, "Foyer introuvable : vérifiez le QR collé sur la maison.")
        return f

    def _statut_soin(self, f, enfant, soin):
        lib, amin, amax, jours = SOINS_CAMPAGNE[soin]
        faits = sorted((x["heure"] for x in f["soins"] if x["enfant"] == enfant["code"] and x["soin"] == soin), reverse=True)
        if faits:
            recent = jours is None or (datetime.now(timezone.utc) - datetime.fromisoformat(faits[0])).days < jours
            if recent:
                return {"soin": soin, "libelle": lib, "statut": "fait", "date": faits[0][:10]}
        if enfant["ageMois"] < amin or enfant["ageMois"] > amax:
            return {"soin": soin, "libelle": lib, "statut": "non-concerne", "date": faits[0][:10] if faits else ""}
        return {"soin": soin, "libelle": lib, "statut": "a-faire", "date": faits[0][:10] if faits else ""}

    def _vue_foyer(self, f, court=False):
        enfants = [{"code": e["code"], "ageMois": e["ageMois"], "soins": [self._statut_soin(f, e, k) for k in SOINS_CAMPAGNE]} for e in f["enfants"]]
        a_faire = sum(1 for e in enfants for x in e["soins"] if x["statut"] == "a-faire")
        faits = sum(1 for e in enfants for x in e["soins"] if x["statut"] == "fait")
        v = {"code": f["code"], "village": f["village"], "qr": "FILDOR-FOYER:" + f["code"], "nbEnfants": len(enfants), "aFaire": a_faire, "faits": faits}
        if not court:
            v["enfants"] = enfants
        return v

    def _creer_foyer(self, c):
        idc = court(c.get("idClient"), 64)
        if not RE_ID_CLIENT.match(idc):
            raise Erreur(422, "Identifiant d'envoi attendu (8 à 64 caractères).")
        deja = next((x for x in self.s.d["foyers"] if x.get("idClient") == idc), None)
        if deja:
            return {"doublon": True, **self._vue_foyer(deja)}
        vil = c.get("village")
        liste = c.get("enfants")
        if vil not in VILLAGES or not isinstance(liste, list) or not 1 <= len(liste) <= 12:
            raise Erreur(422, "Village et de 1 à 12 enfants (âge en mois) attendus.")
        pref = self._slug(vil)[:2].upper()
        n = sum(len(x["enfants"]) for x in self.s.d["foyers"])
        enfants = []
        for e in liste:
            try:
                age = int(e.get("ageMois"))
            except (TypeError, ValueError, AttributeError):
                raise Erreur(422, "Âge en mois attendu pour chaque enfant.")
            if not 0 <= age <= 71:
                raise Erreur(422, "Âge entre 0 et 71 mois.")
            n += 1
            enfants.append({"code": f"{pref}-{n:04d}", "ageMois": age})
        nb = len(self.s.d["foyers"]) + 1
        code = f"FOY-{1000 + nb * 37:04d}"
        while any(x["code"] == code for x in self.s.d["foyers"]):
            nb += 1
            code = f"FOY-{1000 + nb * 37:04d}"
        f = self.s.ajouter("foyers", {"code": code, "village": vil, "heure": maintenant(), "enfants": enfants, "soins": [], "idClient": idc})
        return {"doublon": False, **self._vue_foyer(f)}

    def _donner_soin(self, f, c, agent):
        idc = court(c.get("idClient"), 64)
        if not RE_ID_CLIENT.match(idc):
            raise Erreur(422, "Identifiant d'envoi attendu (8 à 64 caractères).")
        if any(x.get("idClient") == idc for x in f["soins"]):
            return {"doublon": True, "deja": False, **self._vue_foyer(f)}
        enfant = next((e for e in f["enfants"] if e["code"] == court(c.get("enfant"), 12).upper()), None)
        soin = c.get("soin")
        if not enfant or soin not in SOINS_CAMPAGNE:
            raise Erreur(422, "Enfant et soin attendus.")
        st = self._statut_soin(f, enfant, soin)
        if st["statut"] == "fait":
            return {"doublon": False, "deja": True, "date": st["date"], "message": f"{st['libelle']} déjà donné le {st['date']} : rien à refaire.", **self._vue_foyer(f)}
        if st["statut"] == "non-concerne":
            raise Erreur(422, f"{st['libelle']} : cet enfant n’est pas concerné à son âge ({enfant['ageMois']} mois).")
        with self.s.verrou:
            f["soins"].append({"enfant": enfant["code"], "soin": soin, "heure": maintenant(), "par": agent, "idClient": idc})
            self.s.sauver()
        return {"doublon": False, "deja": False, "message": f"{st['libelle']} enregistré.", **self._vue_foyer(f)}

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
