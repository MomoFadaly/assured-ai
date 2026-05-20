'use client';

/**
 * ProductArchitecture — §04 architecture exhibit.
 *
 * Modern AI-SaaS register (Snowflake / Vercel / Linear / Stripe Press).
 * Five horizontal layers, top to bottom:
 *
 *   01  Surfaces      where writers work
 *   02  Integration   how every surface connects
 *   03  Engine        the IP — 9 sequential steps
 *   04  Model layer   compute the engine calls
 *   05  Data layer    the moat
 *
 * Every keyword in the exhibit (24 total) carries a one-or-two-sentence
 * why-and-how on hover/focus, rendered as a premium editorial popover.
 * Static-first; hover-progressive. The reader scans the diagram at rest
 * and earns the depth by exploring.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const T = '220ms';

// ─────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────

type Status = 'production' | 'beta' | 'roadmap';

type Component = {
  key: string;
  label: string;
  sub?: string;
  status?: Status;
  why: string;
};

type Step = {
  num: string;
  label: string;
  why: string;
};

type Layer = {
  key: string;
  number: string;
  title: string;
  tagline: string;
  emphasis: 'neutral' | 'moat-light' | 'moat-medium' | 'moat-strong';
  kind: 'components' | 'integration' | 'engine';
  components?: Component[];
  steps?: Step[];
};

const LAYERS: Layer[] = [
  {
    key: 'surfaces',
    number: '01',
    title: 'Surfaces',
    tagline: 'Where writers work',
    emphasis: 'neutral',
    kind: 'components',
    components: [
      {
        key: 'wp',
        label: 'WordPress',
        sub: 'Block-editor plugin',
        status: 'production',
        why: 'Most regulated brands publish through WordPress. Our plugin adds a verify button directly inside the editor, so writers get inline warnings without leaving their draft.',
      },
      {
        key: 'chrome',
        label: 'Chrome ext',
        sub: 'Docs · Notion · Substack',
        status: 'beta',
        why: 'For writers who draft outside WordPress, a Chrome extension brings the same verification into Google Docs, Notion, Substack, and Medium. One install covers every editor a writer might use.',
      },
      {
        key: 'chat',
        label: '/chat verifier',
        sub: 'Web · public',
        status: 'production',
        why: 'A public web app at assuredai.online/chat. Paste any paragraph and see the nine-step result instantly. The frictionless entry point for buyers who want to test the engine before signing.',
      },
      {
        key: 'console',
        label: 'Operator console',
        sub: 'Sources · kill · escalations',
        status: 'production',
        why: 'Where the customer’s compliance team works — manage the approved-source library, monitor escalations from step 5, hold the kill switch that halts publishing across every surface. The one screen a regulator sees during an audit.',
      },
    ],
  },
  {
    key: 'integration',
    number: '02',
    title: 'Integration',
    tagline: 'How every surface connects',
    emphasis: 'moat-light',
    kind: 'integration',
    components: [
      {
        key: 'rest',
        label: 'REST API',
        why: 'The single boundary every surface flows through. Any system that ships content under the brand can call AssuredAI with a paragraph and get back the verification result plus an audit reference.',
      },
      {
        key: 'hooks',
        label: 'Webhooks',
        why: 'When something compliance needs to know about happens — kill switch tripped, red flag escalated, new audit row — we push an alert straight to whatever system the customer chooses (Slack, ServiceNow, custom). No need to poll us.',
      },
      {
        key: 'sdk',
        label: 'SDK',
        why: 'Pre-built client libraries (Node and Python first; others on request) so engineering teams can drop AssuredAI into their existing publishing pipelines, internal tools, or AI agents in minutes — not weeks.',
      },
    ],
  },
  {
    key: 'engine',
    number: '03',
    title: 'Verification engine',
    tagline: 'The IP · nine sequential steps',
    emphasis: 'moat-medium',
    kind: 'engine',
    steps: [
      {
        num: '01',
        label: 'Kill gate',
        why: 'A customer-controlled circuit breaker. If the compliance team flips the switch, every paragraph through this account halts immediately. Nothing publishes under the brand until a human releases the hold.',
      },
      {
        num: '02',
        label: 'PII redact',
        why: 'Personal identifiers — patient record numbers, account numbers, full names, addresses, the full HIPAA-protected list — are stripped from the paragraph before any AI model sees it. Models only ever read safe, redacted text.',
      },
      {
        num: '03',
        label: 'Embed lookup',
        why: 'Semantic search pulls the closest approved-source passages from the customer’s own knowledge base. The next step verifies the paragraph against those specific sources — not against whatever the AI model happened to learn during training.',
      },
      {
        num: '04',
        label: 'Fact check',
        why: 'Each claim in the paragraph is checked against the sources retrieved in step 3. Unsupported claims surface as warnings the writer can review — the engine flags issues, it never silently overrides the human.',
      },
      {
        num: '05',
        label: 'Red flag',
        why: 'Pattern detection for high-stakes content (cardiac symptoms, suicidal ideation, overdose, child safety). When a flag fires, the paragraph routes to human review and the user sees 911 / 988 links inline.',
      },
      {
        num: '06',
        label: 'Disclaimer',
        why: 'Required regulatory disclaimers auto-inject based on the topic — pharma claims get the right FDA safety language, financial advice gets the right SEC marketing-rule line, mortgage content gets the right consumer-protection language.',
      },
      {
        num: '07',
        label: 'Source cite',
        why: 'Inline citation badges link every claim back to the specific approved-source passage that supports it. The reader (and the regulator) can trace any sentence to a named document in the customer’s knowledge base.',
      },
      {
        num: '08',
        label: 'Chain write',
        why: 'Every verification is recorded in a tamper-proof log. Each entry is cryptographically linked to the one before it, so the record can’t be quietly edited or deleted — even by AssuredAI itself.',
      },
      {
        num: '09',
        label: 'Audit ship',
        why: 'Verified content plus its audit reference return to the surface that requested verification. The audit reference is forever-public and forever-verifiable, embedded in whatever the brand ultimately publishes.',
      },
    ],
  },
  {
    key: 'model',
    number: '04',
    title: 'Model layer',
    tagline: 'Compute the engine calls',
    emphasis: 'neutral',
    kind: 'components',
    components: [
      {
        key: 'llm',
        label: 'LLM providers',
        sub: 'OpenAI · Azure · Gemini · xAI · AWS · open models',
        why: 'Six AI providers plug into the engine — OpenAI, Microsoft Azure, Google Gemini, xAI, Amazon Bedrock, and open-source models running inside the customer’s own data center for environments where data can’t leave the building. Customers route which workflow uses which model.',
      },
      {
        key: 'embed',
        label: 'Embedding models',
        sub: 'Semantic search across approved sources',
        why: 'The semantic-search engine behind step 3. Embedding providers are interchangeable — when a better model lands (and one does, every few months), it slots in without any engine changes.',
      },
      {
        key: 'phi',
        label: 'PHI / PII detection',
        sub: 'Industry-tuned identifier scrubbing',
        why: 'Industrial-grade personal-data detection. Healthcare gets patient record numbers and health-plan IDs; finance gets account numbers and SSNs; the full HIPAA-protected identifier list where required. Tuned per industry.',
      },
      {
        key: 'recog',
        label: 'Vertical recognizers',
        sub: 'Industry-specific rule + claim detectors',
        why: 'Industry-specific rule detectors — FDA prescription-drug-promotion red lines, SEC investment-marketing patterns, FINRA promotional-language rules, bar-association unauthorized-practice triggers. New industries add new detectors without changing the engine.',
      },
    ],
  },
  {
    key: 'data',
    number: '05',
    title: 'Data layer',
    tagline: 'The moat · compounds with every published piece',
    emphasis: 'moat-strong',
    kind: 'components',
    components: [
      {
        key: 'corpora',
        label: 'Source corpora',
        sub: 'Per-industry · regulator-grounded',
        why: 'The customer’s approved knowledge base — regulator-grounded, industry-specific. Deepens with every customer and every new industry pack; the cross-customer aggregate becomes an asset no competitor can replicate without the same decade of customer relationships.',
      },
      {
        key: 'vectors',
        label: 'Vector index',
        sub: 'Sub-second semantic search',
        why: 'Sub-second semantic search across every approved-source passage. This is the index step 3 calls to retrieve grounding for the paragraph being verified — pulls the right sources in milliseconds.',
      },
      {
        key: 'audit',
        label: 'Tamper-proof audit',
        sub: 'Cryptographically chained · public-verifiable',
        why: 'A tamper-proof log of every verification. Cryptographic chaining makes the record immutable — a regulator (or anyone with the public proof URL) can walk the chain end-to-end and prove no entry was altered. Becomes the industry audit standard once enough customers publish through it.',
      },
      {
        key: 'config',
        label: 'Customer config',
        sub: 'Routing · kill-switch · policies',
        why: 'Routing rules (which AI model for which workflow), red-flag policies, kill-switch state, active industry preset. Sticky data — the longer a customer’s on the platform, the more switching cost accumulates here.',
      },
    ],
  },
];

const TINT: Record<Layer['emphasis'], string> = {
  neutral: 'rgba(15, 23, 41, 0.018)',
  'moat-light': 'rgba(4, 120, 87, 0.025)',
  'moat-medium': 'rgba(4, 120, 87, 0.05)',
  'moat-strong': 'rgba(4, 120, 87, 0.075)',
};
const TINT_HOVER: Record<Layer['emphasis'], string> = {
  neutral: 'rgba(15, 23, 41, 0.04)',
  'moat-light': 'rgba(4, 120, 87, 0.05)',
  'moat-medium': 'rgba(4, 120, 87, 0.08)',
  'moat-strong': 'rgba(4, 120, 87, 0.1)',
};

// ─────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────

export default function ProductArchitecture() {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-[0_1px_3px_rgba(15,23,41,0.04)]">
      {LAYERS.map((layer, i) => (
        <div key={layer.key}>
          <LayerSection
            layer={layer}
            isHovered={hoveredLayer === layer.key}
            onHover={(k) => setHoveredLayer(k)}
            isFirst={i === 0}
            isLast={i === LAYERS.length - 1}
          />
          {i < LAYERS.length - 1 ? <FlowConnector /> : null}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LayerSection
// ─────────────────────────────────────────────────────────────────────────

function LayerSection({
  layer,
  isHovered,
  onHover,
  isFirst,
  isLast,
}: {
  layer: Layer;
  isHovered: boolean;
  onHover: (k: string | null) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <section
      onMouseEnter={() => onHover(layer.key)}
      onMouseLeave={() => onHover(null)}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      aria-label={`Layer ${layer.number}: ${layer.title}`}
      style={{
        background: isHovered ? TINT_HOVER[layer.emphasis] : TINT[layer.emphasis],
        borderTop: isFirst ? 'none' : '1px solid rgba(15, 23, 41, 0.06)',
        transition: `background ${T} ${EASE}`,
      }}
    >
      <div className="px-7 py-8 lg:px-10 lg:py-10">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em]"
              style={{
                color: isHovered ? 'rgb(4, 95, 70)' : 'rgb(4, 120, 87)',
                transition: `color ${T} ${EASE}`,
              }}
            >
              {layer.number}
            </span>
            <h4
              className="font-display text-[clamp(1.05rem,1.4vw,1.25rem)] font-medium leading-tight tracking-tight text-foreground"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              {layer.title}
            </h4>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55">
            {layer.tagline}
          </span>
        </div>

        {layer.kind === 'engine' ? (
          <EngineRow steps={layer.steps!} preferUp={isLast} />
        ) : layer.kind === 'integration' ? (
          <IntegrationRow components={layer.components!} preferUp={isLast} />
        ) : (
          <ComponentRow components={layer.components!} preferUp={isLast} />
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Tooltip — the why/how popover on every keyword. Rendered via React
// portal into document.body with position:fixed so no ancestor
// overflow (e.g. the engine row's overflow-x-auto) can clip it.
// Position is computed from the trigger element's bounding rect on
// hover/focus and recomputed on scroll/resize while open.
// ─────────────────────────────────────────────────────────────────────────

type TooltipPlacement = 'above' | 'below';

type TooltipCoords = {
  /** viewport-X of the trigger's horizontal center */
  x: number;
  /** viewport-Y of the anchor edge (top of trigger for above; bottom for below) */
  y: number;
  placement: TooltipPlacement;
};

function WhyTooltip({
  children,
  title,
  why,
  preferUp = false,
}: {
  children: React.ReactNode;
  title: string;
  why: string;
  preferUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  // Hydration safety — only attempt portal rendering after mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute placement from trigger rect. Auto-flips to the opposite
  // side if the preferred side would overflow the viewport.
  const computeCoords = (): TooltipCoords | null => {
    if (!triggerRef.current) return null;
    const r = triggerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const ESTIMATED_TOOLTIP_H = 130; // generous; tooltip is ~110-130px tall
    const wantAbove = preferUp;
    const canAbove = r.top - ESTIMATED_TOOLTIP_H - 14 > 0;
    const canBelow = r.bottom + ESTIMATED_TOOLTIP_H + 14 < viewportH;
    const useAbove = wantAbove ? canAbove || !canBelow : !canBelow && canAbove;
    return {
      x: r.left + r.width / 2,
      y: useAbove ? r.top : r.bottom,
      placement: useAbove ? 'above' : 'below',
    };
  };

  const show = () => {
    setCoords(computeCoords());
    setOpen(true);
  };
  const hide = () => setOpen(false);

  // Recompute on scroll/resize while open so the tooltip tracks the
  // trigger if anything moves.
  useEffect(() => {
    if (!open) return;
    const handler = () => setCoords(computeCoords());
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-block w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        aria-describedby={open ? id : undefined}
        className="relative block h-full w-full"
      >
        {children}
      </span>

      {mounted && coords
        ? createPortal(
            <PortalTooltip
              id={id}
              title={title}
              why={why}
              coords={coords}
              open={open}
            />,
            document.body,
          )
        : null}
    </span>
  );
}

function PortalTooltip({
  id,
  title,
  why,
  coords,
  open,
}: {
  id: string;
  title: string;
  why: string;
  coords: TooltipCoords;
  open: boolean;
}) {
  const isAbove = coords.placement === 'above';
  const GAP = 12; // px between trigger edge and tooltip
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: coords.x,
    top: isAbove ? coords.y - GAP : coords.y + GAP,
    transform: isAbove
      ? `translate(-50%, ${open ? '-100%' : 'calc(-100% + 4px)'})`
      : `translate(-50%, ${open ? '0' : '-4px'})`,
    width: 'min(320px, calc(100vw - 32px))',
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    border: '1px solid rgba(4, 120, 87, 0.22)',
    borderRadius: '8px',
    padding: '14px 16px',
    boxShadow:
      '0 18px 36px -16px rgba(4, 120, 87, 0.22), 0 2px 6px rgba(15, 23, 41, 0.08)',
    zIndex: 9999,
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: `opacity ${T} ${EASE}, transform ${T} ${EASE}`,
  };
  return (
    <div id={id} role="tooltip" style={tooltipStyle}>
      <p className="m-0 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
        {title}
      </p>
      <p
        className="mt-2 font-display text-[13px] leading-[1.55] text-foreground/82"
        style={{ margin: '8px 0 0', fontVariationSettings: '"opsz" 24, "SOFT" 40' }}
      >
        {why}
      </p>
      {/* Arrow indicator pointing back at the trigger */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          ...(isAbove
            ? { top: '100%', transform: 'translateX(-50%)' }
            : { bottom: '100%', transform: 'translateX(-50%) rotate(180deg)' }),
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: isAbove ? '6px solid hsl(var(--background))' : '6px solid transparent',
          borderBottom: isAbove ? '6px solid transparent' : '6px solid hsl(var(--background))',
          filter: 'drop-shadow(0 1px 0 rgba(4, 120, 87, 0.22))',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ComponentRow — 4 cards in a grid
// ─────────────────────────────────────────────────────────────────────────

function ComponentRow({
  components,
  preferUp,
}: {
  components: Component[];
  preferUp: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {components.map((c) => (
        <WhyTooltip key={c.key} title={c.label} why={c.why} preferUp={preferUp}>
          <ComponentCard component={c} />
        </WhyTooltip>
      ))}
    </div>
  );
}

function ComponentCard({ component }: { component: Component }) {
  return (
    <div
      className="component-card relative flex flex-col rounded-lg border border-foreground/10 bg-background p-4 transition lg:p-5"
      style={{
        boxShadow: '0 1px 2px rgba(15, 23, 41, 0.03)',
        cursor: 'help',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="font-display text-[14.5px] font-medium leading-tight tracking-tight text-foreground"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {component.label}
        </div>
        {component.status ? <StatusDot status={component.status} /> : null}
      </div>
      {component.sub ? (
        <p className="mt-1.5 text-[12.5px] leading-[1.45] text-foreground/55">
          {component.sub}
        </p>
      ) : null}

      <style>{`
        .component-card:hover {
          border-color: rgba(4, 120, 87, 0.4);
          box-shadow: 0 4px 12px rgba(4, 120, 87, 0.08);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const colorMap: Record<Status, string> = {
    production: '#047857',
    beta: '#d97706',
    roadmap: 'rgba(15, 23, 41, 0.25)',
  };
  const labelMap: Record<Status, string> = {
    production: 'Shipping today',
    beta: 'In beta',
    roadmap: 'Roadmap',
  };
  return (
    <span
      className="mt-1.5 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full"
      style={{ background: colorMap[status] }}
      aria-label={labelMap[status]}
      title={labelMap[status]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// IntegrationRow — three labels, each tooltip-wrapped
// ─────────────────────────────────────────────────────────────────────────

function IntegrationRow({
  components,
  preferUp,
}: {
  components: Component[];
  preferUp: boolean;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background px-6 py-5 lg:px-8 lg:py-6">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:gap-x-12">
        {components.map((c, i) => (
          <div key={c.key} className="flex items-center gap-8 lg:gap-12">
            <WhyTooltip title={c.label} why={c.why} preferUp={preferUp}>
              <span
                className="integration-pill cursor-help rounded-md border border-transparent px-2.5 py-1 font-display text-[14.5px] font-medium tracking-tight text-foreground transition"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
              >
                {c.label}
              </span>
            </WhyTooltip>
            {i < components.length - 1 ? (
              <span aria-hidden="true" className="text-foreground/25">
                ·
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <style>{`
        .integration-pill:hover {
          border-color: rgba(4, 120, 87, 0.4);
          background: rgba(4, 120, 87, 0.04);
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EngineRow — 9 connected nodes, each tooltip-wrapped
// ─────────────────────────────────────────────────────────────────────────

function EngineRow({
  steps,
  preferUp,
}: {
  steps: Step[];
  preferUp: boolean;
}) {
  return (
    <div className="overflow-x-auto overflow-y-visible pb-2">
      <div className="flex min-w-[860px] items-stretch gap-0">
        {steps.map((step, i) => (
          <div key={step.num} className="flex flex-1 items-stretch">
            <WhyTooltip title={`Step ${step.num} · ${step.label}`} why={step.why} preferUp={preferUp}>
              <EngineNode step={step} />
            </WhyTooltip>
            {i < steps.length - 1 ? <EngineArrow /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function EngineNode({ step }: { step: Step }) {
  return (
    <div
      className="engine-node relative flex flex-1 cursor-help flex-col items-start justify-center rounded-md border border-emerald-700/15 bg-background px-3 py-3"
      style={{
        boxShadow: '0 1px 2px rgba(4, 120, 87, 0.04)',
        minHeight: '64px',
      }}
    >
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
        {step.num}
      </span>
      <span
        className="mt-1 font-display text-[12.5px] font-medium leading-tight tracking-tight text-foreground"
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
      >
        {step.label}
      </span>
      <style>{`
        .engine-node:hover {
          border-color: rgba(4, 120, 87, 0.6);
          box-shadow: 0 4px 12px rgba(4, 120, 87, 0.12);
          transform: translateY(-1px);
        }
        .engine-node { transition: all ${T} ${EASE}; }
      `}</style>
    </div>
  );
}

function EngineArrow() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-shrink-0 items-center justify-center"
      style={{ width: '14px' }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0.5 5h8.5M5 1.5L9 5l-4 3.5"
          stroke="rgba(4, 120, 87, 0.55)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Flow connector between layers
// ─────────────────────────────────────────────────────────────────────────

function FlowConnector() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-7 items-center justify-center"
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/[0.06]" />
      <div className="relative flex gap-1.5 rounded-full border border-foreground/10 bg-background px-2 py-0.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 0.5v8.5M1.5 5L5 9l3.5-4" stroke="rgba(4, 120, 87, 0.55)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 0.5v8.5M1.5 5L5 9l3.5-4" stroke="rgba(4, 120, 87, 0.35)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Closers
// ─────────────────────────────────────────────────────────────────────────

export function ProductArchitectureClosers() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <CloserCard
        eyebrow="The unifier"
        title="Same engine, every surface."
        body="Writers stay in their tools — WordPress, Google Docs, Notion, Substack, Medium. The verification is the same; the surface is whatever the writer already prefers."
      />
      <CloserCard
        eyebrow="The compute"
        title="Model-agnostic by design."
        body="Six AI providers plug in. Cloud models for speed; open-source models running inside the customer's data center for environments where data can't leave the building. Customers route which workflow uses which model."
      />
      <CloserCard
        eyebrow="The compounding"
        title="The data layer is the moat."
        body="The approved-source knowledge base deepens with every customer and every new industry pack. The tamper-proof audit log becomes the industry standard once it's embedded into enough customers' publishing pipelines. Compounding asset, not a feature."
        tint="emerald"
      />
    </div>
  );
}

function CloserCard({
  eyebrow,
  title,
  body,
  tint,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tint?: 'emerald';
}) {
  return (
    <div
      className="rounded-lg border p-5 lg:p-6"
      style={{
        borderColor: tint === 'emerald' ? 'rgba(4, 120, 87, 0.25)' : 'rgba(15, 23, 41, 0.1)',
        background: tint === 'emerald' ? 'rgba(4, 120, 87, 0.04)' : 'rgba(255, 255, 255, 0.6)',
      }}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
        {eyebrow}
      </p>
      <p
        className="mt-2 font-display text-[clamp(1.05rem,1.4vw,1.2rem)] font-medium leading-[1.25] tracking-tight text-foreground"
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 40' }}
      >
        {title}
      </p>
      <p
        className="mt-2 text-[12.5px] leading-[1.55]"
        style={{ color: tint === 'emerald' ? 'rgba(15, 23, 41, 0.72)' : 'rgba(15, 23, 41, 0.65)' }}
      >
        {body}
      </p>
    </div>
  );
}
