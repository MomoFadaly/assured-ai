"""
Custom recognizers for healthcare-specific identifiers.

MRN (Medical Record Number): typically 6-10 digits. We use a regex that
permits a context-aware boost when "MRN" or similar precedes the digits.

HEALTH_PLAN_ID: alphanumeric identifiers in member-id format.
"""

from presidio_analyzer import (
    Pattern,
    PatternRecognizer,
    RecognizerRegistry,
)


def register_custom_recognizers(registry: RecognizerRegistry) -> None:
    mrn = PatternRecognizer(
        supported_entity="MRN",
        name="MRN Recognizer",
        patterns=[
            Pattern(
                name="mrn-with-context",
                regex=r"\b(?:MRN|medical record(?:\s+number)?|patient\s+id)[:\s#]*\d{6,10}\b",
                score=0.9,
            ),
            Pattern(
                name="mrn-bare",
                regex=r"\b\d{7,9}\b",
                score=0.3,  # low score; needs context to fire reliably
            ),
        ],
        context=["MRN", "patient", "record", "ID", "ID#"],
    )

    # Health plan IDs in patient records are formatted with an explicit
    # marker (Member ID, Policy #, Subscriber Number) and the ID itself
    # always contains at least one digit. Requiring both eliminates the
    # false-positive cascade ("meal plan should...") that the loose
    # version produced.
    health_plan_id = PatternRecognizer(
        supported_entity="HEALTH_PLAN_ID",
        name="Health Plan ID Recognizer",
        patterns=[
            Pattern(
                name="member-id-with-marker",
                regex=r"\b(?:member|policy|subscriber)\s*(?:id|number|no|#)\s*[:.#]?\s*[A-Z0-9]*\d[A-Z0-9]{2,14}\b",
                score=0.85,
            ),
        ],
        context=["member", "policy", "subscriber", "insurance"],
    )

    registry.add_recognizer(mrn)
    registry.add_recognizer(health_plan_id)
