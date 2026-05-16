import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
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

export const metadata: Metadata = {
  metadataBase: new URL('https://assuredai.online'),
  title: {
    default: 'AssuredAI — Stop AI mistakes before they cost you',
    template: '%s · AssuredAI',
  },
  description:
    'The proof layer for healthcare AI. Sentence-level verification, PHI redaction, hash-chained audit logs, and public proof URLs on every published article. Drops into your existing CMS.',
  applicationName: 'AssuredAI',
  authors: [{ name: 'AssuredAI', url: 'https://assuredai.online' }],
  keywords: [
    'healthcare AI verification',
    'AI content compliance',
    'PHI redaction',
    'HIPAA AI',
    'AI hallucination detection',
    'cryptographic audit log',
    'healthcare publishers',
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
    title: 'AssuredAI — Stop AI mistakes before they cost you',
    description:
      'The proof layer for healthcare AI. Sentence-level verification, PHI redaction, hash-chained audit logs, and public proof URLs on every published article.',
    // images intentionally omitted — Next.js auto-discovers app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AssuredAI — Stop AI mistakes before they cost you',
    description:
      'The proof layer for healthcare AI. Sentence-level verification, PHI redaction, hash-chained audit logs, public proof URLs.',
    // images intentionally omitted — Next auto-uses opengraph-image
  },
  category: 'Healthcare AI',
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
  applicationSubCategory: 'Healthcare AI Compliance',
  operatingSystem: 'Web',
  description:
    'The proof layer for healthcare AI. Sentence-level verification, PHI redaction, hash-chained audit logs, and public proof URLs.',
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
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans antialiased`}
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
