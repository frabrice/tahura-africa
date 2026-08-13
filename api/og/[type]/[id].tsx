import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const LOGO_URL = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1773397705/Favicon_msgzop.png';

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

export default async function handler(request: Request) {
  try {
    const { pathname } = new URL(request.url);
    const [, , , type, id] = pathname.split('/'); // /api/og/{type}/{id}
    const cfg = TABLE_MAP[type];
    if (!cfg || !id) return fallbackImage();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return fallbackImage();

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${cfg.table}?id=eq.${encodeURIComponent(id)}&select=${cfg.imageCol}`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return fallbackImage();
    const rows = await res.json();
    const row = rows?.[0];
    const rawImage: string | undefined = cfg.array ? row?.[cfg.imageCol]?.[0] : row?.[cfg.imageCol];
    if (!rawImage) return fallbackImage();

    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
          <img src={rawImage} width={1200} height={630} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              position: 'absolute',
              bottom: 32,
              right: 32,
              background: 'rgba(15,13,11,0.6)',
              padding: '10px 20px',
              borderRadius: 999,
            }}
          >
            <img src={LOGO_URL} width={28} height={28} style={{ borderRadius: '50%' }} />
            <span style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>Tahura Africa</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return fallbackImage();
  }
}

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F0D0B',
        }}
      >
        <img src={LOGO_URL} width={96} height={96} />
        <span style={{ color: 'white', fontSize: 40, fontWeight: 700, marginLeft: 24 }}>Tahura Africa</span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
