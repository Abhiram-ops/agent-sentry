import type { MetadataRoute } from "next";

const BASE = "https://agentsentry.org";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,              lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/docs`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/signup`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/login`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}
