FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY corpus.json app.py repondre.py reseau.py ./
RUN useradd --system --no-create-home assistant && chown -R assistant /app
USER assistant
EXPOSE 8090
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
