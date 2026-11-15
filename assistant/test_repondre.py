import unittest

from repondre import charger, repondre

CORPUS = charger()


class RepondreTest(unittest.TestCase):
    def test_vaccin(self):
        r = repondre("Mon enfant a manqué un vaccin, que faire ?", CORPUS)
        self.assertEqual(r["niveau"], "INFO")
        self.assertEqual(r["sources"][0]["sujet"], "VACCINS")

    def test_naissance_gratuite(self):
        r = repondre("La déclaration de naissance est-elle gratuite ?", CORPUS)
        self.assertEqual(r["sources"][0]["sujet"], "NAISSANCE")
        self.assertIn("45", r["reponse"])

    def test_signe_de_danger(self):
        r = repondre("Il a des convulsions et il est très faible", CORPUS)
        self.assertEqual(r["niveau"], "URGENCE")
        self.assertIn("centre de santé", r["reponse"])
        self.assertIn("diagnostic", r["limite"])

    def test_question_hors_corpus(self):
        r = repondre("Quel est le prix du ciment au marché ?", CORPUS)
        self.assertEqual(r["niveau"], "INCONNU")
        self.assertEqual(r["sources"], [])

    def test_question_vide(self):
        r = repondre(" ?", CORPUS)
        self.assertEqual(r["niveau"], "INCONNU")


if __name__ == "__main__":
    unittest.main()
