// Vercel serverless function — fetches product info from ANY URL
// 3-layer approach, layers 2+3 run in parallel for speed:
// 1. Known dealers → search API (fastest, most accurate)
// 2. Direct HTML fetch → meta tags, JSON-LD (parallel with 3)
// 3. Jina Reader API → renders JavaScript, works on JS-heavy sites (parallel with 2)

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
  if ((lower.includes('gold') || lower.includes('krugerrand') || lower.includes('buffalo') || lower.includes('sovereign')) && !lower.includes('silver')) return 'gold';
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

function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    let best = '';
    for (const seg of segments) {
      const cleaned = seg.replace(/\.html?$/i, '').replace(/[-_]/g, ' ').trim();
      if (/^\d+$/.test(cleaned)) continue;
      if (['product', 'products', 'item', 'items', 'p', 'dp', 'catalog', 'shop', 'collections', 'category'].includes(cleaned.toLowerCase())) continue;
      if (cleaned.length > best.length) best = cleaned;
    }
    return best || '';
  } catch {
    return '';
  }
}

function cleanTitle(name) {
  if (!name) return '';
  return name
    .replace(/\s*[\|–—-]\s*(APMEX|SD Bullion|JM Bullion|Bold Precious Metals|Money Metals|Provident|Hero Bullion|eBay|Amazon|Walmart|Bullion Exchanges|SilverTowne|Kitco|BGASC|Golden Eagle|Liberty Coin|Nashville Coin|Gainesville|Monument|Silver\.com|GoldSilver).*$/i, '')
    .trim();
}

// Smart price extraction — skips spot prices in nav bars
function extractProductPrice(text) {
  const lines = text.split('\n');

  // Strategy 1: Find price near product-related keywords
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('as low as') || line.includes('your price') || line.includes('our price') ||
        line.includes('buy price') || line.includes('sale price') || line.includes('unit price')) {
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        const priceMatch = lines[j].match(/\$\s*([\d,]+\.\d{2})/);
        if (priceMatch) {
          const p = parseFloat(priceMatch[1].replace(/,/g, ''));
          if (p > 1 && p < 100000) return p;
        }
      }
    }
  }

  // Strategy 2: Find price near "add to cart" (within 15 lines before it)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('add to cart') || lines[i].toLowerCase().includes('add to bag') || lines[i].toLowerCase().includes('buy now')) {
      for (let j = Math.max(0, i - 15); j <= i; j++) {
        const priceMatch = lines[j].match(/\$\s*([\d,]+\.\d{2})/);
        if (priceMatch) {
          const p = parseFloat(priceMatch[1].replace(/,/g, ''));
          if (p > 1 && p < 100000) return p;
        }
      }
    }
  }

  // Strategy 3: Collect all prices, skip first 5 lines (nav/header spot prices)
  const allPrices = [];
  for (let i = 5; i < lines.length; i++) {
    const matches = lines[i].matchAll(/\$\s*([\d,]+\.\d{2})/g);
    for (const m of matches) {
      const p = parseFloat(m[1].replace(/,/g, ''));
      if (p > 1 && p < 100000) allPrices.push(p);
    }
  }

  if (allPrices.length === 0) {
    // Try including all lines as fallback
    const allMatches = text.matchAll(/\$\s*([\d,]+\.\d{2})/g);
    for (const m of allMatches) {
      const p = parseFloat(m[1].replace(/,/g, ''));
      if (p > 1 && p < 100000) allPrices.push(p);
    }
  }

  if (allPrices.length === 0) return null;

  // Count frequency — product price often appears multiple times (qty tiers)
  const freq = {};
  for (const p of allPrices) {
    const key = p.toFixed(2);
    freq[key] = (freq[key] || 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1] || parseFloat(a[0]) - parseFloat(b[0]));

  // Return most frequent price
  for (const [priceStr, count] of sorted) {
    if (count === 1 && allPrices.length > 5) continue; // skip one-off prices when many exist
    return parseFloat(priceStr);
  }

  return allPrices[0];
}

// ============================================================
// KNOWN DEALER FETCHERS (only confirmed working IDs)
// ============================================================

async function fetchFromSearchSpring(siteId, slug) {
  const url = `https://${siteId}.a.searchspring.io/api/search/search.json?siteId=${siteId}&q=${encodeURIComponent(slug)}&resultsFormat=native&page=1&resultsPerPage=5`;
  const res = await fetchWithTimeout(url, 5000);
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
  const res = await fetchWithTimeout(url, 5000);
  if (!res.ok) return null;
  const data = await res.json();
  const p = data?.response?.products?.[0];
  if (!p) return null;

  // Don't trust Unbxd availability — it's often wrong. Leave as null so HTML/Jina can fill it.
  return {
    name: decodeEntities(p.title || ''),
    price: parseFloat(p.sellPrice) || parseFloat(p.price) || null,
    imageUrl: Array.isArray(p.imageUrl) ? p.imageUrl[0] || '' : p.imageUrl || '',
    inStock: null, // intentionally null — let page scraping determine this
    metal: parseMetalFromText(p.title || ''),
  };
}

async function fetchFromHeroBullion(slug) {
  const url = `https://www.herobullion.com/wp-json/wc/store/v1/products?search=${encodeURIComponent(slug)}&per_page=5`;
  const res = await fetchWithTimeout(url, 5000);
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
// LAYER 2: Direct HTML — meta tags, JSON-LD
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
  name = cleanTitle(name);

  let price = null;
  let inStock = null;

  // JSON-LD structured data (most reliable for price + availability)
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      let ld = JSON.parse(m[1]);
      if (ld['@graph']) {
        const product = ld['@graph'].find((item) => item['@type'] === 'Product');
        if (product) ld = product;
      }
      if (Array.isArray(ld)) {
        const product = ld.find((item) => item['@type'] === 'Product');
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
          else if (avail.includes('outofstock') || avail.includes('out_of_stock') || avail.includes('soldout') || avail.includes('discontinued')) inStock = false;
        }
      }
      if (ld['@type'] === 'Product' && ld.name) {
        const ldName = cleanTitle(decodeEntities(ld.name));
        if (ldName && (!name || ldName.length > name.length)) name = ldName;
      }
      if (!price && ld.price) price = parseFloat(ld.price);
    } catch { /* ignore malformed JSON-LD */ }
  }

  // Meta tags for price
  if (!price) {
    const metaPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
    if (metaPrice) price = parseFloat(metaPrice);
  }

  // Inline price patterns (CSS class-based)
  if (!price) {
    const pricePatterns = [
      /class=["'][^"']*(?:product|item)[-_]?price[^"']*["'][^>]*>[^<]*\$\s*([\d,]+\.\d{2})/i,
      /class=["'][^"']*price[^"']*["'][^>]*>\s*\$\s*([\d,]+\.\d{2})/i,
      /itemprop=["']price["'][^>]*content=["']([\d.]+)["']/i,
    ];
    for (const re of pricePatterns) {
      const match = html.match(re);
      if (match) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (parsed > 1 && parsed < 100000) { price = parsed; break; }
      }
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

  // Add-to-cart button as in-stock signal
  if (inStock === null) {
    if (html.match(/add[- ]to[- ]cart/i) || html.match(/buy[- ]now/i)) inStock = true;
  }

  const imageUrl = getMeta('og:image') || '';

  if (!name && !price) return null;

  return {
    name: name || '',
    price: price && !isNaN(price) ? price : null,
    imageUrl,
    inStock,
    metal: (name ? parseMetalFromText(name) : null),
  };
}

async function fetchDirectHtml(productUrl) {
  const res = await fetchWithTimeout(productUrl, 5000);
  if (!res.ok) return null;
  const html = await res.text();
  return parseHtml(html);
}

// ============================================================
// LAYER 3: Jina Reader — renders JS, works on any site
// ============================================================

async function fetchViaJinaReader(productUrl) {
  const jinaUrl = `https://r.jina.ai/${productUrl}`;
  const res = await fetchWithTimeout(jinaUrl, 7000, {
    headers: {
      'Accept': 'application/json',
      'X-No-Cache': 'true',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();

  let name = cleanTitle(data.data?.title || '');
  const content = data.data?.content || '';
  const imageUrl = data.data?.image || '';

  const price = extractProductPrice(content);

  let inStock = null;
  const lowerContent = content.toLowerCase();
  // Check for in-stock signals first
  if (lowerContent.includes('add to cart') || lowerContent.includes('buy now') || lowerContent.includes('in stock')) {
    inStock = true;
  }
  // Out-of-stock overrides in-stock if both appear (out-of-stock is more specific)
  if (lowerContent.includes('out of stock') || lowerContent.includes('sold out') || lowerContent.includes('currently unavailable')) {
    inStock = false;
  }

  if (!name && !price) return null;

  return {
    name: name || '',
    price,
    imageUrl,
    inStock,
    metal: parseMetalFromText(name || content.slice(0, 500)),
  };
}

// ============================================================
// MERGE — combine results, prefer non-null values
// For availability: prefer the result that actually scraped the page (HTML/Jina)
// over dealer API which is often wrong
// ============================================================

function mergeResults(primary, secondary) {
  if (!secondary) return primary;
  if (!primary) return secondary;
  return {
    name: primary.name || secondary.name,
    price: primary.price ?? secondary.price,
    imageUrl: primary.imageUrl || secondary.imageUrl,
    // For inStock: prefer a non-null value; if both non-null, prefer secondary (page scrape)
    inStock: primary.inStock ?? secondary.inStock,
    metal: primary.metal || secondary.metal,
  };
}

// ============================================================
// DEALER ROUTING — only confirmed working IDs
// ============================================================

const DEALER_MAP = [
  { pattern: /jmbullion\.com/i, fetcher: (slug) => fetchFromSearchSpring('7hkez9', slug) },
  { pattern: /apmex\.com/i, fetcher: fetchFromAPMEX },
  { pattern: /providentmetals\.com/i, fetcher: (slug) => fetchFromSearchSpring('46h6lo', slug) },
  { pattern: /herobullion\.com/i, fetcher: fetchFromHeroBullion },
];

// ============================================================
// HANDLER — dealer API first, then HTML + Jina in parallel
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
    let dealerResult = null;

    // LAYER 1: Known dealer search API (fast, ~1-2s)
    for (const dealer of DEALER_MAP) {
      if (dealer.pattern.test(productUrl) && slug) {
        try {
          dealerResult = await dealer.fetcher(slug);
        } catch { /* fall through */ }
        break;
      }
    }

    // LAYERS 2+3: Run HTML fetch and Jina Reader IN PARALLEL
    // This is the key optimization — instead of waiting 5s for HTML then 7s for Jina,
    // we race them both and merge whatever comes back
    const [htmlSettled, jinaSettled] = await Promise.allSettled([
      fetchDirectHtml(productUrl),
      // Only call Jina if we're still missing price or name after dealer API
      (!dealerResult || !dealerResult.price || !dealerResult.name)
        ? fetchViaJinaReader(productUrl)
        : Promise.resolve(null),
    ]);

    const htmlResult = htmlSettled.status === 'fulfilled' ? htmlSettled.value : null;
    const jinaResult = jinaSettled.status === 'fulfilled' ? jinaSettled.value : null;

    // Merge: dealer (name/price) + HTML (JSON-LD price/availability) + Jina (JS-rendered fallback)
    // HTML and Jina are more reliable for availability since they scrape the actual page
    let result = dealerResult;
    result = mergeResults(result, htmlResult);
    result = mergeResults(result, jinaResult);

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
