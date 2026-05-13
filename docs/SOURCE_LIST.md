# AssuredAI — Source Library (Healthcare Scenario)

The vetted source library is the foundation of governance. AssuredAI cites only from these sources. Anything outside this list returns "I don't have a verified source for that."

This list is curated for the **healthcare scenario** of the POC. Each source is selected for:

1. **Authority** — issued by an organization a covered entity would accept as authoritative (CDC, FDA, NIH, peer-reviewed bodies, professional associations, or a real-world healthcare publisher)
2. **License** — public domain (US government works), Creative Commons, or explicitly permissive terms
3. **Stability** — content unlikely to disappear or be substantially rewritten
4. **Demo coverage** — collectively the sources support the demo questions (diabetes, hypertension, mental health, vaccination)

## Government / public domain sources (US federal)

US government works are public domain (17 U.S.C. § 105). No license restrictions on reuse with attribution.

| # | Organization | Title / Topic | URL |
|---|---|---|---|
| 1 | CDC | Diabetes — Living With | https://www.cdc.gov/diabetes/living-with/ |
| 2 | CDC | Diabetes — Healthy Eating | https://www.cdc.gov/diabetes/healthy-eating/ |
| 3 | CDC | High Blood Pressure — About | https://www.cdc.gov/high-blood-pressure/about/ |
| 4 | CDC | High Blood Pressure — Prevention | https://www.cdc.gov/high-blood-pressure/prevention/ |
| 5 | CDC | Mental Health — Coping with Stress | https://www.cdc.gov/mentalhealth/cope-with-stress/ |
| 6 | CDC | Vaccines — Schedules | https://www.cdc.gov/vaccines/schedules/ |
| 7 | CDC | Heart Disease — Prevention | https://www.cdc.gov/heart-disease/prevention/ |
| 8 | FDA | Drug Labeling — Patient Counseling Information | https://www.fda.gov/drugs/laws-acts-and-rules/regulations-and-policies-and-procedures-pharmaceutical-quality |
| 9 | FDA | Dietary Supplements — Information for Consumers | https://www.fda.gov/food/dietary-supplements |
| 10 | NIH/NIDDK | Diabetes — What is Type 2 | https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/type-2-diabetes |
| 11 | NIH/NIDDK | Diabetes — Diet, Eating, and Physical Activity | https://www.niddk.nih.gov/health-information/diabetes/overview/diet-eating-physical-activity |
| 12 | NIH/NHLBI | High Blood Pressure — DASH Eating Plan | https://www.nhlbi.nih.gov/education/dash-eating-plan |
| 13 | NIH/NIMH | Depression — Patient Information | https://www.nimh.nih.gov/health/topics/depression |
| 14 | HHS / 988 | 988 Suicide & Crisis Lifeline — How It Works | https://988lifeline.org/how-we-can-all-prevent-suicide/ |

## Professional associations (permissive use for patient education)

| # | Organization | Title / Topic | URL | License notes |
|---|---|---|---|---|
| 15 | American Diabetes Association | Standards of Care 2025 — Lifestyle Management (Section 5) | https://diabetesjournals.org/care/issue/48/Supplement_1 | Open access; cite-and-link standard |
| 16 | American Heart Association | High Blood Pressure — Lifestyle Changes | https://www.heart.org/en/health-topics/high-blood-pressure | Patient education content; cite-and-link |
| 17 | American Cancer Society | Diet and Physical Activity Guidelines | https://www.cancer.org/healthy/eat-healthy-get-active.html | Cite-and-link |
| 18 | ACOG (Obstetrics & Gynecology) | Patient Education FAQs | https://www.acog.org/womens-health/faqs | Patient education |
| 19 | AAP (Pediatrics) | HealthyChildren — Patient Education | https://www.healthychildren.org/ | Patient education |

## Peer-reviewed (open access)

| # | Source | Topic | URL | License |
|---|---|---|---|---|
| 20 | KFF Health News | Healthcare research and policy summaries | https://kffhealthnews.org/ | CC-BY-NC-ND |
| 21 | NEJM (open-access selections) | Clinical practice articles (open) | https://www.nejm.org/ | Per article |
| 22 | PubMed Central — Open Access Subset | Selected articles on T2D management | https://www.ncbi.nlm.nih.gov/pmc/about/intro/ | Per article |

## Demo client-shaped sources (real-world healthcare publishers, public content)

These are public-facing pages from real healthcare publishers. We use them to make the demo feel grounded in production-style content. Public-facing, cite-and-link, no PHI.

| # | Publisher | Topic | URL |
|---|---|---|---|
| 23 | Cleveland Clinic Health Library | Type 2 diabetes overview | https://my.clevelandclinic.org/health/diseases |
| 24 | Mayo Clinic — Patient Care | Diabetes patient education | https://www.mayoclinic.org/diseases-conditions/type-2-diabetes |
| 25 | Stanford Medicine | Patient education portal samples | https://stanfordhealthcare.org/medical-conditions.html |
| 26 | Harvard T.H. Chan School of Public Health | Nutrition Source — Healthy Eating Plate | https://www.hsph.harvard.edu/nutritionsource/ |
| 27 | KFF | Latest health policy briefs | https://www.kff.org/ |

## Synthetic "Hospital" content (for demo only)

To demonstrate the white paper's example query *"What are the visiting hours and COVID precautions?"* (page 16), we include a small synthetic hospital corpus with clearly fabricated organization names. This material is generated specifically for the POC, marked as such in the source library UI, and used only for demo of mixed-source retrieval (combining authoritative sources + a hypothetical client's own content).

| # | Document | Purpose |
|---|---|---|
| 28 | "Memorial Hospital Visitor Policy" (synthetic) | Demonstrates retrieval over an organization's own published policies |
| 29 | "Memorial Hospital Patient Rights" (synthetic) | Demonstrates source-grounded chatbot answers |
| 30 | "Memorial Hospital — About Our Endocrinology Team" (synthetic) | Demonstrates contextually-aware answers |

## Government scenario (separate corpus, ~15 sources)

The POC also ships a government scenario. Sources tagged with `scenario='government'` and not visible to the healthcare scenario:

- CalMatters — public legislative coverage 
- CA.gov — Health & Human Services overviews
- White House — recent executive orders (public domain)
- Federal Register — selected rules
- CA DMV — public rule summaries 

## License & attribution policy

Every chunk in `source_chunks` retains:
- The source URL
- The source organization
- The publication or last-update date
- The applicable license note

Every cited response in the chat UI links back to the source URL. No content is reproduced beyond what is necessary to answer the user's question, and answers always provide a "view source" link.

For pages with explicit Terms of Use restricting AI use, we do not include them. For pages with no license statement, we follow standard fair-use principles for educational and informational reuse, and we link back rather than reproduce.

## Re-ingestion cadence

- Government sources: weekly (CDC, FDA, NIH update guidance regularly)
- Professional associations: monthly
- Synthetic hospital content: as edited
- All chunks include `ingested_at` timestamp; the operator console flags chunks older than 90 days as candidates for re-ingestion.

## Curation governance

In production, the source library would be governed by the AI Governance Committee per the white paper (page 19). For the POC:
- Source list managed in this document, mirrored in the operator console
- Soft-delete via `is_active = false` (audit log retains history of what was retrievable when)
- Add/remove operations in the operator console are logged to `audit_log` with a separate `outcome` value (`source_added`, `source_deactivated`)
