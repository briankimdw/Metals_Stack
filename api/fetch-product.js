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
  if (lower.includes('gold') || lower.includes('krugerrand') || lower.includes('buffalo') || lower.includes('sovereign')) return 'gold';
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

// Extract a search-friendly slug from a product URL
function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);

    // Skip numeric-only segments (IDs like /product/12345/)
    // Find the most descriptive segment (longest with words)
    let best = '';
    for (const seg of segments) {
      const cleaned = seg.replace(/\.html?$/i, '').replace(/[-_]/g, ' ').trim();
      // Skip pure numbers, short segments, and common path words
      if (/^\d+$/.test(cleaned)) continue;
      if (['product', 'products', 'item', 'items', 'p', 'dp', 'catalog', 'shop'].includes(cleaned.toLowerCase())) continue;
      if (cleaned.length > best.length) best = cleaned;
    }

    return best || '';
  } catch {
    return '';
  }
}

// ============================================================
// KNOWN DEALER FETCHERS — use search APIs
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
    inStock: p.instock === '1' || p.instock === 1 || p.ss_in_stock === '1',
    metal: parseMetalFromText(p.name || ''),
  };
}

async function fetchFromAPMEX(slug) {
  const apiKey = '6c75a24fd9b5c369578cc79d061f070b';
  const siteName = 'prod-apmex807791568789776';
  const url = `https://search.unbxd.io/${apiKey}/${siteName}/search?q=${encodeURIComponent(slug)}&rows=5&fields=title,price,imageUrl,productUrl,availability,inStock,isAvailable,sellPrice`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const data = await res.json();
  const p = data?.response?.products?.[0];
  if (!p) return null;

  // APMEX availability: check multiple fields, don't trust search index alone
  // The availability field in search can be stale — default to null (unknown) rather than false
  let inStock = null;
  if (p.availability === 'In Stock' || p.availability === 'true' || p.availability === true) {
    inStock = true;
  } else if (p.inStock === true || p.inStock === 'true' || p.isAvailable === true) {
    inStock = true;
  }
  // Only mark out of stock if explicitly stated
  if (p.availability === 'Out of Stock' || p.availability === 'Unavailable') {
    inStock = false;
  }

  const price = parseFloat(p.sellPrice) || parseFloat(p.price) || null;

  return {
    name: decodeEntities(p.title || ''),
    price,
    imageUrl: Array.isArray(p.imageUrl) ? p.imageUrl[0] || '' : p.imageUrl || '',
    inStock,
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
    inStock: p.instock === '1' || p.instock === 1 || p.ss_in_stock === '1',
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
// GENERIC HTML META FALLBACK — works for any website
// ============================================================

async function fetchGenericMeta(productUrl) {
  const res = await fetchWithTimeout(productUrl, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const html = await res.text();

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

  // Product name: og:title > title tag
  let name = getMeta('og:title');
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) name = decodeEntities(titleMatch[1].trim());
  }
  // Clean up common title suffixes like " | APMEX" or " - SD Bullion"
  if (name) {
    name = name.replace(/\s*[\|–—-]\s*(APMEX|SD Bullion|JM Bullion|Bold Precious Metals|Money Metals|Provident|Hero Bullion|eBay|Amazon|Walmart).*$/i, '').trim();
  }

  // Price: JSON-LD > meta tags > inline price patterns
  let price = null;
  let inStock = null;

  // 1) JSON-LD structured data (most reliable)
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      let ld = JSON.parse(m[1]);
      // Handle @graph arrays
      if (ld['@graph']) {
        const product = ld['@graph'].find((item) => item['@type'] === 'Product');
        if (product) ld = product;
      }
      const offers = ld.offers || ld?.mainEntity?.offers;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (!price) {
          if (offer.price) price = parseFloat(offer.price);
          else if (offer.lowPrice) price = parseFloat(offer.lowPrice);
        }
        if (inStock === null && offer.availability) {
          const avail = offer.availability.toLowerCase();
          if (avail.includes('instock') || avail.includes('in_stock')) inStock = true;
          else if (avail.includes('outofstock') || avail.includes('out_of_stock') || avail.includes('soldout')) inStock = false;
        }
      }
      // Some sites put price directly on the Product
      if (!price && ld.price) price = parseFloat(ld.price);
    } catch { /* ignore parse errors */ }
  }

  // 2) Meta tags for price
  if (!price) {
    const metaPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
    if (metaPrice) price = parseFloat(metaPrice);
  }

  // 3) Common inline price patterns as last resort
  if (!price) {
    // Match patterns like $29.99, $1,299.00
    const priceMatch = html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*\$?([\d,]+\.?\d*)/i);
    if (priceMatch) {
      const parsed = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (parsed > 0 && parsed < 100000) price = parsed;
    }
  }

  // 4) Check product:availability meta
  if (inStock === null) {
    const avail = getMeta('product:availability') || getMeta('og:availability');
    if (avail) {
      const lower = avail.toLowerCase();
      if (lower.includes('instock') || lower.includes('in stock') || lower === 'available') inStock = true;
      else if (lower.includes('outofstock') || lower.includes('out of stock') || lower === 'unavailable') inStock = false;
    }
  }

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
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const productUrl = req.query.url;
  if (!productUrl || !productUrl.trim()) {
    return res.status(400).json({ error: 'Missing URL parameter: ?url=...' });
  }

  try {
    const slug = slugFromUrl(productUrl);
    let result = null;

    // Try known dealer search API first
    for (const dealer of DEALER_MAP) {
      if (dealer.pattern.test(productUrl) && slug) {
        try {
          result = await dealer.fetcher(slug);
        } catch { /* fall through */ }
        break;
      }
    }

    // If dealer API gave incomplete data (no price), also try HTML scraping
    if (result && result.price === null) {
      try {
        const meta = await fetchGenericMeta(productUrl);
        if (meta) {
          result.price = result.price || meta.price;
          result.inStock = result.inStock ?? meta.inStock;
          result.name = result.name || meta.name;
        }
      } catch { /* ignore */ }
    }

    // If no dealer match or dealer failed, try generic HTML scraping
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
