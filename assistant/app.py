"""Service assistant, séparé de l'API et de la base.

Il ne voit aucun dossier d'enfant : seulement les textes approuvés du corpus.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from repondre import charger, repondre
from reseau import Reseau

app = FastAPI(title="Fil d'Or — assistant", version="0.1.0")
CORPUS = charger()
RESEAU = Reseau(repondre=repondre, corpus=CORPUS)


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=400)


@app.get("/health")
def sante():
    return {"statut": "ok", "service": "assistant", "contenus": len(CORPUS)}


@app.get("/sujets")
def sujets():
    return [{"sujet": doc["sujet"], "titre": doc["titre"]} for doc in CORPUS]


@app.post("/questions")
def question(demande: Question):
    return repondre(demande.question, CORPUS)



@app.api_route("/reseau/{chemin:path}", methods=["GET", "POST", "PATCH"])
async def reseau(chemin: str, requete: Request):
    """Réseau Fil d'Or (prototype) : orientation, alertes aux centres, boutiques, questions anonymes."""
    corps = {}
    if requete.method in ("POST", "PATCH"):
        try:
            corps = await requete.json()
        except ValueError:
            return JSONResponse({"detail": "JSON invalide"}, status_code=422)
    jeton = requete.headers.get("authorization", "").removeprefix("Bearer ").strip()
    code, objet = RESEAU.traiter(requete.method, chemin, corps, jeton)
    return JSONResponse(objet, status_code=code)
