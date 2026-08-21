import { useEffect } from 'react';

const SITE_NAME = 'Tahura Africa';
const SITE_ORIGIN = 'https://www.tahuraafrica.com';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/api/og/site/preview`;

interface SEOOptions {
  title: string;
  description: string;
  image?: string;
  path?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSON_LD_ID = 'page-json-ld';

function setJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | undefined) {
  const existing = document.getElementById(JSON_LD_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing instanceof HTMLScriptElement ? existing : document.createElement('script');
  script.id = JSON_LD_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}

// Sets document title, meta description, canonical URL, and OG/Twitter tags
// for the current page. This is a client-side-only SPA with a single static
// index.html, so every route otherwise shares one generic title/description
// — real people rarely notice, but it flattens on-page SEO signals Google's
// indexer does read (title tags, meta description) down to nothing per-page.
// Doesn't fix link-preview bots (WhatsApp/Facebook/Twitter don't run JS) —
// that's handled server-side, see api/_middleware.ts.
export function useSEO({ title, description, image, path, jsonLd }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_ORIGIN}${path ?? window.location.pathname}`;
    const ogImage = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta('name', 'description', description);
    setCanonical(url);

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    setJsonLd(jsonLd);
  }, [title, description, image, path, jsonLd]);
}
