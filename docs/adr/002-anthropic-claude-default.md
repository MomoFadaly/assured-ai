# ADR-002: Anthropic Claude as Default Model (vs. OpenAI)

**Status:** Accepted
**Date:** 2026-05-06
**Decider:** Project author

## Context

AssuredAI needs an LLM for synthesis (Step 6 of the request lifecycle) and a smaller, faster model for red-flag classification (Step 2). The healthcare and government contexts demand:
- Strong refusal behavior — the model must NOT make up answers when sources are insufficient
- Reliable JSON output following a schema
- Strong instruction-following for citation enforcement
- A vendor with a HIPAA-eligible offering and clear BAA path

The framework is provider-agnostic, but a default has to be chosen.

## Decision

**Default to Anthropic Claude** for the POC (Sonnet 4.6 for synthesis, Haiku 4.5 for red-flag classification and PII validation). Make the model layer pluggable — clients in regulated industries can swap to Azure OpenAI (which has a clearer HIPAA BAA) or to a locally hosted model via Ollama (zero data egress).

## Consequences

### Positive
- **Strongest refusal behavior in the current model landscape.** Empirically, Claude is more willing to say "I don't know" than GPT-4 family models, which is the single most important behavior for AssuredAI.
- **Native JSON schema constraints** via tool-use / structured output API — citation validation is reliable at the schema level, not just prompt level.
- **Long context window** — useful for retrieval over long source chunks (medical research, lengthy patient education materials).
- **Provider abstraction is preserved.** Default is Claude, but `LLMProvider` interface in `packages/core/orchestration/llm.ts` allows swap.

### Negative
- **Anthropic's BAA story is less mature than Azure OpenAI's** as of mid-2026. For HIPAA-required production deployments, Azure OpenAI may be preferred. We document this as a deployment-time choice in [COMPLIANCE.md](../COMPLIANCE.md) and [DEPLOYMENT.md].
- **Single-vendor dependency for the demo.** We mitigate by maintaining the abstraction layer and shipping a CI test that runs the synthesis loop against both Claude and Azure OpenAI.

## Alternatives Considered

### Azure OpenAI
- Pros: clearest HIPAA BAA in the industry; Microsoft has the largest healthcare enterprise footprint
- Cons: refusal behavior is weaker out-of-box; structured output requires more prompting work; latency varies more
- Status: **kept as the recommended provider for HIPAA-required deployments.** Toggle via env: `LLM_PROVIDER=azure-openai`.

### OpenAI direct
- Pros: most familiar; broad ecosystem
- Cons: BAA only via Azure; refusal behavior weaker; pricing higher than equivalent Azure
- Rejected: no advantages over Azure OpenAI for our use case.

### Google Gemini
- Pros: HIPAA BAA via Google Cloud; competitive pricing
- Cons: less mature instruction-following for our specific use case; refusal behavior under-tested
- Status: kept as a config option; not default.

### Locally hosted (Ollama, etc.)
- Pros: zero data egress; no BAA needed
- Cons: smaller models have weaker refusal and JSON-output behavior; ops cost
- Status: kept as a config option for the most regulated clients (e.g., on-prem federal deployments).

## Compliance implications

The current best-practice for HIPAA in 2026 is **Azure OpenAI** (with a Microsoft BAA covering the AI service) or **on-prem Ollama**. Anthropic's BAA program is rolling out but coverage varies. Per [COMPLIANCE.md](../COMPLIANCE.md), the model provider is a deployment-time choice; the architecture supports any of these.

For the POC demo, Anthropic Claude is the default because the demo doesn't process real PHI. For a production healthcare deployment, the deployment team should configure `LLM_PROVIDER=azure-openai` or `LLM_PROVIDER=ollama-local` based on the client's compliance posture.

## Verification

- Synthesis behavior tests in `packages/core/orchestration/__tests__/` cover both Claude and Azure OpenAI back-ends.
- Refusal-behavior fixtures: 20 hand-curated edge cases that should return "I don't know"; both backends must pass before deploy.
