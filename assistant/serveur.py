"""Même contrat que app.py, sans dépendance externe.

Utile quand l'environnement local ne démarre pas FastAPI.
"""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from repondre import charger, repondre

CORPUS = charger()


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.split("?")[0] == "/health":
            self._json(200, {"statut": "ok", "service": "assistant", "contenus": len(CORPUS)})
        else:
            self._json(404, {"detail": "introuvable"})

    def do_POST(self):
        if self.path.split("?")[0] != "/questions":
            self._json(404, {"detail": "introuvable"})
            return
        taille = int(self.headers.get("Content-Length", "0"))
        try:
            corps = json.loads(self.rfile.read(taille).decode() or "{}")
            question = corps.get("question", "")
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(422, {"detail": "JSON invalide"})
            return
        if not isinstance(question, str) or not question.strip() or len(question) > 400:
            self._json(422, {"detail": "Question attendue, 400 caractères au plus."})
            return
        self._json(200, repondre(question, CORPUS))

    def log_message(self, fmt, *args):
        print(self.address_string(), fmt % args, flush=True)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8092), Handler).serve_forever()
