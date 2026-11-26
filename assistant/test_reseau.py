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


class StructuresTest(unittest.TestCase):
    def setUp(self):
        self.r = neuf()
        self.ec = connecter(self.r, "ecole.agbele")

    def test_presence_et_vue(self):
        code, v = self.r.traiter("POST", "structures/moi/presence", {"presents": 33}, self.ec)
        self.assertEqual(code, 200)
        self.assertEqual(v["presenceAujourdhui"], 33)
        self.assertEqual(self.r.traiter("POST", "structures/moi/presence", {"presents": 99}, self.ec)[0], 422)
        self.assertEqual(len(v["semaine"]), 7)

    def test_signalement_cree_une_reference_sans_nom(self):
        corps = {"idClient": "sign-000001-abcd", "code": "AG-0042", "motif": "maigre"}
        code, o = self.r.traiter("POST", "structures/moi/signalement", corps, self.ec)
        self.assertEqual(code, 200)
        self.assertEqual(o["reference"]["origine"], "ecole")
        _, o2 = self.r.traiter("POST", "structures/moi/signalement", corps, self.ec)
        self.assertTrue(o2["doublon"])
        self.assertEqual(self.r.traiter("POST", "structures/moi/signalement", {"idClient": "sign-000002-abcd", "code": "Kofi Mensah", "motif": "maigre"}, self.ec)[0], 422)
        _, v = self.r.traiter("GET", "structures/moi", None, self.ec)
        self.assertEqual(v["signalements"], 1)

    def test_le_district_voit_les_structures_et_le_centre_son_tableau(self):
        di = connecter(self.r, "district.togo")
        _, d = self.r.traiter("GET", "district", None, di)
        self.assertEqual(len(d["structures"]), 3)
        ho = connecter(self.r, "centre.davie")
        _, c = self.r.traiter("GET", "centre/moi", None, ho)
        self.assertTrue(c["hopital"])
        self.assertEqual(len(c["tendance"]), 7)
        self.assertEqual(self.r.traiter("GET", "structures/moi", None, ho)[0], 403)


class EveilTest(unittest.TestCase):
    def test_observation_et_signalement_automatique(self):
        r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS); ec = connecter(r, "ecole.agbele")
        _, v = r.traiter("GET", "structures/moi", None, ec)
        self.assertEqual(len(v["eveil"]["evolution"]), 6)
        self.assertEqual(len(v["eveil"]["domaines"]), 4)
        corps = {"idClient": "obs-00000001-ab", "code": "AG-0099", "ageMois": 40, "langage": 1, "motricite": 1, "social": 3, "cognition": 2}
        code, o = r.traiter("POST", "structures/moi/observation", corps, ec)
        self.assertEqual(code, 200)
        self.assertEqual(len(o["aStimuler"]), 2)
        self.assertIn("signalement", o)
        self.assertTrue(r.traiter("POST", "structures/moi/observation", corps, ec)[1]["doublon"])
        self.assertEqual(r.traiter("POST", "structures/moi/observation", {**corps, "idClient": "obs-00000002-ab", "langage": 9}, ec)[0], 422)


class NotificationsTest(unittest.TestCase):
    def test_par_role(self):
        r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS)
        for ident in ("centre.davie", "agent.nutrition", "district.togo", "ecole.davie"):
            code, o = r.traiter("GET", "notifications", None, connecter(r, ident))
            self.assertEqual(code, 200)
            self.assertIsInstance(o["notifications"], list)
        _, o = r.traiter("GET", "notifications", None, connecter(r, "district.togo"))
        self.assertTrue(any("prioritaire" in n["texte"] for n in o["notifications"]))
        self.assertEqual(r.traiter("GET", "notifications", None)[0], 401)


class ItineraireTest(unittest.TestCase):
    def setUp(self):
        self.r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS)

    def test_voiture_bloquee_par_inondation_moto_passe(self):
        code, o = self.r.traiter("POST", "itineraire", {"de": "zogbedji", "vers": "c4"})
        self.assertEqual(code, 200)
        modes = {m["mode"]: m for m in o["modes"]}
        self.assertTrue(modes["moto"]["possible"])
        self.assertTrue(modes["voiture"]["possible"])  # contourne par Kpadapé, plus long
        self.assertGreater(modes["voiture"]["minutes"], 0)
        self.assertIn(o["recommande"], ("moto", "voiture"))

    def test_pont_coupe_bloque_tout_sauf_a_pied(self):
        ag = connecter(self.r, "agent.nutrition")
        for a, b in (("zogbedji", "davie"), ("kpadape", "davie")):
            self.assertEqual(self.r.traiter("POST", "obstacles", {"de": a, "vers": b, "type": "pont"}, ag)[0], 200)
        _, o = self.r.traiter("POST", "itineraire", {"de": "agbele", "vers": "c4"})
        modes = {m["mode"]: m for m in o["modes"]}
        self.assertFalse(modes["moto"]["possible"])
        self.assertFalse(modes["voiture"]["possible"])
        self.assertTrue(modes["pied"]["possible"])

    def test_obstacle_leve(self):
        ag = connecter(self.r, "agent.nutrition")
        _, lst = self.r.traiter("GET", "obstacles", None)
        oid = lst["obstacles"][0]["id"]
        self.assertEqual(self.r.traiter("PATCH", f"obstacles/{oid}", {}, ag)[0], 200)
        _, lst2 = self.r.traiter("GET", "obstacles", None)
        self.assertEqual(len(lst2["obstacles"]), len(lst["obstacles"]) - 1)

    def test_signaler_exige_un_compte_pro(self):
        self.assertEqual(self.r.traiter("POST", "obstacles", {"de": "agbele", "vers": "kpadape", "type": "arbre"})[0], 401)

    def test_district_cree_un_etablissement(self):
        di = connecter(self.r, "district.togo")
        code, e = self.r.traiter("POST", "etablissements", {"nom": "Crèche de Tovégan", "village": "tovegan", "type": "creche", "capacite": 25}, di)
        self.assertEqual(code, 200)
        _, l = self.r.traiter("GET", "lieux", None)
        self.assertTrue(any(x["id"] == e["id"] for x in l["lieux"]))
        self.assertEqual(self.r.traiter("POST", "etablissements", {"nom": "X", "village": "tovegan", "type": "creche"}, connecter(self.r, "agent.nutrition"))[0], 403)


class GouvernanceTest(unittest.TestCase):
    def setUp(self):
        self.r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS)
        self.di = connecter(self.r, "district.togo")

    def _creer_et_activer(self, jeton, role, nom, ref="", mdp="motdepasse1"):
        code, o = self.r.traiter("POST", "comptes", {"role": role, "nom": nom, "ref": ref}, jeton)
        self.assertEqual(code, 200, o)
        ident, cle = o["compte"]["identifiant"], o["codeActivation"]
        self.assertEqual(self.r.traiter("POST", "activer", {"identifiant": ident, "code": cle, "mdp": mdp})[0], 200)
        code, c = self.r.traiter("POST", "connexion", {"identifiant": ident, "mdp": mdp})
        self.assertEqual(code, 200)
        return ident, cle, c["jeton"]

    def test_creer_compte_activer_connecter(self):
        # le centre crée son agent
        ce = connecter(self.r, "centre.agbele")
        code, o = self.r.traiter("POST", "comptes", {"role": "agent", "nom": "Akou Mensah", "ref": "kpadape"}, ce)
        self.assertEqual(code, 200)
        ident, cle = o["compte"]["identifiant"], o["codeActivation"]
        self.assertEqual(self.r.traiter("POST", "connexion", {"identifiant": ident, "mdp": "nimporte"})[0], 401)
        self.assertEqual(self.r.traiter("POST", "activer", {"identifiant": ident, "code": "MAUVAIS1", "mdp": "motdepasse1"})[0], 422)
        self.assertEqual(self.r.traiter("POST", "activer", {"identifiant": ident, "code": cle, "mdp": "court"})[0], 422)
        self.assertEqual(self.r.traiter("POST", "activer", {"identifiant": ident, "code": cle, "mdp": "motdepasse1"})[0], 200)
        self.assertEqual(self.r.traiter("POST", "activer", {"identifiant": ident, "code": cle, "mdp": "motdepasse1"})[0], 422)  # code à usage unique
        code, c = self.r.traiter("POST", "connexion", {"identifiant": ident, "mdp": "motdepasse1"})
        self.assertEqual(code, 200)
        self.assertEqual(c["role"], "agent")
        self.assertEqual(self.r.traiter("GET", "references", None, c["jeton"])[0], 200)
        # un autre compte ne peut pas suspendre cet agent ; le centre qui l'a créé le peut
        self.assertEqual(self.r.traiter("PATCH", f"comptes/{ident}", {"actif": False}, self.di)[0], 403)
        self.r.traiter("PATCH", f"comptes/{ident}", {"actif": False}, ce)
        self.assertEqual(self.r.traiter("GET", "references", None, c["jeton"])[0], 401)

    def test_chaque_niveau_cree_le_niveau_en_dessous(self):
        na = connecter(self.r, "national.togo")
        # le national ne crée ni district, ni agent, ni centre
        for role in ("district", "agent", "centre", "ecole"):
            self.assertEqual(self.r.traiter("POST", "comptes", {"role": role, "nom": "Test Nom", "ref": "c1"}, na)[0], 403)
        _, _, re_ = self._creer_et_activer(na, "regional", "Région des Plateaux")
        # le district ne crée ni district ni régional ni agent
        for role in ("district", "regional", "agent"):
            self.assertEqual(self.r.traiter("POST", "comptes", {"role": role, "nom": "Test Nom"}, self.di)[0], 403)
        # le régional crée des districts, mais pas d'agent ni de village
        self.assertEqual(self.r.traiter("POST", "comptes", {"role": "agent", "nom": "Test Nom"}, re_)[0], 403)
        self.assertEqual(self.r.traiter("POST", "villages", {"nom": "Village X", "x": 10, "y": 10, "relie": ["agbele"]}, re_)[0], 403)
        _, _, di = self._creer_et_activer(re_, "district", "District de Notsé")
        # le district crée un centre, une école, un technicien
        _, _, ce = self._creer_et_activer(di, "centre", "Dispensaire de Tovégan", ref="c1")
        self._creer_et_activer(di, "technicien", "Technicien Notsé")
        # le centre crée ses agents
        _, _, ag = self._creer_et_activer(ce, "agent", "Agent Tovégan")
        self.assertEqual(self.r.traiter("GET", "references", None, ag)[0], 200)
        # chacun ne voit que ses propres créations
        _, l = self.r.traiter("GET", "comptes", None, re_)
        self.assertEqual([x["role"] for x in l["comptes"]], ["district"])
        _, l = self.r.traiter("GET", "comptes", None, na)
        self.assertEqual([x["role"] for x in l["comptes"]], ["regional"])
        # un agent ne crée rien
        self.assertEqual(self.r.traiter("GET", "comptes", None, ag)[0], 403)

    def test_le_regional_lit_comme_le_national(self):
        na = connecter(self.r, "national.togo")
        _, _, re_ = self._creer_et_activer(na, "regional", "Région Maritime")
        self.assertEqual(self.r.traiter("GET", "national", None, re_)[0], 200)

    def test_creer_village_centre_et_manques(self):
        code, v = self.r.traiter("POST", "villages", {"nom": "Kpélé Nord", "x": 60, "y": 25, "langue": "Éwé", "enfants": 80, "relie": ["tovegan"]}, self.di)
        self.assertEqual(code, 200)
        _, m = self.r.traiter("GET", "manques", None, self.di)
        mv = next(x for x in m["manques"] if x["id"] == v["id"])
        self.assertTrue(any(f["code"] == "prescolaire" for f in mv["manques"]))
        self.assertTrue(any(f["code"] == "centre" for f in mv["manques"]))
        code, e = self.r.traiter("POST", "etablissements", {"nom": "Centre de Kpélé", "village": v["id"], "type": "centre"}, self.di)
        self.assertEqual(code, 200)
        _, m2 = self.r.traiter("GET", "manques", None, self.di)
        self.assertFalse(any(f["code"] == "centre" for f in next(x for x in m2["manques"] if x["id"] == v["id"])["manques"]))
        # le nouveau centre peut recevoir une alerte
        self.assertEqual(self.r.traiter("POST", "alertes", {"centreId": e["id"], "cas": "enfant", "niveau": "urgent", "signes": ["toux"], "depuis": v["id"]})[0], 200)
        _, it = self.r.traiter("POST", "itineraire", {"de": "agbele", "vers": v["id"]})
        self.assertTrue(any(x["possible"] for x in it["modes"]))

    def test_national(self):
        na = connecter(self.r, "national.togo")
        _, n = self.r.traiter("GET", "national", None, na)
        self.assertEqual(len(n["regions"]), 5)
        self.assertEqual(len(n["regions"][0]["valeurs"]["vaccination"]["serie"]), 6)
        self.assertEqual(self.r.traiter("GET", "national", None, self.di)[0], 403)


class FoyersTest(unittest.TestCase):
    def setUp(self):
        self.r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS)
        self.ag = connecter(self.r, "agent.nutrition")

    def test_scanner_un_foyer_et_ne_pas_redonner(self):
        _, f = self.r.traiter("GET", "foyers", None, self.ag)
        code = f["foyers"][0]["code"]
        _, v = self.r.traiter("GET", f"foyers/{code}", None, self.ag)
        enfant = next(e for e in v["enfants"] if any(s["statut"] == "a-faire" for s in e["soins"]))
        soin = next(s["soin"] for s in enfant["soins"] if s["statut"] == "a-faire")
        corps = {"enfant": enfant["code"], "soin": soin, "idClient": "soin-0000001-a"}
        _, o = self.r.traiter("POST", f"foyers/{code}/soins", corps, self.ag)
        self.assertFalse(o["deja"])
        # envoyé deux fois (coupure réseau) : pas de doublon
        self.assertTrue(self.r.traiter("POST", f"foyers/{code}/soins", corps, self.ag)[1]["doublon"])
        # un autre agent repasse : le système dit « déjà fait », sans erreur
        _, o3 = self.r.traiter("POST", f"foyers/{code}/soins", {**corps, "idClient": "soin-0000002-a"}, self.ag)
        self.assertTrue(o3["deja"])
        self.assertIn("déjà donné", o3["message"])

    def test_creer_foyer(self):
        corps = {"idClient": "foyer-000001-a", "village": "tovegan", "enfants": [{"ageMois": 10}, {"ageMois": 40}]}
        code, f = self.r.traiter("POST", "foyers", corps, self.ag)
        self.assertEqual(code, 200)
        self.assertEqual(f["nbEnfants"], 2)
        self.assertTrue(f["qr"].startswith("FILDOR-FOYER:FOY-"))
        self.assertTrue(self.r.traiter("POST", "foyers", corps, self.ag)[1]["doublon"])
        self.assertEqual(self.r.traiter("POST", "foyers", {**corps, "idClient": "foyer-000002-a", "enfants": [{"ageMois": 200}]}, self.ag)[0], 422)

    def test_pas_concerne_a_cet_age(self):
        _, f = self.r.traiter("POST", "foyers", {"idClient": "foyer-000003-a", "village": "agbele", "enfants": [{"ageMois": 3}]}, self.ag)
        e = f["enfants"][0]["code"]
        code, _ = self.r.traiter("POST", f"foyers/{f['code']}/soins", {"enfant": e, "soin": "vitamineA", "idClient": "soin-0000009-a"}, self.ag)
        self.assertEqual(code, 422)


class BornesTest(unittest.TestCase):
    def setUp(self):
        self.r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS)
        self.tech = connecter(self.r, "technicien.borne")
        self.uni = connecter(self.r, "unicef.partenaire")

    def test_technicien_voit_les_alertes(self):
        code, v = self.r.traiter("GET", "bornes", None, self.tech)
        self.assertEqual(code, 200)
        etats = {b["id"]: b["etat"] for b in v["bornes"]}
        self.assertEqual(etats["b3"], "a-visiter"); self.assertEqual(etats["b1"], "stock-bas")
        self.assertIn("stock", v["bornes"][0])

    def test_partenaire_lit_sans_detail_et_ne_modifie_rien(self):
        code, v = self.r.traiter("GET", "bornes", None, self.uni)
        self.assertEqual(code, 200); self.assertNotIn("stock", v["bornes"][0]); self.assertNotIn("lieu", v["bornes"][0])
        self.assertEqual(self.r.traiter("GET", "national", None, self.uni)[0], 200)
        for chemin in ("bornes/b1/releve", "bornes/b1/recharge", "villages", "comptes", "foyers", "visites", "references"):
            self.assertEqual(self.r.traiter("POST", chemin, {"nom": "x"}, self.uni)[0], 403, chemin)

    def test_releve_sans_doublon_et_recharge(self):
        corps = {"idClient": "e-test-1", "stock": {"serviettes": 50}, "retraits": 10, "sondage": {"utile": {"oui": 3}}}
        a = self.r.traiter("POST", "bornes/b3/releve", corps, self.tech)[1]
        b = self.r.traiter("POST", "bornes/b3/releve", corps, self.tech)[1]
        self.assertEqual(a["retraits"], 28); self.assertEqual(b["retraits"], 28)
        self.assertEqual(a["etat"], "stock-bas")   # la relève remet l'horloge à zéro, mais l'antalgique reste à 0
        c = self.r.traiter("POST", "bornes/b3/recharge", {"idClient": "e2", "ajout": {"antalgique": 30, "preservatifs": 20}}, self.tech)[1]
        self.assertEqual(c["etat"], "ok")
        self.assertEqual(self.r.traiter("POST", "bornes/zz/releve", {}, self.tech)[0], 404)

    def test_notifications_technicien(self):
        _, n = self.r.traiter("GET", "notifications", None, self.tech)
        self.assertTrue(any("relève" in x["texte"] for x in n["notifications"]))


class MessagerieTest(unittest.TestCase):
    def setUp(self):
        self.r = Reseau(stock=Stock(None, graine=True), repondre=repondre, corpus=CORPUS)
        self.ag = connecter(self.r, "agent.nutrition"); self.ce = connecter(self.r, "centre.davie"); self.uni = connecter(self.r, "unicef.partenaire")

    def test_ecrire_lire_urgent_et_non_lus(self):
        c, o = self.r.traiter("POST", "messages", {"a": "centre.davie", "texte": "Enfant T036A, convulsions, j'arrive.", "urgent": True, "idClient": "m1"}, self.ag)
        self.assertEqual(c, 200)
        self.assertTrue(self.r.traiter("POST", "messages", {"a": "centre.davie", "texte": "x", "idClient": "m1"}, self.ag)[1].get("doublon"))
        _, f = self.r.traiter("GET", "messages", None, self.ce)
        self.assertEqual((f["nonLus"], f["urgents"]), (1, 1))
        _, n = self.r.traiter("GET", "notifications", None, self.ce)
        self.assertTrue(any("urgent" in x["texte"] for x in n["notifications"]))
        _, conv = self.r.traiter("GET", "messages/agent.nutrition", None, self.ce)
        self.assertEqual(len(conv["messages"]), 1)
        self.assertEqual(self.r.traiter("GET", "messages", None, self.ce)[1]["nonLus"], 0)

    def test_photo_controlee_et_partenaire_exclu(self):
        bonne = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
        self.assertEqual(self.r.traiter("POST", "messages", {"a": "centre.davie", "photo": bonne}, self.ag)[0], 200)
        for mauvaise in ("data:text/html;base64,AAAA", "javascript:alert(1)", "data:image/jpeg;base64," + "A" * 270000):
            self.assertEqual(self.r.traiter("POST", "messages", {"a": "centre.davie", "photo": mauvaise}, self.ag)[0], 422)
        self.assertEqual(self.r.traiter("POST", "messages", {"a": "centre.davie", "texte": "x"}, self.uni)[0], 403)
        self.assertEqual(self.r.traiter("POST", "messages", {"a": "unicef.partenaire", "texte": "x"}, self.ag)[0], 422)
        self.assertEqual(self.r.traiter("POST", "messages", {"a": "inconnu", "texte": "x"}, self.ag)[0], 422)
        _, k = self.r.traiter("GET", "contacts", None, self.ag)
        self.assertNotIn("unicef.partenaire", [x["identifiant"] for x in k["contacts"]])

    def test_on_ne_lit_pas_les_messages_des_autres(self):
        self.r.traiter("POST", "messages", {"a": "centre.davie", "texte": "secret"}, self.ag)
        tiers = connecter(self.r, "district.togo")
        self.assertEqual(self.r.traiter("GET", "messages/agent.nutrition", None, tiers)[1]["messages"], [])
