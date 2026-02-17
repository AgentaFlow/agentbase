# ---- Build Stage ----
FROM python:3.12-slim AS builder
WORKDIR /app

COPY packages/ai-service/requirements.txt .
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

# ---- Production Stage ----
FROM python:3.12-slim AS production
WORKDIR /app

RUN addgroup --system agentbase && adduser --system --group agentbase
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder /deps /usr/local/lib/python3.12/site-packages
COPY packages/ai-service/app ./app

USER agentbase

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:8000/api/ai/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
