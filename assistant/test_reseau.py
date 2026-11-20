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
