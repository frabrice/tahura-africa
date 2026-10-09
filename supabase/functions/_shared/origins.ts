// The addresses this app is served from. A request's Origin (set by the
// browser, not editable by page scripts) is only trusted if it is on this list,
// so a link or redirect built from it can never point at an arbitrary site.
// Add the real domain and any new Vercel domain here.
export const ALLOWED_ORIGINS = [
  "https://tahura-africa.vercel.app",
  "https://www.tahuraafrica.com",
  "https://tahuraafrica.com",
];

function normalise(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "").toLowerCase();
}

/** The caller's own site if it's on the allow-list, otherwise `fallback`. */
export function originFromRequest(req: Request, fallback: string): string {
  const origin = normalise(req.headers.get("origin"));
  return ALLOWED_ORIGINS.includes(origin) ? origin : fallback;
}

/** Same check for a site address passed in a request body. */
export function safeSiteUrl(candidate: unknown, fallback: string): string {
  const url = normalise(candidate);
  return ALLOWED_ORIGINS.includes(url) ? url : fallback;
}
