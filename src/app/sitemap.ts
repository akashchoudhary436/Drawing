import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://doodle-duel-ufjv.onrender.com'
  const lastModified = new Date()
  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/how-to-play`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
