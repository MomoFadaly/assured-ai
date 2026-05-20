import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif, Fraunces, Allison } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});
const instrumentSerif = Instrument_Serif({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
});
// Allison — thin single-weight handwriting script used for the personal
// sign-off at the bottom of the prototype disclaimer. Self-hosted via
// next/font/google so we don't trip the CSP's Google-Fonts-CDN block.
const allison = Allison({
  variable: '--font-script',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://assuredai.online'),
  title: {
    default: 'AssuredAI — Nothing publishes under your name without proof',
    template: '%s · AssuredAI',
  },
  description:
    'The proof layer for regulated publishing. Every piece of content — written by your team, delivered by an agency, or drafted by an AI tool — passes through one compliance pipeline before it ships. Healthcare, finance, government, legal. Hash-chained audit log + public proof URL on every published article.',
  applicationName: 'AssuredAI',
  authors: [{ name: 'AssuredAI', url: 'https://assuredai.online' }],
  keywords: [
    'regulated content compliance',
    'editorial compliance platform',
    'HIPAA content verification',
    'FINRA marketing review',
    'ABA Rule 1.6 compliance',
    'PHI / PII redaction',
    'hash-chained audit log',
    'AI content governance',
    'AI hallucination detection',
    'public proof URL',
    'healthcare publishers',
    'financial services compliance',
    'government plain-language',
    'legal marketing compliance',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: 'https://assuredai.online/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://assuredai.online/',
    siteName: 'AssuredAI',
    title: 'AssuredAI — Nothing publishes under your name without proof',
    description:
      'The proof layer for regulated publishing. Healthcare, finance, government, legal. Hash-chained audit + public proof URL on every piece — whether your team wrote it, your agency delivered it, or an LLM drafted it.',
    // images intentionally omitted — Next.js auto-discovers app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AssuredAI — Nothing publishes under your name without proof',
    description:
      'The proof layer for regulated publishing. Healthcare · finance · government · legal. Hash-chained audit + public proof URL on every piece.',
    // images intentionally omitted — Next auto-uses opengraph-image
  },
  category: 'Regulated content compliance',
};

export const viewport = {
  // Light-only — dark mode removed product-wide. Both media queries point
  // to the same light surface so OS dark-mode users still get our light UI.
  themeColor: '#fcfcfd',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AssuredAI',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Regulated Content Compliance',
  operatingSystem: 'Web',
  description:
    'The proof layer for regulated publishing — healthcare, finance, government, legal. PHI / PII redaction, sentence-level verification, hash-chained audit logs, and public proof URLs on every piece, regardless of whether a human or AI drafted it.',
  url: 'https://assuredai.online/',
  publisher: {
    '@type': 'Organization',
    name: 'AssuredAI',
    url: 'https://assuredai.online/',
  },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', priceValidUntil: '2099-12-31' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        // suppressHydrationWarning is the React-sanctioned escape hatch
        // for body attribute mismatches caused by browser extensions
        // (ColorZilla injects cz-shortcut-listen, Grammarly injects
        // data-gramm, LastPass / Honey / etc. all do similar things).
        // The extension modifies the body DOM before React hydrates,
        // so React sees a mismatch between server HTML (no attribute)
        // and client DOM (extension-added attribute). This warning
        // doesn't affect the page — it's purely an extension artifact
        // — but it pollutes the dev console and triggers the Next.js
        // error overlay. Suppressing here is the canonical fix.
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${fraunces.variable} ${allison.variable} font-sans antialiased`}
      >
        <a href="#hero" className="skip-link">
          Skip to main content
        </a>
        <noscript>
          <div style={{ padding: '24px', textAlign: 'center', background: '#fef3c7', color: '#78350f' }}>
            AssuredAI requires JavaScript to verify content. This page works fine as a static
            overview; the live verifier at <a href="/chat">/chat</a> needs JS to run.
          </div>
        </noscript>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
