import type { MetadataRoute } from 'next'
import { ALL_ARTICLES } from '@/lib/blog/posts'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://getgeotracker.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    ...ALL_ARTICLES.map((a) => ({
      url: `${BASE}/blog/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/signup`, priority: 0.5 },
    { url: `${BASE}/login`, priority: 0.3 },
  ]
}
