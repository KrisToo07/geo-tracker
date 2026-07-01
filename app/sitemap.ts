import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://geo-tracker-rouge.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${BASE}/blog/how-to-check-if-ai-recommends-your-brand`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    { url: `${BASE}/login`, priority: 0.3 },
    { url: `${BASE}/signup`, priority: 0.5 },
  ]
}
