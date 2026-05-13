# Assured AI — 12-Pillar Roadmap

Industry guidance for trust-centric healthcare AI defines twelve pillars of an "Assured" AI deployment. This document maps every pillar to AssuredAI's current implementation status, the effort required to reach production, and the recommended sequencing for a six-month rollout.

**Legend:**
- ✅ **Built** — implemented and demonstrable in the POC
- 🟦 **Architected** — designed; partial implementation; production needs additional work
- 📋 **Documented** — roadmap-ready; not in POC; clear path to production

---

## Pillar 1 — Secure Managed Infrastructure as a Foundation

**White paper reference:** *"A hosted platform built with enterprise-grade security, performance, and tooling is the critical foundation."* (page 12)

**POC implementation:** 🟦 Architected
- Vercel + Neon for the demo deployment
- Docker Compose bundle for self-host demonstration
- Provider abstraction allows swapping infrastructure without code changes

**Production additions:**
- HIPAA-eligible managed hosting for healthcare/government clients
- AWS GovCloud or Azure Government for FedRAMP-aligned deployments
- Helm chart for Kubernetes orchestration at scale
- Documented BAA execution with all upstream providers

**Effort to production:** ~2 weeks (mostly contractual, not engineering)
**Dependencies:** Pillar 2

---

## Pillar 2 — Enterprise-Grade Security

**White paper reference:** *"Adopt an architecture hardened for healthcare and other high security use cases. Integrated global edge security measures (like a Web Application Firewall via Cloudflare, DDoS protection, and SSL management)."* (page 13)

**POC implementation:** 🟦 Architected
- TLS 1.2+ throughout
- Env-based secret management
- Clerk-authenticated operator console
- No third-party trackers on the chat interface

**Production additions:**
- WAF integration (Cloudflare or edge security)
- DDoS protection (provider-level)
- SOC 2 Type II audit (deployment-time activity)
- ISO/IEC 27001 audit (deployment-time activity)
- Penetration testing
- 24/7 server monitoring

**Effort to production:** Audits ~3-6 months; technical setup ~2 weeks
**Dependencies:** Pillar 1

---

## Pillar 3 — Scalable, Compliant Infrastructure

**White paper reference:** *"Compliance (HIPAA, CCPA, GDPR, etc.) must be supported at the infrastructure level. That means offering hosting in HIPAA-compliant environments when needed (with proper business associate agreements and data encryption in transit and at rest for ePHI), audit logging, and isolation of data."* (page 13)

**POC implementation:** 🟦 Architected
- Encryption in transit (TLS) and at rest (Neon default; Postgres encryption in self-host)
- Audit logging (hash-chained, append-only — see Pillar 9)
- Tenant isolation per deployment (single-tenant by design)

**Production additions:**
- BAA execution with Anthropic, Voyage AI, Neon, Vercel (or self-host substitutes)
- HIPAA-eligible compute (AWS GovCloud, Azure Government, or HIPAA-eligible managed hosting)
- Per-environment isolation (separate dev/staging/prod databases)
- Data residency configuration (US, EU, etc.)

**Effort to production:** ~4 weeks
**Dependencies:** Pillar 1, Pillar 2

---

## Pillar 4 — Rapid Rollback as a Safety Valve

**White paper reference:** *"Even with strong reviews, AI features can misfire in production. Assured AI incorporates enterprise-grade deployment practices with fast, granular rollback: Environment parity (Dev/Staging/Prod), feature flags/canary releases, versioned releases (code, prompts, model endpoints, and config) with one-click/snapshot restores."* (page 14)

**POC implementation:** 📋 Documented
- Feature flag pattern documented (LaunchDarkly or open-source flagd)
- Versioned releases via git tags + database migrations
- Prompt versioning structure documented in `packages/core/orchestration/prompts/`
- Model endpoint configuration externalized to env

**Production additions:**
- Feature flag service integration
- Canary release deployment automation
- One-click model rollback (revert to previous model version)
- Prompt rollback (revert to previous prompt version)
- Content-level reverts via WordPress Revisions (when integrated with WP)

**Effort to production:** ~2 weeks
**Dependencies:** Pillar 1

---

## Pillar 5 — Real-Time Performance Monitoring

**White paper reference:** *"Assured AI mandates Application Performance Monitoring (APM) and site monitoring tools."* (page 14)

**POC implementation:** 🟦 Architected
- Sentry wired in for error tracking
- Vercel Analytics for basic metrics
- Latency budget enforced per request lifecycle step

**Production additions:**
- Datadog or New Relic APM for production-grade telemetry
- Uptime monitoring (Pingdom, Better Uptime)
- Custom dashboards for AI-specific metrics (citation hit rate, "I don't know" rate, redaction rate, token costs)
- Alerting on degradation (latency, error rate, model timeout rate)

**Effort to production:** ~1 week
**Dependencies:** Pillar 1

---

## Pillar 6 — Headless Architecture for AI-Readiness

**White paper reference:** *"The Assured AI solution recommends that healthcare providers with a focus on AI readiness and futureproofing build and deploy headless websites."* (page 14)

**POC implementation:** ✅ Built
- Next.js frontend (App Router) — matches headless WordPress recommendations
- Frontend talks to backend via REST API routes — same shape as headless WP
- Documented integration path: replace POC's mock API with WP REST/GraphQL endpoints
- Composable architecture: LLM provider, vector DB, redaction, audit are all swappable

**Production additions:**
- Connect to actual WordPress backend (headless WordPress)
- Implement headless WordPress integration
- Bidirectional MCP adapter (when WP 7.0 ships)
- Edge delivery for static/ISR pages

**Effort to production:** ~2 weeks
**Dependencies:** Pillar 1; existing WP installation

---

## Pillar 7 — Essential AI Features (Governed Chatbot)

**White paper reference:** *"For sites that benefit from an interactive Q&A chatbot (for example, a patient-facing 'ask a question' feature on a hospital website), our architecture recommends using an open-source chatbot framework integrated with WordPress content."* (page 16)

**POC implementation:** ✅ Built — **this is the pilot**
- Governed RAG with strict source filtering
- Citation enforcement (every claim → real chunk)
- "I don't know" guardrails (confidence threshold)
- PII redaction at input + output boundaries
- Red-flag escalation (cardiac, mental health crisis, overdose, stroke, anaphylaxis)
- Two scenarios: healthcare and government
- ~30 vetted sources per scenario

**Production additions:**
- Integrate with managed first-party search for first-party search experience
- Integrate with a managed vector database (with BAA) (production scale)
- Per-client corpus customization (their own content + curated public sources)
- Multi-language support
- Voice interface (per accessibility requirements)

**Effort to production:** ~3 weeks per client deployment
**Dependencies:** Pillars 1, 6

---

## Pillar 8 — UX: Clear Labeling and User Education

**White paper reference:** *"On the design side, Assured AI User Experience (UX) Design practice mandate that any AI-driven feature is clearly labeled and explained to visitors."* (page 18)

**POC implementation:** ✅ Built
- Chatbot self-introduction: *"I'm HealthBot, an AI assistant. I answer questions using only verified content from this hospital's library and trusted public health sources. I'm not a clinician."*
- Response footer: *"Powered by AI — answers cite our official sources"*
- Disclaimers on health-related answers: *"Always consult a qualified clinician for medical advice."*
- "View source" links on every citation
- "Why am I seeing this?" affordances on suggested follow-ups
- Beta-feature labeling pattern documented

**Production additions:**
- Per-client UX customization (their voice, their disclaimers, their visual identity)
- Accessibility audit (WCAG AA minimum)
- Localization for multi-region deployments
- A/B testing of disclaimer variants

**Effort to production:** ~1 week per client deployment
**Dependencies:** Pillar 7

---

## Pillar 9 — Human-in-the-Loop Workflows, Governance, and Feedback

**White paper reference:** *"Even the best AI will produce occasional errors or content that needs review, especially in healthcare, where information accuracy is critical. That's why the solution architecture incorporates human-in-the-loop workflows at key points."* (page 18)

**POC implementation:** ✅ Built
- Operator console with approval queue for new sources
- Source library mgmt: add, deactivate (soft-delete; audit trail preserved)
- Hash-chained append-only audit log
- Kill switch with confirmation flow

**Production additions:**
- WordPress content approval workflow integration (when paired with headless WP)
- Multi-stage editorial review (writer → editor → compliance officer → publisher)
- Role-based access control (admin, auditor, operator, viewer)
- Document provenance tracking in CMS (AI-assisted vs. human-written)

**Effort to production:** ~2 weeks per client deployment
**Dependencies:** Pillar 7; WP integration

---

## Pillar 10 — User Analytics and Feedback Loops

**White paper reference:** *"Beyond technical metrics, Assured AI practices incorporate analytics to gauge user behavior and satisfaction... Make 'helpful/unhelpful' voting and 'report an issue' links standard on AI answers and high-stakes pages."* (page 19)

**POC implementation:** ✅ Built
- Helpful/unhelpful voting on every chatbot response
- Free-text "report an issue" affordance
- Operator console quality dashboard:
  - Helpfulness rate over time
  - Top "I don't know" queries (gaps in source library)
  - Top user-flagged answers (quality issues)
  - Citation click-through rate
- "No-answer / escalated" review queue

**Production additions:**
- Integration with the client's analytics stack (Parse.ly, GA4, etc.)
- Cohort analysis (helpfulness by topic, by user segment)
- Drift detection (citation patterns shifting over time)
- Auto-generation of source library expansion proposals

**Effort to production:** ~2 weeks per client deployment
**Dependencies:** Pillar 7

---

## Pillar 11 — Ongoing Oversight (Governance Committee)

**White paper reference:** *"The Assured AI process helps establish an AI Governance Committee that has access to administrative dashboards from the content management and hosting platform and any AI services to continuously monitor usage."* (page 19)

**POC implementation:** 📋 Documented
- AI Governance Committee charter template included in `docs/governance/committee-charter.md` (TODO)
- Quarterly review cadence template
- Sample agenda: re-validating accuracy by sampling 100 Q&A; assessing model drift; evaluating new third-party APIs; reviewing escalations
- Operator console dashboard exports designed for committee review

**Production additions:**
- Stand up actual committee with named roles
- Schedule quarterly governance meetings
- Document risk register and update on each meeting
- Annual policy refresh

**Effort to production:** Organizational, not engineering — ~1 month
**Dependencies:** None engineering; client buy-in

---

## Pillar 12 — Outcome and Data-Driven Reporting

**White paper reference:** Industry guidance: keep measurement simple, visible, and tied to decisions — a small set of KPIs and lightweight dashboards leaders can consume efficiently.

**POC implementation:** ✅ Built
- Operator console dashboard with the white paper's recommended KPI categories:
  - **Findability & engagement** — citation click-through rate, time-to-info
  - **Search/chat quality & deflection** — helpfulness rate, "I don't know" rate
  - **Internal knowledge impact** — average answer time, time-to-info
  - **Business outcomes** — appointments / sign-ups / conversions (when wired to client analytics)
- Two cadences supported per the white paper (page 20):
  - **Exec view**: monthly findability, quality, conversions, site health
  - **Ops view**: weekly failed queries, low-helpful pages

**Production additions:**
- Integration with client's BI stack (Looker, Tableau, etc.)
- Automatic report generation (PDF for monthly exec packs)
- Baseline → comparison reporting (capture 2-4 week baseline, show before/after)
- Close-the-loop ticketing (failed searches auto-create improvement tickets)

**Effort to production:** ~3 weeks per client
**Dependencies:** Pillar 10; client BI access

---

## Six-month rollout sequencing

The white paper recommends *"Within six months, a pilot AI feature... should be live and measurable, with a governance cadence established and an executive dashboard tracking outcomes."* (page 2)

Here's how AssuredAI gets there for a healthcare client:

### Month 1 — Audit and Foundation (Pillars 1-3, 11)
- AI Brand Visibility Audit (existing assessment service)
- Internal AI footprint inventory
- Stand up infrastructure (HIPAA-eligible managed)
- BAA execution with Anthropic, Voyage AI
- Stand up AI Governance Committee with first meeting

### Month 2 — Pilot Implementation (Pillars 4-9)
- Deploy AssuredAI to staging environment
- Ingest client's vetted source library + curated public sources
- Configure brand voice (chatbot self-introduction, disclaimers, visual identity)
- Wire up rapid rollback infrastructure
- Wire up APM and uptime monitoring
- Connect to headless WordPress (or migrate to headless if needed)

### Month 3 — Internal QA (Pillars 7-9)
- Internal-only deployment for staff testing
- Hand-vetted top 100 patient questions
- Editorial team trains chatbot via source library curation
- Compliance team reviews audit log structure
- Iterate on UX based on staff feedback

### Month 4 — Limited Pilot Launch (Pillar 10)
- Launch to a single service line (e.g., diabetes patient education)
- Helpful/unhelpful voting collected from day 1
- First quality dashboard review
- First governance committee review

### Month 5 — Iterate and Expand (Pillars 10, 12)
- Expand to a second service line based on Month 4 learnings
- Refine source library based on "I don't know" patterns
- First monthly exec report
- Adjust UX based on user feedback patterns

### Month 6 — Full Pilot Live (all pillars)
- Full pilot live across multiple service lines
- Monthly governance cadence established
- Executive dashboard in production
- Quarterly external review scheduled
- Plan for next pilot service or feature

---

## Implementation status summary

```
Pillar 1  Secure Managed Infrastructure       🟦 Architected
Pillar 2  Enterprise-Grade Security           🟦 Architected
Pillar 3  Scalable, Compliant Infrastructure  🟦 Architected
Pillar 4  Rapid Rollback                      📋 Documented
Pillar 5  Real-Time Performance Monitoring    🟦 Architected
Pillar 6  Headless Architecture               ✅ Built
Pillar 7  Essential AI Features (Chatbot)     ✅ Built  ← THE PILOT
Pillar 8  UX: Clear Labeling                  ✅ Built
Pillar 9  Human-in-the-Loop Workflows         ✅ Built
Pillar 10 User Analytics & Feedback Loops     ✅ Built
Pillar 11 Ongoing Oversight                   📋 Documented
Pillar 12 Outcome and Data-Driven Reporting   ✅ Built

Built:        6 / 12
Architected:  4 / 12
Documented:   2 / 12
```

The first pilot is built end-to-end. The framework around it is documented. Together, this is a six-month productization roadmap from white paper to deployed product.
