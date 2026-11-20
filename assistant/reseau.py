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
from datetime import datetime, timezone
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
}

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
    return os.environ.get("FILDOR_MDP_DEMO", "FilDor2026!demo")


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
    def __init__(self, chemin=None):
        self.chemin = Path(chemin) if chemin else None
        self.verrou = threading.Lock()
        self.d = {"alertes": [], "demandes": [], "produits": [], "controles": [], "questions": []}
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
        self.s = stock or Stock(os.environ.get("FILDOR_DONNEES", "/tmp/fildor-reseau.json"))
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
                return self.s.modifier("alertes", p[1], etat=c["etat"])
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
        raise Erreur(404, "Introuvable.")

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
        cid, cas, vil = c.get("centreId"), c.get("cas"), c.get("depuis")
        if cid not in CENTRES or cas not in CAS or vil not in VILLAGES or c.get("niveau") not in ("urgent", "surveiller"):
            raise Erreur(422, "Centre, cas, niveau et village attendus.")
        signes = [court(s, 80) for s in c.get("signes", [])[:8]] if isinstance(c.get("signes"), list) else []
        return self.s.ajouter("alertes", {"id": uuid.uuid4().hex[:10], "centreId": cid, "cas": cas, "niveau": c["niveau"], "signes": signes, "depuis": vil, "heure": maintenant(), "etat": "en-route"})
