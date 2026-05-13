"""
Presidio HTTP server.

Exposes:
  GET  /health            — liveness probe
  POST /analyze           — detect PII entities in text
  POST /anonymize         — replace detected entities (we mostly do this
                            client-side, but the endpoint is here for parity)

Custom recognizers added: MRN (medical record number), HEALTH_PLAN_ID.
"""

import os
import logging

from flask import Flask, jsonify, request
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

from recognizers import register_custom_recognizers

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("presidio")

app = Flask(__name__)

# Build the registry with built-in + custom recognizers.
registry = RecognizerRegistry()
registry.load_predefined_recognizers()
register_custom_recognizers(registry)

analyzer = AnalyzerEngine(registry=registry)
anonymizer = AnonymizerEngine()


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/analyze")
def analyze():
    payload = request.get_json(force=True)
    text = payload.get("text", "")
    language = payload.get("language", "en")
    entities = payload.get("entities")  # optional list

    if not text:
        return jsonify([])

    results = analyzer.analyze(
        text=text,
        language=language,
        entities=entities,
    )
    return jsonify(
        [
            {
                "entity_type": r.entity_type,
                "start": r.start,
                "end": r.end,
                "score": r.score,
                "text": text[r.start : r.end],
            }
            for r in results
        ]
    )


@app.post("/anonymize")
def anonymize():
    payload = request.get_json(force=True)
    text = payload.get("text", "")
    analyzer_results = payload.get("analyzer_results", [])

    # Re-hydrate analyzer results into Presidio's expected format
    from presidio_analyzer import RecognizerResult

    ar = [
        RecognizerResult(
            entity_type=r["entity_type"],
            start=r["start"],
            end=r["end"],
            score=r["score"],
        )
        for r in analyzer_results
    ]

    operators = {
        "DEFAULT": OperatorConfig("replace", {"new_value": "<REDACTED>"}),
    }
    result = anonymizer.anonymize(text=text, analyzer_results=ar, operators=operators)
    return jsonify(
        {
            "text": result.text,
            "items": [
                {
                    "operator": item.operator,
                    "entity_type": item.entity_type,
                    "start": item.start,
                    "end": item.end,
                    "text": item.text,
                }
                for item in result.items
            ],
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    log.info("Starting Presidio on port %s", port)
    # In production, gunicorn runs this. For local dev, Flask's server is fine.
    app.run(host="0.0.0.0", port=port, debug=False)
