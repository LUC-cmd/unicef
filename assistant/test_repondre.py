import unittest

from repondre import charger, repondre

CORPUS = charger()


class RepondreTest(unittest.TestCase):
    def test_vaccin(self):
        r = repondre("Mon enfant a manqué un vaccin, que faire ?", CORPUS)
        self.assertEqual(r["niveau"], "INFO")
        self.assertEqual(r["sources"][0]["sujet"], "VACCINS")
        self.assertGreater(r["confiance"], 50)

    def test_naissance_gratuite(self):
        r = repondre("La déclaration de naissance est-elle gratuite ?", CORPUS)
        self.assertEqual(r["sources"][0]["sujet"], "NAISSANCE")
        self.assertIn("45", r["reponse"])
        self.assertGreater(r["confiance"], 50)

    def test_signe_de_danger(self):
        r = repondre("Il a des convulsions et il est très faible", CORPUS)
        self.assertEqual(r["niveau"], "URGENCE")
        self.assertIn("centre de santé", r["reponse"])
        self.assertIn("diagnostic", r["limite"])
        self.assertEqual(r["confiance"], 100)

    def test_question_hors_corpus(self):
        r = repondre("Quel est le prix du ciment au marché ?", CORPUS)
        self.assertEqual(r["niveau"], "INCONNU")
        self.assertEqual(r["sources"], [])
        self.assertEqual(r["confiance"], 0)

    def test_question_vide(self):
        r = repondre(" ?", CORPUS)
        self.assertEqual(r["niveau"], "INCONNU")
        self.assertEqual(r["confiance"], 0)

    def test_nouveaux_sujets(self):
        # Paludisme
        r_p = repondre("Comment prévenir le paludisme avec une moustiquaire ?", CORPUS)
        self.assertEqual(r_p["niveau"], "INFO")
        self.assertEqual(r_p["sources"][0]["sujet"], "PALUDISME")

        # Diarrhée et SRO
        r_d = repondre("Quand donner la solution de réhydratation orale SRO et le zinc ?", CORPUS)
        self.assertEqual(r_d["niveau"], "INFO")
        self.assertEqual(r_d["sources"][0]["sujet"], "DIARRHEE")

        # Dermatologie (gale)
        r_g = repondre("Mon enfant se gratte beaucoup la nuit, est-ce la gale ?", CORPUS)
        self.assertEqual(r_g["niveau"], "INFO")
        self.assertEqual(r_g["sources"][0]["sujet"], "DERMATOLOGIE")

    def test_langues_locales(self):
        # Éwé : atikésu (paludisme)
        r_ewe = repondre("Devi atikesu", CORPUS)
        self.assertEqual(r_ewe["niveau"], "INFO")
        self.assertEqual(r_ewe["sources"][0]["sujet"], "PALUDISME")
        self.assertEqual(r_ewe["langue"], "ewe")

        # Kabyè : sibru (paludisme)
        r_kab = repondre("Biya sibru kɔyɛ", CORPUS)
        self.assertEqual(r_kab["niveau"], "INFO")
        self.assertEqual(r_kab["sources"][0]["sujet"], "PALUDISME")
        self.assertEqual(r_kab["langue"], "kabye")

        # Tem : lotu (diarrhée)
        r_tem = repondre("Bii lotu", CORPUS)
        self.assertEqual(r_tem["niveau"], "INFO")
        self.assertEqual(r_tem["sources"][0]["sujet"], "DIARRHEE")
        self.assertEqual(r_tem["langue"], "tem")

    def test_historique_conversation(self):
        # Question avec historique contextualisant
        historique = ["Mon enfant a de la diarrhée et vomit"]
        r = repondre("Comment préparer le sachet de sel et zinc ?", CORPUS, historique=historique)
        self.assertEqual(r["niveau"], "INFO")
        self.assertEqual(r["sources"][0]["sujet"], "DIARRHEE")

    def test_question_ambigue(self):
        # Question touchant à la fois la fièvre et les boutons/éruptions
        r = repondre("L'enfant a de la fièvre et des boutons sur la peau", CORPUS)
        self.assertEqual(r["niveau"], "INFO")
        self.assertTrue(r["ambigu"])
        self.assertGreaterEqual(len(r["sources"]), 2)
        sujets = [s["sujet"] for s in r["sources"]]
        self.assertTrue("FIEVRE" in sujets or "DERMATOLOGIE" in sujets)


if __name__ == "__main__":
    unittest.main()
