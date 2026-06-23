import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://agentsentry.org',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // When you build out your whitepapers, blog, or /use-cases, 
    // you will add objects here with a 0.8 priority.
  ];
}