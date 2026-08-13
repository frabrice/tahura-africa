import { next } from '@vercel/functions';

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Applebot|SkypeUriPreview/i;

interface TableConfig {
  table: string;
  titleCol: string;
  imageCol: string;
  array?: boolean;
}

const TABLE_MAP: Record<string, TableConfig> = {
  experience: { table: 'partner_listings', titleCol: 'title', imageCol: 'media', array: true },
  homestay:   { table: 'partner_listings', titleCol: 'title', imageCol: 'media', array: true },
  itinerary:  { table: 'partner_listings', titleCol: 'title', imageCol: 'media', array: true },
  attraction: { table: 'institution_profiles', titleCol: 'name', imageCol: 'cover_image' },
  hosts:      { table: 'partner_hosts', titleCol: 'name', imageCol: 'profile_picture' },
};

export const config = {
  matcher: ['/experience/:id', '/homestay/:id', '/attraction/:id', '/hosts/:id', '/itinerary/:id'],
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMetaHtml({ title, image, url }: { title: string; image: string; url: string }): string {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml('Discover authentic African experiences, homestays, and attractions on Tahura Africa.');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Tahura Africa" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDesc}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDesc}" />
<meta name="twitter:image" content="${image}" />
</head>
<body>
<h1>${safeTitle}</h1>
<p>${safeDesc}</p>
<a href="${url}">View on Tahura Africa</a>
</body>
</html>`;
}

export default async function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) return next();

  try {
    const { pathname, origin } = new URL(request.url);
    const [, type, id] = pathname.split('/');
    const cfg = TABLE_MAP[type];
    if (!cfg || !id) return next();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return next();

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${cfg.table}?id=eq.${encodeURIComponent(id)}&select=${cfg.titleCol},${cfg.imageCol}`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return next();
    const rows = await res.json();
    const row = rows?.[0];
    if (!row) return next();

    const rawImage: string | undefined = cfg.array ? row[cfg.imageCol]?.[0] : row[cfg.imageCol];
    const ogImage = rawImage
      ? `${origin}/api/og/${type}/${encodeURIComponent(id)}`
      : `${origin}/api/og/site/preview`;

    return new Response(
      renderMetaHtml({ title: `${row[cfg.titleCol]} | Tahura Africa`, image: ogImage, url: request.url }),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  } catch {
    return next();
  }
}
