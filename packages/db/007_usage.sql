-- AssuredAI Migration 007 — Usage metering + cost rollup
--
-- Enterprise procurement always asks "what's my run-rate?" — we answer
-- with a per-call event log + a per-day-per-pack rollup. Every paid LLM
-- and embedding call writes a `usage_events` row with tokens, latency,
-- and (when we know the price) a USD cost estimate.
--
-- `usage_daily` is a denormalised rollup populated by a trigger so the
-- cost-dashboard reads are O(days × packs × providers) and don't hammer
-- the events table on every page load.
--
-- Idempotent.

DO $$ BEGIN
  CREATE TYPE usage_kind_t AS ENUM ('llm.synthesis', 'llm.classifier', 'embedding');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS usage_events (
  id                  BIGSERIAL PRIMARY KEY,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vertical_pack_id    UUID REFERENCES vertical_packs(id),
  pack_slug           TEXT,                          -- snapshot for the rollup
  kind                usage_kind_t NOT NULL,
  provider            TEXT NOT NULL,                 -- 'anthropic' | 'azure-openai' | 'ollama' | 'voyage' | 'openai'
  model               TEXT NOT NULL,
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  /** Estimated cost in millionths-of-USD. We use integer cents-of-a-cent
   *  rather than DOUBLE PRECISION to keep aggregation lossless across
   *  millions of rows. Convert in app code with `cost_micro_usd / 1e6`. */
  cost_micro_usd      BIGINT NOT NULL DEFAULT 0,
  audit_log_id        BIGINT REFERENCES audit_log(id),
  /** Free-form labels: 'monitor', 'manual_verify', 'suggest_fix', etc. */
  source              TEXT,
  api_key_id          UUID REFERENCES api_keys(id),
  latency_ms          INTEGER
);

CREATE INDEX IF NOT EXISTS idx_usage_events_occurred ON usage_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_pack     ON usage_events (vertical_pack_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_provider ON usage_events (provider, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_key      ON usage_events (api_key_id);

-- ============================================================
-- USAGE_DAILY — denormalised rollup
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_daily (
  day                 DATE NOT NULL,
  pack_slug           TEXT NOT NULL DEFAULT '',
  provider            TEXT NOT NULL,
  kind                usage_kind_t NOT NULL,
  calls               BIGINT NOT NULL DEFAULT 0,
  input_tokens        BIGINT NOT NULL DEFAULT 0,
  output_tokens       BIGINT NOT NULL DEFAULT 0,
  cost_micro_usd      BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, pack_slug, provider, kind)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_day ON usage_daily (day DESC);

CREATE OR REPLACE FUNCTION usage_event_rollup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO usage_daily
    (day, pack_slug, provider, kind, calls, input_tokens, output_tokens, cost_micro_usd)
  VALUES
    (
      DATE(NEW.occurred_at),
      COALESCE(NEW.pack_slug, ''),
      NEW.provider,
      NEW.kind,
      1,
      COALESCE(NEW.input_tokens, 0),
      COALESCE(NEW.output_tokens, 0),
      COALESCE(NEW.cost_micro_usd, 0)
    )
  ON CONFLICT (day, pack_slug, provider, kind)
  DO UPDATE SET
    calls           = usage_daily.calls + 1,
    input_tokens    = usage_daily.input_tokens + COALESCE(EXCLUDED.input_tokens, 0),
    output_tokens   = usage_daily.output_tokens + COALESCE(EXCLUDED.output_tokens, 0),
    cost_micro_usd  = usage_daily.cost_micro_usd + COALESCE(EXCLUDED.cost_micro_usd, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usage_event_rollup_trigger ON usage_events;
CREATE TRIGGER usage_event_rollup_trigger
AFTER INSERT ON usage_events
FOR EACH ROW EXECUTE FUNCTION usage_event_rollup();
