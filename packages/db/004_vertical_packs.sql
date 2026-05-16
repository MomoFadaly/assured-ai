-- AssuredAI Migration 004 — Vertical packs (the keystone)
--
-- Replaces the hardcoded `scenario_t` enum (healthcare | government) with
-- a flexible JSONB pack registry. Each pack defines its own:
--   - Disclaimer canonical text + detection regexes
--   - Presidio recognizer set (HIPAA Safe Harbor vs PCI vs SOX vs FERPA)
--   - Red-flag rules (medical emergencies vs financial fraud vs IEP triggers)
--   - Draft voice prompt (clinical vs financial vs legal vs policy)
--   - Retention days (HIPAA 6y, SOX 7y, FedRAMP variable, GDPR by purpose)
--   - Default similarity threshold, top-K
--   - Compliance framework label + reference URLs (for the audit-export PDF)
--
-- Migration strategy is ADDITIVE — the old `scenario_t` columns stay so the
-- audit hash-chain canonical text remains unbroken. New code reads
-- `vertical_pack_id` (FK to vertical_packs). Seed inserts cover the two
-- existing scenarios plus finance + legal so the platform ships
-- multi-vertical on day one.
--
-- IDEMPOTENT — safe to re-run.

-- ============================================================
-- VERTICAL_PACKS — the registry
-- ============================================================
CREATE TABLE IF NOT EXISTS vertical_packs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,        -- 'healthcare', 'finance', etc.
  name           TEXT NOT NULL,
  version        TEXT NOT NULL DEFAULT '1.0.0',
  description    TEXT,
  config         JSONB NOT NULL,              -- see lib/packs/types.ts for shape
  is_active      BOOLEAN NOT NULL DEFAULT true,
  is_built_in    BOOLEAN NOT NULL DEFAULT false,  -- protect seed packs from accidental deletion
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vertical_packs_active ON vertical_packs (is_active, slug);

-- ============================================================
-- Add vertical_pack_id (nullable for now; backfill below; then NOT NULL)
-- ============================================================
ALTER TABLE sources             ADD COLUMN IF NOT EXISTS vertical_pack_id UUID REFERENCES vertical_packs(id);
ALTER TABLE audit_log           ADD COLUMN IF NOT EXISTS vertical_pack_id UUID REFERENCES vertical_packs(id);
ALTER TABLE escalations         ADD COLUMN IF NOT EXISTS vertical_pack_id UUID REFERENCES vertical_packs(id);
ALTER TABLE monitored_sites     ADD COLUMN IF NOT EXISTS vertical_pack_id UUID REFERENCES vertical_packs(id);
ALTER TABLE voice_profiles      ADD COLUMN IF NOT EXISTS vertical_pack_id UUID REFERENCES vertical_packs(id);

CREATE INDEX IF NOT EXISTS idx_sources_pack          ON sources (vertical_pack_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_pack        ON audit_log (vertical_pack_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitored_sites_pack  ON monitored_sites (vertical_pack_id);

-- ============================================================
-- SEED PACKS
-- ============================================================
-- Healthcare — the existing scenario, ported verbatim into pack shape.
INSERT INTO vertical_packs (slug, name, description, version, is_built_in, config)
VALUES (
  'healthcare',
  'Healthcare publisher',
  'HIPAA-aware editorial verification for patient-facing health content.',
  '1.0.0',
  true,
  '{
    "slug": "healthcare",
    "name": "Healthcare publisher",
    "icon": "stethoscope",
    "compliance_framework": "HIPAA",
    "regulatory_references": [
      { "name": "HIPAA Privacy Rule",  "url": "https://www.hhs.gov/hipaa/for-professionals/privacy/" },
      { "name": "HIPAA Security Rule", "url": "https://www.hhs.gov/hipaa/for-professionals/security/" },
      { "name": "FDA AI/ML guidance",  "url": "https://www.fda.gov/medical-devices/software-medical-device-samd/" }
    ],
    "disclaimer": {
      "canonical": "This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified clinician about your individual health needs.",
      "detection_patterns": [
        "not\\s+a?\\s*substitute\\s+for\\s+(professional\\s+)?(medical|clinical)\\s+(advice|guidance)",
        "consult\\s+(a\\s+|your\\s+)?(qualified\\s+)?(clinician|doctor|health\\s*care\\s*provider|physician)",
        "educational\\s+purposes\\s+only",
        "is\\s+not\\s+intended\\s+to\\s+(replace|substitute)"
      ]
    },
    "draft_voice_prompt": "You are an editorial assistant for a healthcare publisher. Your audience is patients and members of the public seeking trustworthy health information. Write at a sixth-grade reading level by default. Be warm, clear, and specific. Never give clinical advice; direct readers to consult a qualified clinician.",
    "recognizers": [
      "PHONE_NUMBER", "EMAIL_ADDRESS", "US_SSN", "PERSON",
      "US_DRIVER_LICENSE", "CREDIT_CARD", "MEDICAL_LICENSE",
      "IP_ADDRESS", "MRN", "HEALTH_PLAN_ID"
    ],
    "red_flag_rules": [
      { "category": "cardiac",              "severity": "emergency", "patterns": ["\\bchest pain(s|ful)?\\b","\\bheart attack\\b","\\bcrushing pressure\\b.{0,40}\\b(chest|sternum)\\b","\\bdifficulty breathing\\b","\\bcan(?:''?| no)t breathe\\b"], "escalation": "Call 911 immediately. Stay on the line with the dispatcher. Do not drive yourself to the hospital." },
      { "category": "mental_health_crisis", "severity": "emergency", "patterns": ["\\b(?:want|wanting|going) to (?:kill|end|hurt|harm) (?:my ?self|me)\\b","\\b(?:suicidal|suicide)\\b","\\bsuicide plan\\b","\\b(?:no point|don''?t want to live|want to die)\\b","\\bself[- ]harm\\b"], "escalation": "Call or text 988 — Suicide & Crisis Lifeline (24/7). If in immediate danger, call 911." },
      { "category": "overdose",             "severity": "emergency", "patterns": ["\\b(?:overdose|overdosed)\\b","\\btook too (?:many|much)\\b","\\baccident(?:al(?:ly)?)? ingest(?:ion|ed)?\\b","\\bswallowed (?:bleach|poison|chemicals)\\b"], "escalation": "Call 1-800-222-1222 — Poison Help. If unconscious or not breathing, call 911." },
      { "category": "severe_bleeding",      "severity": "emergency", "patterns": ["\\bbleeding heavily\\b","\\bcan''?t stop bleeding\\b","\\bgushing blood\\b"], "escalation": "Call 911 immediately." },
      { "category": "stroke",               "severity": "emergency", "patterns": ["\\bface (?:droop|drooping|fell)\\b","\\bsudden(?:ly)? (?:can''?t|cannot) (?:speak|talk|move)\\b","\\bhaving a stroke\\b","\\barm (?:weakness|numb)\\b.{0,40}\\b(?:speech|talk)\\b"], "escalation": "Call 911 immediately. Note the exact time symptoms started — clinicians need it." },
      { "category": "anaphylaxis",          "severity": "emergency", "patterns": ["\\banaphylaxis\\b","\\bsevere allergic reaction\\b","\\b(?:throat|tongue) swelling\\b","\\bcan''?t breathe\\b.{0,40}\\ballerg(?:y|ic|ies)\\b"], "escalation": "Use an epinephrine auto-injector if available, then call 911." }
    ],
    "retention_days": 2190,
    "default_min_similarity": 0.55,
    "default_top_k": 8,
    "max_unsourced_paragraphs_publishable": 1,
    "max_pii_publishable": 0
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      version = EXCLUDED.version,
      is_built_in = EXCLUDED.is_built_in,
      config = EXCLUDED.config,
      updated_at = NOW();

-- Government
INSERT INTO vertical_packs (slug, name, description, version, is_built_in, config)
VALUES (
  'government',
  'Government & civic information',
  'Plain-language, policy-aware verification for state, federal, and municipal publishers.',
  '1.0.0',
  true,
  '{
    "slug": "government",
    "name": "Government & civic information",
    "icon": "landmark",
    "compliance_framework": "FedRAMP / Section 508",
    "regulatory_references": [
      { "name": "FedRAMP",                     "url": "https://www.fedramp.gov" },
      { "name": "Section 508",                 "url": "https://www.section508.gov" },
      { "name": "Plain Writing Act",           "url": "https://www.plainlanguage.gov" }
    ],
    "disclaimer": {
      "canonical": "This information is provided for general reference. Policies and procedures may change; consult the official source for the most current information before making decisions.",
      "detection_patterns": [
        "consult\\s+(the\\s+)?official\\s+(source|website|guidance)",
        "policies\\s+and\\s+procedures\\s+may\\s+change",
        "for\\s+(general|informational)\\s+(reference|purposes)"
      ]
    },
    "draft_voice_prompt": "You are an editorial assistant for a government information publisher. Your audience is members of the public seeking accurate information about policy, programs, and procedures. Be plain-spoken, neutral, and precise.",
    "recognizers": [
      "PHONE_NUMBER", "EMAIL_ADDRESS", "US_SSN", "PERSON",
      "US_DRIVER_LICENSE", "IP_ADDRESS", "US_PASSPORT", "US_BANK_NUMBER"
    ],
    "red_flag_rules": [
      { "category": "mental_health_crisis", "severity": "emergency", "patterns": ["\\b(?:want|going) to (?:kill|end|hurt|harm) (?:my ?self|me)\\b","\\b(?:suicidal|suicide)\\b","\\bself[- ]harm\\b"], "escalation": "Call or text 988 — Suicide & Crisis Lifeline (24/7). If in immediate danger, call 911." },
      { "category": "domestic_violence",    "severity": "emergency", "patterns": ["\\b(domestic violence|being beaten|partner is hurting)\\b"], "escalation": "Call 1-800-799-7233 — National Domestic Violence Hotline. If in immediate danger, call 911." },
      { "category": "missing_child",        "severity": "emergency", "patterns": ["\\bmissing child\\b","\\bchild abducted\\b","\\bAMBER alert\\b"], "escalation": "Call 911 and 1-800-THE-LOST (National Center for Missing & Exploited Children)." }
    ],
    "retention_days": 2555,
    "default_min_similarity": 0.55,
    "default_top_k": 8,
    "max_unsourced_paragraphs_publishable": 1,
    "max_pii_publishable": 0
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      version = EXCLUDED.version,
      is_built_in = EXCLUDED.is_built_in,
      config = EXCLUDED.config,
      updated_at = NOW();

-- Finance (NEW — was never a scenario)
INSERT INTO vertical_packs (slug, name, description, version, is_built_in, config)
VALUES (
  'finance',
  'Financial services',
  'SEC / FINRA / SOX / PCI-DSS aware verification for financial publishers, banks, and advisor content.',
  '1.0.0',
  true,
  '{
    "slug": "finance",
    "name": "Financial services",
    "icon": "landmark",
    "compliance_framework": "SEC / FINRA / SOX / PCI-DSS",
    "regulatory_references": [
      { "name": "SEC Marketing Rule",       "url": "https://www.sec.gov/investment/marketing-rule" },
      { "name": "FINRA Communications",     "url": "https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210" },
      { "name": "Sarbanes-Oxley Act",       "url": "https://www.congress.gov/bill/107th-congress/house-bill/3763" },
      { "name": "PCI-DSS",                  "url": "https://www.pcisecuritystandards.org" }
    ],
    "disclaimer": {
      "canonical": "This material is for informational purposes only and does not constitute investment advice, tax advice, or a recommendation to buy or sell any security. Past performance is not indicative of future results. Consult a qualified financial professional regarding your individual circumstances.",
      "detection_patterns": [
        "not\\s+(?:investment|tax|legal)\\s+advice",
        "does\\s+not\\s+constitute\\s+(?:investment|tax|legal)\\s+advice",
        "past\\s+performance\\s+is\\s+not\\s+indicative",
        "consult\\s+(a|your)\\s+(qualified\\s+)?(financial|investment|tax)\\s+(advisor|professional)"
      ]
    },
    "draft_voice_prompt": "You are an editorial assistant for a financial services publisher. Your audience is retail investors and consumers seeking accurate information about markets, products, and personal finance. Be precise, neutral, and risk-disclosing. Never recommend specific securities or trades — direct readers to a qualified financial professional. Always note when figures are historical, not predictive.",
    "recognizers": [
      "PHONE_NUMBER", "EMAIL_ADDRESS", "US_SSN", "PERSON",
      "CREDIT_CARD", "US_BANK_NUMBER", "IBAN_CODE", "IP_ADDRESS",
      "US_ITIN", "US_PASSPORT"
    ],
    "red_flag_rules": [
      { "category": "fraud_disclosure",     "severity": "urgent", "patterns": ["\\b(guaranteed return|risk[- ]free investment|can''?t lose)\\b","\\b(?:double|triple) your money\\b"], "escalation": "Flag for compliance review — language pattern suggests an unregistered offering or fraudulent claim." },
      { "category": "market_manipulation",  "severity": "urgent", "patterns": ["\\b(pump and dump|insider tip|inside information)\\b","\\bbefore the announcement\\b"], "escalation": "Flag for compliance review — content may suggest market-abuse activity." },
      { "category": "suicide_financial",    "severity": "emergency", "patterns": ["\\b(?:lost everything|going to kill myself|end my life)\\b.{0,100}\\b(?:debt|gambling|broke|bankrupt)\\b"], "escalation": "Call or text 988 — Suicide & Crisis Lifeline. Financial Counseling Association of America: 1-800-450-1794." }
    ],
    "retention_days": 2555,
    "default_min_similarity": 0.6,
    "default_top_k": 8,
    "max_unsourced_paragraphs_publishable": 0,
    "max_pii_publishable": 0
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      version = EXCLUDED.version,
      is_built_in = EXCLUDED.is_built_in,
      config = EXCLUDED.config,
      updated_at = NOW();

-- Legal (NEW)
INSERT INTO vertical_packs (slug, name, description, version, is_built_in, config)
VALUES (
  'legal',
  'Legal publisher',
  'ABA Model Rules + privilege-aware verification for legal publishers, firm websites, and consumer legal content.',
  '1.0.0',
  true,
  '{
    "slug": "legal",
    "name": "Legal publisher",
    "icon": "scale",
    "compliance_framework": "ABA Model Rules of Professional Conduct",
    "regulatory_references": [
      { "name": "ABA Model Rule 7.1 (Communications)", "url": "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_7_1_communications_concerning_a_lawyer_s_services/" },
      { "name": "ABA Model Rule 1.6 (Confidentiality)", "url": "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_6_confidentiality_of_information/" }
    ],
    "disclaimer": {
      "canonical": "This content is for general informational purposes only and does not constitute legal advice. Reading this material does not create an attorney-client relationship. Consult a qualified attorney about your specific situation.",
      "detection_patterns": [
        "does\\s+not\\s+constitute\\s+legal\\s+advice",
        "not\\s+(an\\s+)?attorney[- ]client\\s+relationship",
        "(consult|seek)\\s+(a\\s+|your\\s+|qualified\\s+)?attorney",
        "general\\s+informational\\s+purposes\\s+only"
      ]
    },
    "draft_voice_prompt": "You are an editorial assistant for a legal publisher. Your audience is the general public seeking accurate information about legal topics. Be precise but accessible — use plain language, then introduce the legal term. Never give specific legal advice; direct readers to a qualified attorney for their situation. Distinguish jurisdictions where it matters (e.g. ''under federal law'' vs ''in California'').",
    "recognizers": [
      "PHONE_NUMBER", "EMAIL_ADDRESS", "US_SSN", "PERSON",
      "US_DRIVER_LICENSE", "IP_ADDRESS", "US_PASSPORT"
    ],
    "red_flag_rules": [
      { "category": "imminent_harm",        "severity": "emergency", "patterns": ["\\b(going to|about to)\\s+(hurt|harm|kill)\\s+(someone|myself|him|her|them)\\b"], "escalation": "Call 911 if there is imminent harm. Confidentiality exceptions under ABA Model Rule 1.6(b) may apply — consult firm counsel." },
      { "category": "domestic_violence",    "severity": "emergency", "patterns": ["\\bdomestic violence\\b","\\bbeing abused\\b","\\bpartner is hurting (me|us|the children)\\b"], "escalation": "Call 1-800-799-7233 — National Domestic Violence Hotline. If immediate danger, call 911." },
      { "category": "privileged_disclosure","severity": "urgent",    "patterns": ["\\b(privileged|attorney[- ]client)\\b.{0,40}\\b(don''?t share|confidential)\\b"], "escalation": "Flag for review — content may reference privileged communications inappropriately for public publication." }
    ],
    "retention_days": 3650,
    "default_min_similarity": 0.6,
    "default_top_k": 8,
    "max_unsourced_paragraphs_publishable": 0,
    "max_pii_publishable": 0
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      version = EXCLUDED.version,
      is_built_in = EXCLUDED.is_built_in,
      config = EXCLUDED.config,
      updated_at = NOW();

-- ============================================================
-- BACKFILL — set vertical_pack_id on existing rows from scenario_t
-- ============================================================
UPDATE sources s
   SET vertical_pack_id = vp.id
  FROM vertical_packs vp
 WHERE s.vertical_pack_id IS NULL
   AND vp.slug = s.scenario::text;

UPDATE audit_log a
   SET vertical_pack_id = vp.id
  FROM vertical_packs vp
 WHERE a.vertical_pack_id IS NULL
   AND vp.slug = a.scenario::text;

UPDATE monitored_sites ms
   SET vertical_pack_id = vp.id
  FROM vertical_packs vp
 WHERE ms.vertical_pack_id IS NULL
   AND vp.slug = ms.scenario::text;

-- escalations + voice_profiles back-fill via audit_log join (escalations) or by
-- defaulting unset rows to healthcare (voice_profiles).
UPDATE escalations e
   SET vertical_pack_id = a.vertical_pack_id
  FROM audit_log a
 WHERE e.audit_log_id = a.id
   AND e.vertical_pack_id IS NULL;

UPDATE voice_profiles vp
   SET vertical_pack_id = COALESCE(
        (SELECT id FROM vertical_packs WHERE slug = vp.scenario LIMIT 1),
        (SELECT id FROM vertical_packs WHERE slug = 'healthcare' LIMIT 1)
       )
 WHERE vertical_pack_id IS NULL;

-- ============================================================
-- DONE
-- ============================================================
