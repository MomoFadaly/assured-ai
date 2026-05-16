/**
 * Token pricing — USD per million tokens.
 *
 * Public list prices as of mid-2026. Adjust here; the cost-dashboard
 * picks up the change on next call. Numbers are MEANT to be conservative
 * upper bounds — actual invoice prices vary by region and committed-use
 * discount. Operators with enterprise contracts override via env, or we
 * can layer a per-tenant override table later.
 *
 * For self-host / Ollama deployments cost is GPU-time, not API-spend.
 * We return 0 for those calls and the dashboard labels the row as
 * "on-prem (no $ tracked)" so operators don't misread zero as missing data.
 */

export interface PriceQuote {
  /** USD per million input tokens. */
  inputPerMillion: number;
  /** USD per million output tokens. */
  outputPerMillion: number;
}

// Anthropic Claude — `model` value as returned by the API.
const ANTHROPIC_PRICES: Record<string, PriceQuote> = {
  // Generic match keys
  'claude-sonnet-4-5': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-sonnet-4-6': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-sonnet-4-7': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-haiku-4-5': { inputPerMillion: 0.8, outputPerMillion: 4.0 },
  'claude-opus-4-7': { inputPerMillion: 15.0, outputPerMillion: 75.0 },
};

// Azure OpenAI list prices — deployment names vary per workspace; we
// fingerprint by the canonical OpenAI model the deployment runs.
const OPENAI_PRICES: Record<string, PriceQuote> = {
  'gpt-4o': { inputPerMillion: 5.0, outputPerMillion: 15.0 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4.1': { inputPerMillion: 4.0, outputPerMillion: 16.0 },
  'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
};

// Voyage AI — embeddings priced per million input tokens.
const VOYAGE_PRICES: Record<string, PriceQuote> = {
  'voyage-3': { inputPerMillion: 0.12, outputPerMillion: 0 },
  'voyage-3-lite': { inputPerMillion: 0.02, outputPerMillion: 0 },
  'voyage-3-large': { inputPerMillion: 0.18, outputPerMillion: 0 },
};

export function lookupPrice(provider: string, model: string): PriceQuote | null {
  const m = (model ?? '').toLowerCase();
  const matchOne = (table: Record<string, PriceQuote>): PriceQuote | null => {
    if (table[m]) return table[m]!;
    // Prefix match — Anthropic models have date suffixes like
    // `claude-sonnet-4-5-20251029` we want to map to `claude-sonnet-4-5`.
    for (const key of Object.keys(table)) {
      if (m.startsWith(key)) return table[key]!;
    }
    return null;
  };

  switch (provider) {
    case 'anthropic':
      return matchOne(ANTHROPIC_PRICES);
    case 'azure-openai':
    case 'openai':
      return matchOne(OPENAI_PRICES);
    case 'voyage':
      return matchOne(VOYAGE_PRICES);
    case 'ollama':
      return null; // self-host, GPU-time not tracked here
    default:
      return null;
  }
}

/**
 * Compute cost in micro-USD (1 USD = 1_000_000). Returns 0 when no
 * price is known — the dashboard surfaces unknown-cost calls as a
 * separate column so operators can investigate (e.g. brand-new model
 * name we haven't priced yet).
 */
export function estimateCostMicroUsd(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = lookupPrice(provider, model);
  if (!price) return 0;
  // Micro-USD = (tokens / 1e6) * (USD per million) * 1e6 = tokens * USD per million.
  // (i.e. the per-million unit cancels the /1e6 then we *1e6 to micro-USD.)
  const inCost = inputTokens * price.inputPerMillion;
  const outCost = outputTokens * price.outputPerMillion;
  return Math.round(inCost + outCost);
}
