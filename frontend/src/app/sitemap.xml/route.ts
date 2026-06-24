import { NextResponse } from "next/server";

const BASE = "https://agentsentry.org";

const routes = [
  { path: "",          changeFreq: "weekly",  priority: 1.0 },
  { path: "/docs",     changeFreq: "weekly",  priority: 0.9 },
  { path: "/signup",   changeFreq: "monthly", priority: 0.8 },
  { path: "/login",    changeFreq: "monthly", priority: 0.5 },
  { path: "/terms",    changeFreq: "monthly", priority: 0.4 },
  { path: "/privacy",  changeFreq: "monthly", priority: 0.4 },
  { path: "/feedback", changeFreq: "monthly", priority: 0.6 },
];

export async function GET() {
  const lastmod = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>${BASE}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changeFreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
