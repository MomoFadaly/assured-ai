# Presidio analyzer + anonymizer sidecar.
# Single Python service exposing /analyze and /anonymize on port 5001.
#
# Why a sidecar: see ADR-003. Microsoft maintains Presidio in Python; running
# it in a separate container avoids Python-in-Node hacks and gives a clean
# boundary for production deployments.

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_lg

COPY server.py recognizers.py ./

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["python", "server.py"]
