# ---- Build Stage ----
FROM mcr.microsoft.com/cbl-mariner/base/python:3.12 AS builder
WORKDIR /app

COPY packages/ai-service/requirements.txt .

# Inject Azure Artifacts PyPI URL; falls back to public PyPI for local builds without the arg
ARG AZURE_ARTIFACTS_PIP_URL
RUN pip install --no-cache-dir \
      --index-url "${AZURE_ARTIFACTS_PIP_URL:-https://pypi.org/simple/}" \
      --target=/deps -r requirements.txt

# ---- Production Stage ----
FROM mcr.microsoft.com/cbl-mariner/base/python:3.12 AS production
WORKDIR /app

RUN groupadd -r agentbase && useradd -r -g agentbase -s /sbin/nologin -M agentbase
RUN tdnf install -y wget

COPY --from=builder /deps /usr/local/lib/python3.12/site-packages
COPY packages/ai-service/app ./app

USER agentbase

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:8000/api/ai/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
