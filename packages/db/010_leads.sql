-- AssuredAI Migration 010 — Lead capture extension
--
-- `contact_leads` is the inbox for prospects who arrive via the
-- marketing site (existing /contact form + new /book-a-demo and
-- /talk-to-sales forms). This migration:
--
--   1. Adds columns for the new lead-capture surfaces:
--      - lead_type (book_a_demo | talk_to_sales | contact)
--      - pack_interest, plan_interest, volume_estimate
--      - requested_meeting_time (free-text — we don't ship a calendar yet)
--      - utm_source / utm_medium / utm_campaign for attribution
--   2. Adds operational fields the inbox UI needs:
--      - status (new | contacted | qualified | closed_won | closed_lost)
--      - assigned_to (operator user id)
--      - notes (free-text scratchpad)
--      - resolved_at
--   3. Backfills existing rows with lead_type='contact' so they don't
--      look like a different table.
--
-- All additive, all idempotent.

-- Extend the notification event enum so admins can subscribe channels
-- to the new lead-capture event kind. `ADD VALUE IF NOT EXISTS` is
-- transaction-safe on Postgres 12+.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
     WHERE enumlabel = 'inbound_lead'
       AND enumtypid = 'notification_event_kind_t'::regtype
  ) THEN
    ALTER TYPE notification_event_kind_t ADD VALUE 'inbound_lead';
  END IF;
END $$;

ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS lead_type              TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS pack_interest          TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS plan_interest          TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS volume_estimate        TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS requested_meeting_time TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS utm_source             TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS utm_medium             TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS utm_campaign           TEXT;

ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'new';
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Backfill the pre-existing /contact rows. After this migration every
-- row has a lead_type so the admin inbox can filter cleanly.
UPDATE contact_leads SET lead_type = 'contact' WHERE lead_type IS NULL;

-- Useful indexes for the admin inbox + dedupe.
CREATE INDEX IF NOT EXISTS idx_contact_leads_lead_type
  ON contact_leads (lead_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_leads_status
  ON contact_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_leads_email_lower
  ON contact_leads (LOWER(email));
