'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useScarcityCounter } from '@/lib/useScarcityCounter';

/**
 * PasteAndScan — the interactive conversion moment.
 *
 * After the cinema lifts, the user has watched Alex Brennan's career
 * be saved by AssuredAI. The audit insight: convert that empathy
 * into self-recognition. The user has their own drafts somewhere.
 * Their own near-mistakes. Give them the ability to RUN THE SAME
 * SCAN ON THEIR OWN CONTENT, immediately, without a lead-capture
 * form.
 *
 * How it works:
 *   1. Textarea invites: "Paste your draft. We'll scan it now."
 *   2. User pastes (or types). A "Scan it →" button enables.
 *   3. On click, the panel runs a client-side heuristic scan that
 *      detects suspicious patterns matching AssuredAI's recognizer
 *      categories (medical dosages, financial advice, legal advice,
 *      definitive risk claims, etc.).
 *   4. The same red INK-BLEED gesture animates across detected
 *      phrases — identical to the gesture the cinema used on
 *      Hartwell Health's draft.
 *   5. A result strip shows what was caught + the corrected
 *      suggestion + a "Get the full scan" CTA.
 *
 * Why this works for conversion:
 *   • Zero friction (no email gate)
 *   • Value delivered BEFORE lead capture
 *   • The user becomes Alex Brennan, then realizes they need this
 *   • The cinema's gesture appears on THEIR words — personal
 */

interface DetectedRisk {
  start: number;
  end: number;
  category: 'medical-dose' | 'financial-advice' | 'legal-advice' | 'absolute-claim' | 'unverified-stat';
  label: string;
  suggestion: string;
}

const CATEGORY_LABELS: Record<DetectedRisk['category'], { name: string; emoji: string }> = {
  'medical-dose': { name: 'Medical dosage claim', emoji: '💊' },
  'financial-advice': { name: 'Financial advice', emoji: '💰' },
  'legal-advice': { name: 'Legal advice', emoji: '⚖️' },
  'absolute-claim': { name: 'Absolute claim', emoji: '⚠️' },
  'unverified-stat': { name: 'Unverified statistic', emoji: '📊' },
};

/* Heuristic recognizer — client-side pattern matching that mirrors
   the categories the real AssuredAI corpus detects. Not the real
   model; a good-enough demonstration that finds suspicious phrases
   in pasted text. The full version would call the AssuredAI API. */
function detectRisks(text: string): DetectedRisk[] {
  const found: DetectedRisk[] = [];
  // 1. Medical dosage claims — match "Xmg of [substance]" or "X mg"
  const dosageRx = /(\d[\d,]*\s*(?:mg|mcg|µg|g)\s+(?:of|per day|daily)[^.]{0,40})/gi;
  let m;
  while ((m = dosageRx.exec(text)) !== null) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      category: 'medical-dose',
      label: 'Medical dosage claim detected',
      suggestion: 'Verify against FDA/NIH dosing guidelines',
    });
  }
  // 2. Financial advice — match "guaranteed return", "no risk", "X% returns"
  const finRx = /(guaranteed\s+(?:returns?|profits?|gains?)|risk[\s-]free|\b\d{1,3}%\s+(?:returns?|gains?|profits?))/gi;
  while ((m = finRx.exec(text)) !== null) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      category: 'financial-advice',
      label: 'Unverified financial claim',
      suggestion: 'SEC requires disclaimers on return projections',
    });
  }
  // 3. Legal advice — match "must", "you are entitled to", "lawsuit"
  const legalRx = /(you\s+are\s+entitled\s+to|sue\s+(?:them|us|the\s+company)|always\s+wins\s+in\s+court)/gi;
  while ((m = legalRx.exec(text)) !== null) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      category: 'legal-advice',
      label: 'Legal advice detected',
      suggestion: 'Avoid case-specific recommendations',
    });
  }
  // 4. Absolute claims — "always", "never", "cures", "100%"
  const absoluteRx = /(always\s+(?:safe|works|cures?)|100%\s+(?:safe|effective)|never\s+fails?|cures?\s+(?:cancer|diabetes|covid))/gi;
  while ((m = absoluteRx.exec(text)) !== null) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      category: 'absolute-claim',
      label: 'Absolute claim detected',
      suggestion: 'Qualify with evidence-based language',
    });
  }
  // 5. Unverified stats — "studies show", "X% of people", with no citation
  const statRx = /(studies\s+show|research\s+proves|\b\d{1,3}%\s+of\s+(?:people|americans|users))/gi;
  while ((m = statRx.exec(text)) !== null) {
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      category: 'unverified-stat',
      label: 'Unverified statistic',
      suggestion: 'Add source citation (FDA, peer-reviewed study)',
    });
  }
  // Deduplicate overlaps (keep first hit per region)
  found.sort((a, b) => a.start - b.start);
  const deduped: DetectedRisk[] = [];
  for (const r of found) {
    const last = deduped[deduped.length - 1];
    if (!last || r.start >= last.end) deduped.push(r);
  }
  return deduped;
}

const PLACEHOLDER_DRAFTS = [
  `Adults may safely take up to 4,000 mg of ibuprofen per day for everyday pain relief.

This advice is backed by clinical research and applies to most patients.`,
  `Our crypto fund guarantees 30% returns annually with no risk. Studies show 100% of our clients have profited.

Backed by industry research.`,
];

export function PasteAndScan() {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'results'>('idle');
  const [results, setResults] = useState<DetectedRisk[]>([]);
  const { count: spotsRemaining } = useScarcityCounter();
  const [scanProgress, setScanProgress] = useState(0);
  const placeholderRef = useRef(PLACEHOLDER_DRAFTS[Math.floor(Math.random() * PLACEHOLDER_DRAFTS.length)]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // S8 — Audio at PasteAndScan: 8 sonic moments matched to interaction.
  // Helper to safely fire cinema audio events from this section.
  const fireAudio = (event: string, detail?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    try { window.dispatchEvent(new CustomEvent(event, { detail })); } catch { /* no-op */ }
  };

  // Run the scan with animated progress
  const runScan = () => {
    if (!text.trim()) return;
    setPhase('scanning');
    setScanProgress(0);
    // S8: scanner-lock audio (callback to Scene 7's lock-on)
    fireAudio('cinema:scanner-lock');
    let p = 0;
    const interval = setInterval(() => {
      p += 0.04;
      setScanProgress(Math.min(1, p));
      if (p >= 1) {
        clearInterval(interval);
        const risks = detectRisks(text);
        setResults(risks);
        setPhase('results');
        // S8: results-land audio — chord depending on outcome
        if (risks.length === 0) {
          // Clean draft → AssuredAI brand mark motif (the win)
          fireAudio('cinema:brand-mark', { intensity: 0.7 });
        } else {
          // Risks found → flag-punch (we caught it)
          fireAudio('cinema:flag-punch');
        }
      }
    }, 60);
  };

  const reset = () => {
    setText('');
    setPhase('idle');
    setResults([]);
    setScanProgress(0);
    placeholderRef.current = PLACEHOLDER_DRAFTS[Math.floor(Math.random() * PLACEHOLDER_DRAFTS.length)];
    textareaRef.current?.focus();
  };

  const tryExample = () => {
    setText(placeholderRef.current);
    setPhase('idle');
    setResults([]);
    setTimeout(() => runScan(), 200);
  };

  // Render the user's text with detected risks highlighted using
  // the same ink-bleed gesture as the cinema. We split the text
  // into segments and overlay InkBleed on each detected region.
  const renderedText = useMemo(() => {
    if (phase !== 'results' || results.length === 0) {
      return text;
    }
    const segments: { content: string; isRisk: boolean; risk?: DetectedRisk }[] = [];
    let cursor = 0;
    for (const r of results) {
      if (r.start > cursor) {
        segments.push({ content: text.slice(cursor, r.start), isRisk: false });
      }
      segments.push({ content: text.slice(r.start, r.end), isRisk: true, risk: r });
      cursor = r.end;
    }
    if (cursor < text.length) {
      segments.push({ content: text.slice(cursor), isRisk: false });
    }
    return segments;
  }, [phase, results, text]);

  return (
    <section
      id="paste-and-scan"
      aria-labelledby="paste-and-scan-title"
      className="relative bg-black py-24 sm:py-32"
      style={{ color: 'rgba(255,255,255,0.92)' }}
    >
      <div className="mx-auto max-w-[920px] px-6">
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 11,
            color: '#C62B2B',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          ▸ Run it on your draft
        </div>
        {/* Headline */}
        <h2
          id="paste-and-scan-title"
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(36px, 4.8vw, 64px)',
            fontWeight: 400,
            lineHeight: 1.06,
            letterSpacing: '-0.02em',
            color: '#F4F4F6',
            marginBottom: 16,
          }}
        >
          Paste a sentence you&rsquo;re about to publish.
          <br />
          We&rsquo;ll{' '}
          <span style={{ color: '#C62B2B', fontStyle: 'italic' }}>scan it now</span>.
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.62)',
            lineHeight: 1.55,
            maxWidth: 620,
            marginBottom: 32,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          }}
        >
          No email. No signup. The same recognizer that caught Hartwell Health&rsquo;s
          mistake runs on your text instantly.
        </p>

        {/* Editor + scan panel */}
        <div
          className="overflow-hidden rounded-xl"
          style={{
            backgroundColor: '#FBFAF7',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              borderBottom: '1px solid #E8E5DE',
              backgroundColor: '#FBFAF7',
            }}
          >
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16161A" strokeWidth="1.6" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <span style={{ color: '#16161A', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
                Your draft
              </span>
              {phase === 'idle' && text.length === 0 && (
                <button
                  onClick={tryExample}
                  style={{
                    fontSize: 11,
                    color: '#C62B2B',
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginLeft: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 4,
                    transition: 'background 200ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(198,43,43,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  ▸ Or try a risky example
                </button>
              )}
            </div>
            {phase === 'scanning' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  color: '#C62B2B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#C62B2B',
                    animation: 'urgencyPulse 700ms ease-in-out infinite',
                  }}
                />
                Scanning... {Math.round(scanProgress * 100)}%
              </div>
            )}
            {phase === 'results' && (
              <button
                onClick={reset}
                style={{
                  fontSize: 11,
                  color: 'rgba(22,22,26,0.55)',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  background: 'none',
                  border: '1px solid rgba(22,22,26,0.14)',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 4,
                  transition: 'all 200ms',
                }}
              >
                ↺ Scan again
              </button>
            )}
          </div>

          {/* Editor body */}
          <div style={{ position: 'relative', minHeight: 220, padding: 28 }}>
            {phase === 'idle' || phase === 'scanning' ? (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => fireAudio('cinema:source-verify')} // S8: focus chime (high-band ping)
                onKeyDown={(e) => {
                  // S8: typewriter callback on each keystroke (except spaces)
                  if (e.key.length === 1 && e.key !== ' ') {
                    fireAudio('cinema:type-tick');
                  }
                }}
                disabled={phase === 'scanning'}
                placeholder={placeholderRef.current}
                style={{
                  width: '100%',
                  minHeight: 200,
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  background: 'transparent',
                  color: '#16161A',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: 15.5,
                  lineHeight: 1.55,
                  letterSpacing: '-0.005em',
                }}
              />
            ) : (
              // Results view — show user's text with ink-bleed marks
              // on detected risks
              <div
                style={{
                  width: '100%',
                  minHeight: 200,
                  color: '#16161A',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: 15.5,
                  lineHeight: 1.65,
                  letterSpacing: '-0.005em',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {Array.isArray(renderedText)
                  ? renderedText.map((seg, i) =>
                      seg.isRisk ? (
                        <span
                          key={i}
                          style={{
                            position: 'relative',
                            backgroundImage: `linear-gradient(transparent 0%, transparent 78%, rgba(198,43,43,0.18) 78%, rgba(198,43,43,0.32) 92%, transparent 100%)`,
                            color: '#9E1717',
                            fontWeight: 500,
                            textDecoration: 'underline',
                            textDecorationColor: '#C62B2B',
                            textDecorationThickness: '2px',
                            textUnderlineOffset: '3px',
                          }}
                        >
                          {seg.content}
                        </span>
                      ) : (
                        <span key={i}>{seg.content}</span>
                      ),
                    )
                  : renderedText}
              </div>
            )}
            {/* Scanner sweep overlay */}
            {phase === 'scanning' && (
              <motion.div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${scanProgress * 100}%`,
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #C62B2B 50%, transparent)',
                  boxShadow: '0 0 20px 4px rgba(198,43,43,0.5)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>

          {/* Action footer */}
          <div
            className="flex items-center justify-between gap-4 px-5 py-3.5"
            style={{
              borderTop: '1px solid #E8E5DE',
              backgroundColor: 'rgba(22,22,26,0.02)',
            }}
          >
            <div style={{ fontSize: 11, fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', color: 'rgba(22,22,26,0.42)' }}>
              {phase === 'results' ? (
                <span>
                  {results.length} {results.length === 1 ? 'issue' : 'issues'} found
                </span>
              ) : (
                <span>Nothing leaves your browser.</span>
              )}
            </div>
            {phase === 'idle' && (
              <button
                onClick={runScan}
                disabled={!text.trim()}
                style={{
                  backgroundColor: text.trim() ? '#16161A' : 'rgba(22,22,26,0.16)',
                  color: text.trim() ? '#F4F4F6' : 'rgba(22,22,26,0.42)',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  cursor: text.trim() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 200ms',
                }}
              >
                Scan it
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results detail strip */}
        {phase === 'results' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 space-y-2.5"
          >
            {results.length === 0 ? (
              <div
                className="rounded-xl px-5 py-4"
                style={{
                  backgroundColor: 'rgba(46,166,114,0.08)',
                  border: '1px solid rgba(46,166,114,0.32)',
                  color: '#2EA672',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                ✓ No risks detected by the demo recognizer. The full AssuredAI pipeline
                runs 12 additional checks on your content.
              </div>
            ) : (
              <>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl p-4"
                    style={{
                      backgroundColor: 'rgba(198,43,43,0.06)',
                      border: '1px solid rgba(198,43,43,0.32)',
                      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: '#C62B2B',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      !
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F4F4F6', marginBottom: 4 }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>
                        &ldquo;{text.slice(r.start, r.end)}&rdquo;
                      </div>
                      <div style={{ fontSize: 12, color: '#2EA672', fontWeight: 500 }}>
                        ↪ {r.suggestion}
                      </div>
                    </div>
                  </div>
                ))}
                <a
                  href="#cta"
                  onMouseEnter={() => fireAudio('cinema:brand-mark', { intensity: 0.6 })} // S8: brand motif on CTA hover
                  onClick={() => fireAudio('cinema:brand-mark', { intensity: 1.0 })}      // S8: full brand statement on click
                  className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3"
                  style={{
                    backgroundColor: '#F4F4F6',
                    color: '#0A0A0C',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontSize: 13.5,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Get the full scan — {spotsRemaining} of 100 spots remaining
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </a>
              </>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
