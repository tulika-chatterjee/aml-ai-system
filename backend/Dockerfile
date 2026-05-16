# Build from repo root: docker build -f backend/Dockerfile .
FROM python:3.12-slim

WORKDIR /app/backend

ENV PYTHONPATH=/app/backend:/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    REGULATORY_DOCS_PATH=/app/data/regulatory

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend/app ./app
COPY agents /app/agents
COPY models /app/models
COPY data/regulatory /app/data/regulatory

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
