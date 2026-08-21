export const config = { runtime: 'edge' };

const SITE_ORIGIN = 'https://www.tahuraafrica.com';

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/become-a-local', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.2', changefreq: 'yearly' },
  { path: '/terms-of-service', priority: '0.2', changefreq: 'yearly' },
];

const LISTING_ROUTE_PREFIX: Record<string, string> = {
  experience: '/experience',
  homestay: '/homestay',
  itinerary: '/itinerary',
};

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc: string, lastmod: string | undefined, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
${lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default async function handler() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const entries: string[] = STATIC_ROUTES.map(r => urlEntry(`${SITE_ORIGIN}${r.path}`, undefined, r.changefreq, r.priority));

  if (supabaseUrl && anonKey) {
    try {
      const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

      const [listingsRes, attractionsRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/partner_listings?select=id,listing_type,updated_at&status=eq.active&is_flagged=eq.false`,
          { headers, signal: AbortSignal.timeout(5000) },
        ),
        fetch(
          `${supabaseUrl}/rest/v1/institution_profiles?select=id,updated_at&published=eq.true&is_flagged=eq.false`,
          { headers, signal: AbortSignal.timeout(5000) },
        ),
      ]);

      if (listingsRes.ok) {
        const listings = await listingsRes.json();
        for (const l of listings) {
          const prefix = LISTING_ROUTE_PREFIX[l.listing_type];
          if (!prefix) continue;
          entries.push(urlEntry(`${SITE_ORIGIN}${prefix}/${l.id}`, l.updated_at, 'weekly', '0.8'));
        }
      }

      if (attractionsRes.ok) {
        const attractions = await attractionsRes.json();
        for (const a of attractions) {
          entries.push(urlEntry(`${SITE_ORIGIN}/attraction/${a.id}`, a.updated_at, 'weekly', '0.7'));
        }
      }
    } catch {
      // Live listings failed to load — still return the static routes below
      // rather than a broken sitemap.
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
