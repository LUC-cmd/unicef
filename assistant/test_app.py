import os
os.environ["FILDOR_MDP_DEMO"] = "motdepasse-test"
os.environ["FILDOR_DONNEES"] = "/tmp/test-app-reseau.json"
from fastapi.testclient import TestClient
import app as appli

client = TestClient(appli.app)


def test_http():
    assert client.post("/reseau/orienter", json={"cas": "grossesse", "signes": ["saigne"], "village": "agbele"}).json()["centre"]["id"] == "c4"
    c = client.post("/reseau/connexion", json={"identifiant": "agent.nutrition", "mdp": "motdepasse-test"}).json()
    assert client.get("/reseau/produits", headers={"Authorization": "Bearer " + c["jeton"]}).status_code == 200
    assert client.get("/reseau/alertes").status_code == 401
    assert client.patch("/reseau/produits/xx", json={"etat": "valide"}, headers={"Authorization": "Bearer " + c["jeton"]}).status_code == 404
    assert client.post("/reseau/orienter", content="pas du json", headers={"content-type": "application/json"}).status_code == 422
    assert client.post("/questions", json={"question": "vaccin"}).status_code == 200
