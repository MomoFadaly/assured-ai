# AssuredAI — Compliance Posture

This document is the source of truth for what AssuredAI claims, what it does not, and the language to use when discussing the system with prospects, regulators, or compliance teams.

## TL;DR

AssuredAI is **HIPAA-aware architecture** — designed and implemented to support the operational and technical safeguards a covered entity needs. It is **not** a HIPAA-certified product. Certification is a deployment-time activity that requires Business Associate Agreements, formal audit, and review by the covered entity's compliance team.

The same applies to FedRAMP, SOC 2, ISO 27001, and GDPR. Architecture is in scope for the POC; certification is not.

## Approved language

When discussing AssuredAI with prospects or panels, use this language verbatim. It is precise and defensible.

### ✅ Things we say

- "HIPAA-aware architecture"
- "FedRAMP-aligned design patterns"
- "Audit-ready infrastructure"
- "Compliance-ready logging"
- "Privacy-first redaction at input and output boundaries"
- "Designed to support compliance review and BAA execution"
- "Tamper-evident audit trail with cryptographic chain verification"
- "Source-bounded retrieval — every output traceable to an approved citation"
- "Clear AI labeling and disclaimers per FDA and FTC guidance"
- "Red-flag escalation aligned with chatbot safety best practices"

### ❌ Things we do not say

- ❌ "HIPAA compliant" — requires BAA + audit + cert
- ❌ "HIPAA certified" — there is no such thing
- ❌ "FedRAMP authorized" — specific federal cert process
- ❌ "SOC 2 Type II certified" — requires actual third-party audit
- ❌ "GDPR compliant" — specific framework, requires DPO and other deployment-time activities
- ❌ "Patient-safe AI" — implies clinical claim we cannot make
- ❌ "Doctor-approved" — implies medical endorsement we cannot make
- ❌ "Protected by HIPAA" — patient data is protected; software is not
- ❌ "Zero risk" — no AI system is zero risk

## When asked: "Is this HIPAA compliant?"

Use this answer:

> *"It's HIPAA-aware. The architecture supports compliance — append-only audit trails, two-pass PII redaction, source-bounded responses, kill switch, red-flag escalation. Production deployment in a covered entity requires a Business Associate Agreement with the model provider, formal compliance review, and HHS audit. The architecture is designed to clear that audit, but the certification work is post-deployment, not built into the POC."*

This answer wins respect from compliance professionals because it is precise. Overclaiming loses respect instantly.

## What the POC actually addresses (controls inventory)

Mapping AssuredAI's controls to common compliance frameworks. This is not a substitute for an audit; it is a starting point for one.

### HIPAA Security Rule — Technical Safeguards (45 CFR § 164.312)

| Standard | AssuredAI control | Status |
|---|---|---|
| § 164.312(a)(1) Access control | Clerk-authenticated operator console; public chat for POC, SAML/OIDC for production | Architecture |
| § 164.312(a)(2)(iii) Automatic logoff | Clerk session timeout configurable | Built |
| § 164.312(a)(2)(iv) Encryption | TLS in transit, encrypted at rest (Neon default), env-based secrets | Built |
| § 164.312(b) Audit controls | Hash-chained append-only audit log with cryptographic verification | Built |
| § 164.312(c)(1) Integrity | Append-only constraints + hash chain detect tampering | Built |
| § 164.312(d) Person/entity authentication | Clerk; production SAML/OIDC | Architecture |
| § 164.312(e)(1) Transmission security | TLS 1.2+, no plaintext logging of redacted content | Built |

### HIPAA Privacy Rule — Minimum Necessary

- Two-pass PII redaction at input AND output boundaries — covered content is never sent to the model
- Audit log stores only redacted versions of queries and responses
- No ePHI persisted in vector database (only vetted public source content is embedded)

### HHS OCR Online Tracking Guidance (2024)

- No third-party trackers, pixels, or analytics on the chat interface by default
- No cross-domain identifiers
- Server-side analytics only

### FTC Health Breach Notification Rule (2024 update)

- Audit log captures every interaction; in the event of a breach, full forensic record is exportable
- Redaction policies prevent inadvertent disclosure to third-party APIs

### FDA / FTC AI labeling guidance

- Chatbot self-introduces ("I'm an AI assistant — I'm not a clinician")
- Every response footer: "Powered by AI — answers cite our official sources"
- Disclaimers on health-related content: "Always consult a qualified clinician for medical advice"
- "View source" links on every citation
- "Why am I seeing this?" affordances on suggested follow-ups

### GDPR (Article 22 — automated decision-making)

- Human-in-the-loop on content publication (operator console approval queue)
- AssuredAI is augmentative — it does not make autonomous decisions about individuals
- Right to erasure: audit log entries can be redacted by the operator (cryptographic chain still verifies; only the content fields are redacted)

## What production deployment adds

The following are explicitly OUT of scope for the POC and IN scope for production deployment:

1. **Business Associate Agreements** with all AI service providers (Anthropic, Voyage, etc.) and all infrastructure providers (Neon, Vercel, etc.)
2. **HIPAA-eligible hosting** — production runs on HIPAA-eligible managed infrastructure (or AWS GovCloud / Azure Government for self-host)
3. **Formal risk assessment** per § 164.308(a)(1)(ii)(A)
4. **Workforce training** documentation
5. **Contingency plan** including disaster recovery and emergency mode operation
6. **Periodic security evaluation** including penetration testing
7. **Audit by qualified third party** (HITRUST, AICPA SOC 2, etc. depending on framework)

These are deployment activities, not architectural decisions. The architecture is designed to support them; the POC does not include them.

## Coalition for Health AI (CHAI) alignment

The white paper references the Coalition for Health AI's assurance framework. AssuredAI's design aligns with the CHAI principles:

- **Useful** — citations and confidence signals help users evaluate output quality
- **Fair** — bias review is part of the operator console quality dashboard (top "I don't know" queries surface gaps in source library that may correlate with underserved populations)
- **Safe** — red-flag escalation, "I don't know" guardrails, no clinical claims
- **Transparent** — clear AI labeling, source attribution, audit trail
- **Reliable** — confidence gates, citation validation, output redaction
- **Privacy-preserving** — two-pass redaction, minimum necessary principle
- **Accountable** — audit log + governance committee structure (documented)

## Document maintenance

This document must be reviewed and updated:
- Whenever the architecture changes in a way that affects controls
- Whenever a new compliance framework becomes relevant (e.g., state law changes)
- At minimum, every 6 months
- Before any external claim is made about the system's compliance posture
