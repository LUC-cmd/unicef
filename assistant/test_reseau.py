import os
import tempfile
import unittest

os.environ["FILDOR_MDP_DEMO"] = "motdepasse-test"
from repondre import charger, repondre
from reseau import Reseau, Stock, signes_depuis_texte, orienter, lire_jeton

CORPUS = charger()


def neuf():
    return Reseau(stock=Stock(None), repondre=repondre, corpus=CORPUS)


def connecter(r, ident):
    code, o = r.traiter("POST", "connexion", {"identifiant": ident, "mdp": "motdepasse-test"})
    assert code == 200, o
    return o["jeton"]


class OrientationTest(unittest.TestCase):
    def test_urgence_obstetricale_vers_hopital(self):
        o = orienter("grossesse", ["saigne"], "agbele")
        self.assertEqual(o["niveau"], "urgent")
        self.assertEqual(o["centre"]["niveau"], 3)

    def test_signe_simple_centre_proche(self):
        self.assertEqual(orienter("enfant", ["toux"], "agbele")["centre"]["id"], "c1")

    def test_mots_cles(self):
        self.assertEqual(signes_depuis_texte("grossesse", "Elle saigne et a de la FIÈVRE"), ["saigne", "fievre"])

    def test_pas_de_faux_positif(self):
        # « eau » ne doit pas être trouvé dans « beaucoup »
        self.assertEqual(signes_depuis_texte("grossesse", "Elle saigne beaucoup depuis ce matin"), ["saigne"])
        self.assertEqual(signes_depuis_texte("grossesse", "elle perd de l'eau"), ["liquide"])

    def test_assistant_relie(self):
        code, o = neuf().traiter("POST", "orienter", {"cas": "enfant", "village": "agbele", "texte": "Il a des convulsions et il est très faible"})
        self.assertEqual(code, 200)
        self.assertEqual(o["niveau"], "urgent")
        self.assertEqual(o["assistant"]["niveau"], "URGENCE")
        self.assertIn("convulse4", o["reperes"])

    def test_entree_invalide(self):
        self.assertEqual(neuf().traiter("POST", "orienter", {"cas": "x", "village": "agbele"})[0], 422)


class ComptesTest(unittest.TestCase):
    def test_mot_de_passe_vide_refuse(self):
        ancien = os.environ["FILDOR_MDP_DEMO"]
        os.environ["FILDOR_MDP_DEMO"] = ""
        try:
            self.assertEqual(neuf().traiter("POST", "connexion", {"identifiant": "centre.davie", "mdp": ""})[0], 401)
        finally:
            os.environ["FILDOR_MDP_DEMO"] = ancien

    def test_connexion(self):
        r = neuf()
        self.assertEqual(r.traiter("POST", "connexion", {"identifiant": "centre.davie", "mdp": "faux"})[0], 401)
        self.assertEqual(r.traiter("POST", "connexion", {"identifiant": "inconnu", "mdp": "motdepasse-test"})[0], 401)
        self.assertEqual(lire_jeton(connecter(r, "centre.davie"))[1], "centre")

    def test_jeton_falsifie(self):
        j = connecter(neuf(), "centre.davie")
        self.assertIsNone(lire_jeton(j[:-2] + "00"))
        self.assertIsNone(lire_jeton("n.importe"))


class AlertesTest(unittest.TestCase):
    def test_alerte_vue_seulement_par_son_centre(self):
        r = neuf()
        a = r.traiter("POST", "alertes", {"centreId": "c4", "cas": "grossesse", "niveau": "urgent", "signes": ["Elle saigne"], "depuis": "agbele"})
        self.assertEqual(a[0], 200)
        self.assertEqual(r.traiter("GET", "alertes")[0], 401)
        self.assertEqual(len(r.traiter("GET", "alertes", jeton=connecter(r, "centre.davie"))[1]["alertes"]), 1)
        self.assertEqual(len(r.traiter("GET", "alertes", jeton=connecter(r, "centre.kpadape"))[1]["alertes"]), 0)
        ident = a[1]["id"]
        self.assertEqual(r.traiter("PATCH", f"alertes/{ident}", {"etat": "arrive"}, connecter(r, "centre.kpadape"))[0], 404)
        self.assertEqual(r.traiter("PATCH", f"alertes/{ident}", {"etat": "arrive"}, connecter(r, "centre.davie"))[1]["etat"], "arrive")

    def test_alerte_invalide(self):
        self.assertEqual(neuf().traiter("POST", "alertes", {"centreId": "zz", "cas": "enfant", "niveau": "urgent", "depuis": "agbele"})[0], 422)


class BoutiquesTest(unittest.TestCase):
    def test_produit_propose_puis_valide(self):
        r = neuf()
        b = connecter(r, "boutique.agbele")
        code, p = r.traiter("POST", "produits", {"nom": "Huile de palme", "pour": "petit", "prix": "700 FCFA"}, b)
        self.assertEqual((code, p["etat"]), (200, "attente"))
        public = [x["nom"] for x in r.traiter("GET", "produits")[1]["produits"]]
        self.assertNotIn("Huile de palme", public)
        self.assertEqual(r.traiter("PATCH", f"produits/{p['id']}", {"etat": "valide"}, b)[0], 403)
        agent = connecter(r, "agent.nutrition")
        self.assertEqual(r.traiter("PATCH", f"produits/{p['id']}", {"etat": "valide"}, agent)[1]["etat"], "valide")
        public = [x["nom"] for x in r.traiter("GET", "produits")[1]["produits"]]
        self.assertIn("Huile de palme", public)

    def test_boutique_ne_voit_que_les_siens(self):
        r = neuf()
        noms = {x["pointId"] for x in r.traiter("GET", "produits", jeton=connecter(r, "boutique.agbele"))[1]["produits"]}
        self.assertEqual(noms, {"n2"})

    def test_demande_et_controle(self):
        r = neuf()
        self.assertEqual(r.traiter("POST", "demandes", {"pointId": "n2", "pour": "grossesse", "village": "agbele"})[0], 200)
        self.assertEqual(len(r.traiter("GET", "demandes", jeton=connecter(r, "boutique.agbele"))[1]["demandes"]), 1)
        self.assertEqual(len(r.traiter("GET", "demandes", jeton=connecter(r, "boutique.zogbedji"))[1]["demandes"]), 0)
        agent = connecter(r, "agent.nutrition")
        c = r.traiter("POST", "controles", {"pointId": "n2", "ok": ["prix", "hygiene", "bidon"]}, agent)[1]
        self.assertEqual((c["n"], c["conforme"]), (2, False))
        self.assertEqual(r.traiter("POST", "controles", {"pointId": "n1", "ok": []}, agent)[0], 422)


class QuestionsTest(unittest.TestCase):
    def test_question_anonyme(self):
        r = neuf()
        code = r.traiter("POST", "questions", {"texte": "Mes règles sont douloureuses"})[1]["code"]
        self.assertEqual(len(code), 8)
        self.assertEqual(r.traiter("GET", f"questions/{code}")[1]["reponse"], "")
        self.assertEqual(r.traiter("GET", "questions")[0], 401)
        agent = connecter(r, "agent.nutrition")
        lst = r.traiter("GET", "questions", jeton=agent)[1]["questions"]
        self.assertNotIn("code", lst[0])
        r.traiter("PATCH", f"questions/{lst[0]['id']}", {"reponse": "Viens au centre."}, agent)
        self.assertEqual(r.traiter("GET", f"questions/{code.lower()}")[1]["reponse"], "Viens au centre.")
        self.assertEqual(r.traiter("GET", "questions/ZZZZZZZZ")[0], 404)


    def test_code_choisi_hors_ligne(self):
        r = neuf()
        self.assertEqual(r.traiter("POST", "questions", {"texte": "Bonjour", "code": "abcd2345"})[1]["code"], "ABCD2345")
        # code déjà pris ou invalide : le serveur en attribue un autre
        self.assertNotEqual(r.traiter("POST", "questions", {"texte": "Autre", "code": "ABCD2345"})[1]["code"], "ABCD2345")
        self.assertEqual(len(r.traiter("POST", "questions", {"texte": "Autre", "code": "0O1I"})[1]["code"]), 8)


class StockTest(unittest.TestCase):
    def test_persistance(self):
        with tempfile.TemporaryDirectory() as d:
            chemin = os.path.join(d, "r.json")
            r = Reseau(stock=Stock(chemin), repondre=repondre, corpus=CORPUS)
            r.traiter("POST", "demandes", {"pointId": "n2", "pour": "petit", "village": "agbele"})
            r2 = Reseau(stock=Stock(chemin), repondre=repondre, corpus=CORPUS)
            self.assertEqual(len(r2.s.d["demandes"]), 1)


if __name__ == "__main__":
    unittest.main()


def test_graine_demo_remplit_les_tableaux():
    s = Stock(None, graine=True)
    assert len(s.d["alertes"]) >= 3 and len(s.d["demandes"]) >= 3 and len(s.d["controles"]) >= 2 and len(s.d["questions"]) >= 2
    etats = {x["etat"] for x in s.d["produits"]}
    assert {"attente", "valide", "refuse"} <= etats
    assert not Stock(None).d["alertes"]  # sans graine, rien n'est ajouté


class SuiviTest(unittest.TestCase):
    def setUp(self):
        self.r = neuf()
        self.ag = connecter(self.r, "agent.nutrition")
        self.di = connecter(self.r, "district.togo")
        self.c1 = connecter(self.r, "centre.agbele")

    def test_visite_idempotente_et_alerte(self):
        corps = {"idClient": "visite-0001-abcd", "village": "agbele", "cas": "enfant", "code": "AG-0042", "signes": ["convulse4"]}
        code, a = self.r.traiter("POST", "visites", corps, self.ag)
        self.assertEqual(code, 200)
        self.assertFalse(a["doublon"])
        self.assertIn("alerte", a)
        n_alertes = len(self.r.s.d["alertes"])
        code, b = self.r.traiter("POST", "visites", corps, self.ag)
        self.assertTrue(b["doublon"])
        self.assertEqual(len(self.r.s.d["alertes"]), n_alertes)

    def test_visite_refuse_un_nom(self):
        code, _ = self.r.traiter("POST", "visites", {"idClient": "visite-0002-abcd", "village": "agbele", "cas": "enfant", "code": "Kofi Mensah"}, self.ag)
        self.assertEqual(code, 422)

    def test_alerte_idclient_sans_doublon(self):
        corps = {"idClient": "alerte-0001-abcd", "centreId": "c1", "cas": "enfant", "niveau": "urgent", "signes": ["toux"], "depuis": "agbele"}
        self.r.traiter("POST", "alertes", corps)
        n = len(self.r.s.d["alertes"])
        _, b = self.r.traiter("POST", "alertes", corps)
        self.assertTrue(b["doublon"])
        self.assertEqual(len(self.r.s.d["alertes"]), n)

    def test_reference_suit_l_alerte(self):
        _, o = self.r.traiter("POST", "visites", {"idClient": "visite-0003-abcd", "village": "davie", "cas": "grossesse", "signes": ["saigne"]}, self.ag)
        ref, al = o["reference"], o["alerte"]
        cid = al["centreId"]
        ident = {"c1": "centre.agbele", "c2": "centre.kpadape", "c3": "centre.zogbedji", "c4": "centre.davie"}[cid]
        jc = connecter(self.r, ident)
        self.assertEqual(self.r.traiter("PATCH", f"alertes/{al['id']}", {"etat": "arrive"}, jc)[0], 200)
        self.assertEqual(self.r.traiter("PATCH", f"alertes/{al['id']}", {"etat": "pris"}, jc)[0], 200)
        _, liste = self.r.traiter("GET", "references", None, self.ag)
        x = next(r for r in liste["references"] if r["id"] == ref["id"])
        self.assertEqual(x["etat"], "prise")
        self.assertEqual([h["etat"] for h in x["historique"]], ["envoyee", "arrivee", "prise"])

    def test_reference_ne_recule_pas(self):
        _, o = self.r.traiter("POST", "references", {"idClient": "ref-000001-abcd", "village": "tovegan", "cas": "enfant", "signes": ["toux"]}, self.ag)
        rid = o["reference"]["id"]
        code, _ = self.r.traiter("PATCH", f"references/{rid}", {"etat": "suivie"}, self.ag)
        self.assertEqual(code, 422)  # pas encore prise en charge

    def test_villages_et_district(self):
        _, v = self.r.traiter("GET", "villages", None, self.di)
        self.assertEqual(len(v["villages"]), 5)
        self.assertEqual(v["villages"][0]["priorite"], "prioritaire")
        _, d = self.r.traiter("GET", "district", None, self.di)
        self.assertEqual(d["enfants"], sum(x["enfants"] for x in v["villages"]))
        self.assertGreater(d["references"]["total"], 0)

    def test_appels_trois_tentatives_puis_visite(self):
        _, a = self.r.traiter("POST", "appels", {"famille": "fam-9abc", "sujet": "vaccination", "village": "kpadape"}, self.ag)
        self.assertEqual(a["etat"], "en-attente")
        for _ in range(3):
            _, a = self.r.traiter("POST", f"appels/{a['id']}/tenter", {"reponse": False}, self.ag)
        self.assertEqual(a["etat"], "a-visiter")

    def test_droits(self):
        self.assertEqual(self.r.traiter("GET", "district", None)[0], 401)
        self.assertEqual(self.r.traiter("GET", "district", None, self.c1)[0], 403)


class GraphiquesTest(unittest.TestCase):
    def test_district_series(self):
        r = neuf()
        _, d = r.traiter("GET", "district", None, connecter(r, "district.togo"))
        self.assertEqual(len(d["tendance"]), 7)
        self.assertGreater(sum(x["prises"] for x in d["tendance"]), 0)
        self.assertEqual(sum(x["total"] for x in d["parCas"]), d["references"]["total"])
        self.assertEqual(sum(x["total"] for x in d["parCentre"]), d["references"]["total"])
