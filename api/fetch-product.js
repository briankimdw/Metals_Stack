// Vercel serverless function — fetches product info from ANY URL
// 1. Known dealers → search API (fastest, most accurate)
// 2. Direct HTML fetch → meta tags, JSON-LD, inline prices
// 3. Jina Reader API → renders JavaScript, works on JS-heavy sites

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
  if (lower.includes('gold') || lower.includes('krugerrand') || lower.includes('buffalo') || lower.includes('sovereign') || lower.includes('maple leaf') && !lower.includes('silver')) return 'gold';
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

// Extract search-friendly slug from URL
function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    let best = '';
    for (const seg of segments) {
      const cleaned = seg.replace(/\.html?$/i, '').replace(/[-_]/g, ' ').trim();
      if (/^\d+$/.test(cleaned)) continue;
      if (['product', 'products', 'item', 'items', 'p', 'dp', 'catalog', 'shop'].includes(cleaned.toLowerCase())) continue;
      if (cleaned.length > best.length) best = cleaned;
    }
    return best || '';
  } catch {
    return '';
  }
}

// Extract the first dollar price from text content
function extractPriceFromText(text) {
  // Match prices like $29.99, $1,299.00, As low as $32.50
  const matches = text.match(/\$\s*([\d,]+\.?\d{0,2})/g);
  if (!matches || matches.length === 0) return null;

  // Parse all prices, filter reasonable ones (> $1, < $100k), return the first
  const prices = matches
    .map((m) => parseFloat(m.replace(/[$,\s]/g, '')))
    .filter((p) => p > 1 && p < 100000);

  return prices.length > 0 ? prices[0] : null;
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

  let inStock = null;
  if (p.availability === 'In Stock' || p.availability === 'true' || p.availability === true) inStock = true;
  else if (p.inStock === true || p.inStock === 'true' || p.isAvailable === true) inStock = true;
  if (p.availability === 'Out of Stock' || p.availability === 'Unavailable') inStock = false;

  return {
    name: decodeEntities(p.title || ''),
    price: parseFloat(p.sellPrice) || parseFloat(p.price) || null,
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
// LAYER 2: Direct HTML fetch — meta tags, JSON-LD, inline prices
// ============================================================

function parseHtml(html) {
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

  let name = getMeta('og:title');
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) name = decodeEntities(titleMatch[1].trim());
  }
  if (name) {
    name = name.replace(/\s*[\|–—-]\s*(APMEX|SD Bullion|JM Bullion|Bold Precious Metals|Money Metals|Provident|Hero Bullion|eBay|Amazon|Walmart|Bullion Exchanges|SilverTowne|Kitco|BGASC|Golden Eagle|Liberty Coin).*$/i, '').trim();
  }

  let price = null;
  let inStock = null;

  // JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      let ld = JSON.parse(m[1]);
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
      if (!price && ld.price) price = parseFloat(ld.price);
    } catch { /* ignore */ }
  }

  // Meta tags for price
  if (!price) {
    const metaPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
    if (metaPrice) price = parseFloat(metaPrice);
  }

  // Inline price patterns
  if (!price) {
    const priceMatch = html.match(/class=["'][^"']*price[^"']*["'][^>]*>[^<]*\$\s*([\d,]+\.?\d{0,2})/i);
    if (priceMatch) {
      const parsed = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (parsed > 1 && parsed < 100000) price = parsed;
    }
  }

  // Availability meta
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

async function fetchDirectHtml(productUrl) {
  const res = await fetchWithTimeout(productUrl, FETCH_TIMEOUT);
  if (!res.ok) return null;
  const html = await res.text();
  return parseHtml(html);
}

// ============================================================
// LAYER 3: Jina Reader API — renders JavaScript, works on ANY site
// ============================================================

async function fetchViaJinaReader(productUrl) {
  const jinaUrl = `https://r.jina.ai/${productUrl}`;
  const res = await fetchWithTimeout(jinaUrl, FETCH_TIMEOUT, {
    headers: {
      'Accept': 'application/json',
      'X-No-Cache': 'true',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();

  const name = data.data?.title || '';
  const content = data.data?.content || '';
  const imageUrl = data.data?.image || '';

  // Extract price from rendered content
  const price = extractPriceFromText(content);

  // Check availability from rendered text
  let inStock = null;
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('add to cart') || lowerContent.includes('buy now') || lowerContent.includes('in stock')) {
    inStock = true;
  } else if (lowerContent.includes('out of stock') || lowerContent.includes('sold out') || lowerContent.includes('unavailable') || lowerContent.includes('currently unavailable')) {
    inStock = false;
  }

  if (!name && !price) return null;

  // Clean up title
  const cleanName = name
    .replace(/\s*[\|–—-]\s*(APMEX|SD Bullion|JM Bullion|Bold Precious Metals|Money Metals|Provident|Hero Bullion|eBay|Amazon|Walmart|Bullion Exchanges|SilverTowne|Kitco|BGASC|Golden Eagle|Liberty Coin).*$/i, '')
    .trim();

  return {
    name: cleanName || name,
    price,
    imageUrl,
    inStock,
    metal: parseMetalFromText(cleanName || name),
  };
}

// ============================================================
// MERGE HELPER — combine results, prefer non-null values
// ============================================================

function mergeResults(primary, secondary) {
  if (!secondary) return primary;
  if (!primary) return secondary;
  return {
    name: primary.name || secondary.name,
    price: primary.price ?? secondary.price,
    imageUrl: primary.imageUrl || secondary.imageUrl,
    inStock: primary.inStock ?? secondary.inStock,
    metal: primary.metal || secondary.metal,
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
// HANDLER — tries up to 3 layers to get product info
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

    // LAYER 1: Known dealer search API
    for (const dealer of DEALER_MAP) {
      if (dealer.pattern.test(productUrl) && slug) {
        try {
          result = await dealer.fetcher(slug);
        } catch { /* fall through */ }
        break;
      }
    }

    // LAYER 2: Direct HTML fetch (meta tags, JSON-LD)
    // Always try this — either as primary or to fill gaps from dealer API
    try {
      const htmlResult = await fetchDirectHtml(productUrl);
      result = mergeResults(result, htmlResult);
    } catch { /* ignore */ }

    // LAYER 3: Jina Reader (renders JS) — only if we're still missing price
    if (!result || result.price === null) {
      try {
        const jinaResult = await fetchViaJinaReader(productUrl);
        result = mergeResults(result, jinaResult);
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
