/** @type {import('next').NextConfig} */

// Security headers. The config was previously empty, so the app shipped with none of these.
//
// CSP note: Next.js injects inline bootstrap scripts, and a nonce-based policy requires
// routing every response through middleware. Rather than pretend, this ships a CSP that is
// strict everywhere it can be (no framing, no plugins, no arbitrary form targets, locked
// connect-src) while allowing the inline/eval that the Next runtime and Stripe.js need.
// Tightening script-src further means adopting nonces in middleware -- worth doing, but it
// is a behavioural change that needs its own testing pass, not a silent one.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval': required by the Next.js client runtime + Stripe.js
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // only our own API, Supabase and Stripe -- anything else is blocked, which cuts off the
  // usual exfiltration path if a dependency ever turns malicious
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()', 'ambient-light-sensor=()', 'autoplay=()', 'battery=()',
      'camera=()', 'display-capture=()', 'document-domain=()', 'encrypted-media=()',
      'geolocation=()', 'gyroscope=()', 'idle-detection=()', 'local-fonts=()',
      'magnetometer=()', 'microphone=()', 'midi=()', 'payment=(self)',
      'picture-in-picture=()', 'screen-wake-lock=()', 'serial=()', 'usb=()',
      'xr-spatial-tracking=()',
    ].join(', '),
  },
]

const nextConfig = {
  poweredByHeader: false, // stop advertising the framework/version
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // never let an API response sit in a shared cache -- these are per-user
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ]
  },
}

export default nextConfig
