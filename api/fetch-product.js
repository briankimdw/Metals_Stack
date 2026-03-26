// Vercel serverless function — fetches product info from a dealer URL
// Supports known dealers (JM Bullion, APMEX, Provident, Hero Bullion) + generic OG/meta fallback

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 8000;

function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    signal: controller.signal,
    headers: { 'User-Agent': USER_AGENT, ...options.headers },
  }).finally(() => clearTimeout(timer));
}

function parseMetalFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('gold') || lower.includes('krugerrand') || lower.includes('maple leaf gold') || lower.includes('buffalo')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('platinum')) return 'platinum';
  if (lower.includes('palladium')) return 'palladium';
  return null;
}

function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

// Extract slug from URL path for search queries
function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    // Get last meaningful segment, strip .html etc
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    return last.replace(/\.html?$/i, '').replace(/[-_]/g, ' ').trim();
  } catch {
    return '';
  }
}

// ============================================================
// KNOWN DEALER FETCHERS
// ============================================================

async function fetchFromJMBullion(slug) {
  const siteId = '7hkez9';
  const url = `https://${siteId}.a.searchspring.io/api/search/search.json?siteId=${siteId}&q=${encodeURIComponent(slug)}&resultsFormat=native&page=1&resultsPerPage=5`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const data = await res.json();
  const p = data.results?.[0];
  if (!p) return null;
  return {
    name: decodeEntities(p.name || ''),
    price: parseFloat(p.price) || null,
    imageUrl: p.imageUrl || p.thumbnailImageUrl || '',
    inStock: p.instock === '1' || p.instock === 1,
    metal: parseMetalFromText(p.name || ''),
  };
}

async function fetchFromAPMEX(slug) {
  const apiKey = '6c75a24fd9b5c369578cc79d061f070b';
  const siteName = 'prod-apmex807791568789776';
  const url = `https://search.unbxd.io/${apiKey}/${siteName}/search?q=${encodeURIComponent(slug)}&rows=5&fields=title,price,imageUrl,productUrl,availability`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const data = await res.json();
  const p = data?.response?.products?.[0];
  if (!p) return null;
  return {
    name: decodeEntities(p.title || ''),
    price: parseFloat(p.price) || null,
    imageUrl: Array.isArray(p.imageUrl) ? p.imageUrl[0] || '' : p.imageUrl || '',
    inStock: p.availability === 'true' || p.availability === true,
    metal: parseMetalFromText(p.title || ''),
  };
}

async function fetchFromProvident(slug) {
  const siteId = '46h6lo';
  const url = `https://${siteId}.a.searchspring.io/api/search/search.json?siteId=${siteId}&q=${encodeURIComponent(slug)}&resultsFormat=native&page=1&resultsPerPage=5`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const data = await res.json();
  const p = data.results?.[0];
  if (!p) return null;
  return {
    name: decodeEntities(p.name || ''),
    price: parseFloat(p.price) || null,
    imageUrl: p.imageUrl || p.thumbnailImageUrl || '',
    inStock: p.instock === '1' || p.instock === 1,
    metal: parseMetalFromText(p.name || ''),
  };
}

async function fetchFromHeroBullion(slug) {
  const url = `https://www.herobullion.com/wp-json/wc/store/v1/products?search=${encodeURIComponent(slug)}&per_page=5`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const data = await res.json();
  const p = Array.isArray(data) ? data[0] : null;
  if (!p) return null;
  const priceRaw = p.prices?.price || p.prices?.sale_price || '0';
  return {
    name: decodeEntities(p.name || ''),
    price: parseInt(priceRaw, 10) / 100 || null,
    imageUrl: p.images?.[0]?.src || '',
    inStock: p.is_in_stock === true,
    metal: parseMetalFromText(p.name || ''),
  };
}

// ============================================================
// GENERIC HTML META FALLBACK
// ============================================================

async function fetchGenericMeta(productUrl) {
  const res = await fetchWithTimeout(productUrl, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const html = await res.text();

  // Extract meta tags
  const getMeta = (property) => {
    const patterns = [
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
      new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match) return decodeEntities(match[1]);
    }
    return null;
  };

  // Try og:title, then <title>
  let name = getMeta('og:title');
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) name = decodeEntities(titleMatch[1].trim());
  }

  // Try to get price from various sources
  let price = null;

  // 1) JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const ld = JSON.parse(m[1]);
      const offers = ld.offers || ld?.mainEntity?.offers;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer.price) {
          price = parseFloat(offer.price);
        } else if (offer.lowPrice) {
          price = parseFloat(offer.lowPrice);
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // 2) product:price:amount meta
  if (!price) {
    const metaPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
    if (metaPrice) price = parseFloat(metaPrice);
  }

  // Try to detect availability
  let inStock = null;
  const jsonLdMatches2 = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches2) {
    try {
      const ld = JSON.parse(m[1]);
      const offers = ld.offers || ld?.mainEntity?.offers;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer.availability) {
          inStock = offer.availability.toLowerCase().includes('instock');
        }
      }
    } catch { /* ignore */ }
  }

  // Get image
  const imageUrl = getMeta('og:image') || '';

  if (!name && !price) return null;

  return {
    name: name || '',
    price: price && !isNaN(price) ? price : null,
    imageUrl,
    inStock,
    metal: name ? parseMetalFromText(name) : null,
  };
}

// ============================================================
// DEALER ROUTING
// ============================================================

const DEALER_MAP = [
  { pattern: /jmbullion\.com/i, fetcher: fetchFromJMBullion },
  { pattern: /apmex\.com/i, fetcher: fetchFromAPMEX },
  { pattern: /providentmetals\.com/i, fetcher: fetchFromProvident },
  { pattern: /herobullion\.com/i, fetcher: fetchFromHeroBullion },
];

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const productUrl = req.query.url;
  if (!productUrl || !productUrl.trim()) {
    return res.status(400).json({ error: 'Missing URL parameter: ?url=...' });
  }

  try {
    const slug = slugFromUrl(productUrl);
    let result = null;

    // Try known dealer API first
    for (const dealer of DEALER_MAP) {
      if (dealer.pattern.test(productUrl) && slug) {
        try {
          result = await dealer.fetcher(slug);
        } catch { /* fall through to generic */ }
        break;
      }
    }

    // Fall back to generic HTML meta scraping
    if (!result) {
      try {
        result = await fetchGenericMeta(productUrl);
      } catch { /* ignore */ }
    }

    if (!result || (!result.name && !result.price)) {
      return res.status(200).json({ found: false, url: productUrl });
    }

    return res.status(200).json({
      found: true,
      url: productUrl,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch product info' });
  }
}
