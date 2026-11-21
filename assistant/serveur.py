"""Même contrat que app.py, sans dépendance externe.

Utile quand l'environnement local ne démarre pas FastAPI.
"""

import json
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from repondre import charger, repondre
from reseau import Reseau

CORPUS = charger()
RESEAU = Reseau(repondre=repondre, corpus=CORPUS)

# Historique des conversations par session (conserve les 3 dernières questions)
HISTORIQUE_SESSIONS = {}


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj, session_id=None):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        # En-têtes CORS
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-ID, Session-Id, session-id")
        self.send_header("Access-Control-Expose-Headers", "X-Session-ID, Session-Id")
        if session_id:
            self.send_header("X-Session-ID", session_id)
            self.send_header("Session-Id", session_id)
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        """Réponse preflight CORS pour les requêtes avec en-têtes personnalisés."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-ID, Session-Id, session-id")
        self.send_header("Access-Control-Expose-Headers", "X-Session-ID, Session-Id")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def _reseau(self, methode):
        """Réseau Fil d'Or (prototype) : même contrat que app.py."""
        chemin = self.path.split("?")[0]
        for prefixe in ("/assistant/reseau/", "/reseau/"):
            if chemin.startswith(prefixe):
                corps = {}
                if methode in ("POST", "PATCH"):
                    if int(self.headers.get("Content-Length", "0") or 0) > 400_000:
                        self._json(413, {"detail": "Envoi trop volumineux."})
                        return True
                    try:
                        corps = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))).decode() or "{}")
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        self._json(422, {"detail": "JSON invalide"})
                        return True
                jeton = self.headers.get("Authorization", "").removeprefix("Bearer ").strip()
                code, objet = RESEAU.traiter(methode, chemin[len(prefixe):], corps, jeton)
                self._json(code, objet)
                return True
        return False

    def do_PATCH(self):
        if not self._reseau("PATCH"):
            self._json(404, {"detail": "introuvable"})

    def do_GET(self):
        if self._reseau("GET"):
            return
        chemin = self.path.split("?")[0]
        if chemin in ("/health", "/assistant/health"):
            self._json(200, {"statut": "ok", "service": "assistant", "contenus": len(CORPUS)})
        elif chemin in ("/sujets", "/assistant/sujets"):
            # Liste des sujets disponibles dans le corpus
            sujets = [
                {
                    "sujet": doc["sujet"],
                    "titre": doc["titre"],
                }
                for doc in CORPUS
            ]
            self._json(200, sujets)
        else:
            self._json(404, {"detail": "introuvable"})

    def do_POST(self):
        if self._reseau("POST"):
            return
        chemin = self.path.split("?")[0]
        if chemin not in ("/questions", "/assistant/questions"):
            self._json(404, {"detail": "introuvable"})
            return

        # Récupération ou initialisation du session-id pour l'historique
        session_id = (
            self.headers.get("X-Session-ID")
            or self.headers.get("Session-Id")
            or self.headers.get("session-id")
        )

        taille = int(self.headers.get("Content-Length", "0"))
        try:
            corps = json.loads(self.rfile.read(taille).decode() or "{}")
            question = corps.get("question", "")
            if not session_id and corps.get("session_id"):
                session_id = str(corps.get("session_id"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(422, {"detail": "JSON invalide"})
            return

        if not isinstance(question, str) or not question.strip() or len(question) > 400:
            self._json(422, {"detail": "Question attendue, 400 caractères au plus."})
            return

        if not session_id:
            session_id = uuid.uuid4().hex

        # Historique conversationnel des 3 dernières questions
        historique = HISTORIQUE_SESSIONS.get(session_id, [])
        reponse_data = repondre(question, CORPUS, historique=historique)

        # Mise à jour de l'historique de session
        historique.append(question)
        HISTORIQUE_SESSIONS[session_id] = historique[-3:]

        # Ajout du session_id dans la réponse
        reponse_data["session_id"] = session_id
        self._json(200, reponse_data, session_id=session_id)

    def log_message(self, fmt, *args):
        print(self.address_string(), fmt % args, flush=True)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8092), Handler).serve_forever()
