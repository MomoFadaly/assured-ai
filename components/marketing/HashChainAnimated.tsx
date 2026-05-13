'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const BLOCKS = [
  { label: 'genesis', hash: '0000…0000', tone: 'muted' as const },
  { label: '#211', hash: '7f4a…b21c', tone: 'normal' as const },
  { label: '#212', hash: '2e54…6072', tone: 'normal' as const },
  { label: '#213', hash: 'cb12…ffc8', tone: 'normal' as const },
  { label: '#214', hash: '8192…c539', tone: 'active' as const },
];

export function HashChainAnimated() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <span>Cryptographic chain</span>
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-2.5 w-2.5" />
          chain valid
        </span>
      </div>
      <div className="relative">
        <svg
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 -z-0 h-2 w-full"
          viewBox="0 0 400 8"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1="0"
            y1="4"
            x2="400"
            y2="4"
            className={revealed ? 'animate-chain-flow stroke-primary' : 'stroke-primary/20'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative z-10 grid grid-cols-5 gap-1.5">
          {BLOCKS.map((b, i) => (
            <div
              key={b.label}
              className={`rounded-md border px-1.5 py-1.5 text-center ${
                b.tone === 'active'
                  ? 'border-primary bg-card shadow-sm glow-primary'
                  : b.tone === 'muted'
                    ? 'border-border bg-muted/40'
                    : 'border-border bg-card'
              } ${revealed ? 'chain-block' : 'opacity-0'}`}
              style={revealed ? { animationDelay: `${i * 140}ms` } : undefined}
            >
              <div
                className={`text-[9.5px] font-semibold ${
                  b.tone === 'active' ? 'text-primary' : 'text-foreground'
                }`}
              >
                {b.label}
              </div>
              <div className="mt-0.5 font-mono text-[8.5px] text-muted-foreground">{b.hash}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
