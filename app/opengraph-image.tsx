import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEO Tracker — AI Brand Visibility'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(circle at 25% 15%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.18), transparent 45%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              color: 'white',
              fontWeight: 800,
            }}
          >
            ⚡
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, color: 'white' }}>GEO Tracker</div>
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Does AI recommend your brand?
        </div>
        <div style={{ fontSize: 28, color: '#a1a1aa', marginTop: 24, textAlign: 'center', maxWidth: 800 }}>
          Track your visibility across ChatGPT, Perplexity &amp; Gemini
        </div>
      </div>
    ),
    { ...size },
  )
}
