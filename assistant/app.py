"""Service assistant, séparé de l'API et de la base.

Il ne voit aucun dossier d'enfant : seulement les textes approuvés du corpus.
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field

from repondre import charger, repondre

app = FastAPI(title="Fil d'Or — assistant", version="0.1.0")
CORPUS = charger()


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=400)


@app.get("/health")
def sante():
    return {"statut": "ok", "service": "assistant", "contenus": len(CORPUS)}


@app.post("/questions")
def question(demande: Question):
    return repondre(demande.question, CORPUS)
