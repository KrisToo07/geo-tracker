import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#6366f1',
          borderRadius: 48,
        }}
      >
        <div style={{ fontSize: 130, display: 'flex' }}>⚡</div>
      </div>
    ),
    { width: 240, height: 240 },
  )
}
