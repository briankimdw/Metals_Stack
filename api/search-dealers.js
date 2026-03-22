// Vercel serverless function — searches multiple precious metals dealers in parallel
// Returns normalized product results for price comparison

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 7000; // 7s per dealer, leaves headroom under 10s Vercel limit

// ============================================================
// UTILITIES
// ============================================================

function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'User-Agent': USER_AGENT,
      ...options.headers,
    },
  }).finally(() => clearTimeout(timer));
}

function parseWeightFromTitle(title) {
  const lower = title.toLowerCase();
  const ozMatch = lower.match(/(\d+\/\d+|\d+\.?\d*)\s*(?:troy\s*)?oz/);
  if (ozMatch) {
    const val = ozMatch[1];
    if (val.includes('/')) {
      const [num, den] = val.split('/');
      return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(val);
  }
  const kgMatch = lower.match(/(\d+\.?\d*)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 32.151;
  const gMatch = lower.match(/(\d+\.?\d*)\s*(?:gram|g\b)/);
  if (gMatch) return parseFloat(gMatch[1]) * 0.032151;
  return null;
}

function parseMetalFromTitle(title) {
  const lower = title.toLowerCase();
  if (lower.includes('gold') || lower.includes('krugerrand')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('platinum')) return 'platinum';
  if (lower.includes('palladium')) return 'palladium';
  return null;
}

// Decode HTML entities (&#8211; etc)
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

// ============================================================
// DEALER PARSERS
// ============================================================

// --- JM Bullion (SearchSpring JSON API) ---
async function fetchJMBullion(query) {
  const siteId = '7hkez9';
  const url = `https://${siteId}.a.searchspring.io/api/search/search.json?siteId=${siteId}&q=${encodeURIComponent(query)}&resultsFormat=native&page=1&resultsPerPage=48`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return (data.results || [])
    .map((p) => ({
      dealer: 'JM Bullion',
      dealerSlug: 'jmbullion',
      title: decodeEntities(p.name || ''),
      price: parseFloat(p.price) || 0,
      priceLabel: 'As low as',
      productUrl: p.url ? (p.url.startsWith('http') ? p.url : `https://www.jmbullion.com${p.url}`) : '',
      imageUrl: p.imageUrl || p.thumbnailImageUrl || '',
      inStock: p.instock === '1' || p.instock === 1,
      sku: p.sku || '',
    }))
    .filter((r) => r.price > 0);
}

// --- APMEX (Unbxd Search JSON API) ---
async function fetchAPMEX(query) {
  const apiKey = '6c75a24fd9b5c369578cc79d061f070b';
  const siteName = 'prod-apmex807791568789776';
  const url = `https://search.unbxd.io/${apiKey}/${siteName}/search?q=${encodeURIComponent(query)}&rows=48&fields=productId,title,price,imageUrl,productUrl,availability`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return (data?.response?.products || [])
    .map((p) => ({
      dealer: 'APMEX',
      dealerSlug: 'apmex',
      title: decodeEntities(p.title || ''),
      price: parseFloat(p.price) || 0,
      priceLabel: 'As low as',
      productUrl: p.productUrl ? `https://www.apmex.com/${p.productUrl}` : '',
      imageUrl: Array.isArray(p.imageUrl) ? p.imageUrl[0] || '' : p.imageUrl || '',
      inStock: p.availability === 'true' || p.availability === true,
      sku: p.productId || '',
    }))
    .filter((r) => r.price > 0);
}

// --- Provident Metals (SearchSpring JSON API) ---
async function fetchProvidentMetals(query) {
  const siteId = '46h6lo';
  const url = `https://${siteId}.a.searchspring.io/api/search/search.json?siteId=${siteId}&q=${encodeURIComponent(query)}&resultsFormat=native&page=1&resultsPerPage=48`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return (data.results || [])
    .map((p) => ({
      dealer: 'Provident Metals',
      dealerSlug: 'providentmetals',
      title: decodeEntities(p.name || ''),
      price: parseFloat(p.price) || 0,
      priceLabel: 'As low as',
      productUrl: p.url ? (p.url.startsWith('http') ? p.url : `https://www.providentmetals.com${p.url}`) : '',
      imageUrl: p.imageUrl || p.thumbnailImageUrl || '',
      inStock: p.instock === '1' || p.instock === 1,
      sku: p.sku || '',
    }))
    .filter((r) => r.price > 0);
}

// --- Hero Bullion (WooCommerce Store API) ---
async function fetchHeroBullion(query) {
  const url = `https://www.herobullion.com/wp-json/wc/store/v1/products?search=${encodeURIComponent(query)}&per_page=48`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return (Array.isArray(data) ? data : [])
    .map((p) => {
      // WooCommerce prices are in cents (string)
      const priceRaw = p.prices?.price || p.prices?.sale_price || '0';
      const price = parseInt(priceRaw, 10) / 100;

      // Get first image
      const imageUrl = p.images?.[0]?.src || p.images?.[0]?.thumbnail || '';

      return {
        dealer: 'Hero Bullion',
        dealerSlug: 'herobullion',
        title: decodeEntities(p.name || ''),
        price,
        priceLabel: 'As low as',
        productUrl: p.permalink || '',
        imageUrl,
        inStock: p.is_in_stock === true,
        sku: p.sku || '',
      };
    })
    .filter((r) => r.price > 0);
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query.q;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing search query parameter: ?q=...' });
  }

  const dealers = [
    { name: 'JM Bullion', fn: fetchJMBullion },
    { name: 'APMEX', fn: fetchAPMEX },
    { name: 'Provident Metals', fn: fetchProvidentMetals },
    { name: 'Hero Bullion', fn: fetchHeroBullion },
  ];

  const settled = await Promise.allSettled(
    dealers.map((d) => d.fn(query.trim()))
  );

  const results = [];
  const errors = [];

  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      results.push(...s.value);
    } else {
      errors.push(`${dealers[i].name}: ${s.reason?.message || 'Unknown error'}`);
    }
  });

  // Enrich with parsed weight and metal
  for (const r of results) {
    r.weightOz = parseWeightFromTitle(r.title);
    r.metal = parseMetalFromTitle(r.title);
  }

  results.sort((a, b) => a.price - b.price);

  return res.status(200).json({
    query: query.trim(),
    results,
    errors,
    dealerCount: dealers.length,
    resultCount: results.length,
    timestamp: new Date().toISOString(),
  });
}
