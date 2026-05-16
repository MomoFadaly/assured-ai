import { ImageResponse } from 'next/og';

/**
 * Open Graph image — served at /opengraph-image, referenced from the root
 * layout's metadata.openGraph.images. Next renders this as a PNG at request
 * time (or cached at build time when using the App Router). 1200x630 is the
 * canonical OG card aspect ratio.
 */

export const runtime = 'edge';
export const alt = 'AssuredAI — Nothing publishes under your name without proof';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafafb',
          backgroundImage:
            'radial-gradient(ellipse at 12% 18%, rgba(33, 86, 165, 0.18), transparent 55%), radial-gradient(ellipse at 86% 76%, rgba(56, 178, 154, 0.14), transparent 55%)',
          padding: '72px',
          fontFamily: '"system-ui", sans-serif',
          position: 'relative',
        }}
      >
        {/* Top — kicker line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontSize: '20px',
            color: '#475569',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              <span>A</span>
            </div>
            <span style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.01em', textTransform: 'none' }}>AssuredAI</span>
          </div>
          <span style={{ marginLeft: 'auto' }}>The proof layer for regulated publishing</span>
        </div>

        {/* Middle — massive headline */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            fontSize: '92px',
            fontWeight: 600,
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
            color: '#0c1422',
          }}
        >
          <div style={{ display: 'flex' }}>Nothing publishes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em' }}>
            <span>under your name</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em' }}>
            <span>without</span>
            <span style={{ fontStyle: 'italic', color: '#1e3a8a', fontWeight: 500 }}>
              proof.
            </span>
          </div>
        </div>

        {/* Bottom — meta strip */}
        <div
          style={{
            marginTop: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            fontSize: '20px',
            color: '#64748b',
            paddingTop: '36px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <span>Healthcare</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>Finance</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>Government</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>Legal</span>
          <span style={{ marginLeft: 'auto', color: '#0c1422', fontWeight: 600 }}>
            assuredai.online
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
