// Vercel serverless function — searches multiple precious metals dealers in parallel
// Returns normalized product results for price comparison

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 7000; // 7s per dealer, leaves headroom under 10s Vercel limit

// ============================================================
// DEALER PARSERS
// ============================================================

// --- JM Bullion (SearchSpring JSON API) ---
async function fetchJMBullion(query) {
  const siteId = '7hkez9';
  const url = `https://${siteId}.a.searchspring.io/api/search/search.json?siteId=${siteId}&q=${encodeURIComponent(query)}&resultsFormat=native&page=1&resultsPerPage=12`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const results = (data.results || []).slice(0, 12).map((p) => ({
    dealer: 'JM Bullion',
    dealerSlug: 'jmbullion',
    title: p.name || '',
    price: parseFloat(p.price) || 0,
    priceLabel: 'As low as',
    productUrl: p.url ? (p.url.startsWith('http') ? p.url : `https://www.jmbullion.com${p.url}`) : '',
    imageUrl: p.imageUrl || p.thumbnailImageUrl || '',
    inStock: p.instock === '1' || p.instock === 1,
    sku: p.sku || '',
  }));

  return results.filter((r) => r.price > 0);
}

// --- APMEX (Unbxd Search JSON API) ---
async function fetchAPMEX(query) {
  const apiKey = '6c75a24fd9b5c369578cc79d061f070b';
  const siteName = 'prod-apmex807791568789776';
  const url = `https://search.unbxd.io/${apiKey}/${siteName}/search?q=${encodeURIComponent(query)}&rows=12&fields=productId,title,price,imageUrl,productUrl,availability`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const products = data?.response?.products || [];
  return products
    .map((p) => ({
      dealer: 'APMEX',
      dealerSlug: 'apmex',
      title: p.title || '',
      price: parseFloat(p.price) || 0,
      priceLabel: 'As low as',
      productUrl: p.productUrl ? `https://www.apmex.com/${p.productUrl}` : '',
      imageUrl: Array.isArray(p.imageUrl) ? p.imageUrl[0] || '' : p.imageUrl || '',
      inStock: p.availability === 'true' || p.availability === true,
      sku: p.productId || '',
    }))
    .filter((r) => r.price > 0);
}

// --- Bullion Exchanges (Magento GraphQL API) ---
async function fetchBullionExchanges(query) {
  const url = 'https://bullionexchanges.com/graphql';
  const graphqlQuery = {
    query: `{
      products(search: "${query.replace(/"/g, '\\"')}", pageSize: 12) {
        items {
          name
          sku
          price_range {
            minimum_price {
              final_price { value currency }
            }
          }
          url_key
          small_image { url }
          stock_status
        }
      }
    }`,
  };

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Origin': 'https://bullionexchanges.com',
      'Referer': 'https://bullionexchanges.com/',
    },
    body: JSON.stringify(graphqlQuery),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const items = data?.data?.products?.items || [];
  return items
    .map((p) => {
      const price = p.price_range?.minimum_price?.final_price?.value || 0;
      return {
        dealer: 'Bullion Exchanges',
        dealerSlug: 'bullionexchanges',
        title: p.name || '',
        price,
        priceLabel: 'As low as',
        productUrl: p.url_key ? `https://bullionexchanges.com/${p.url_key}` : '',
        imageUrl: p.small_image?.url || '',
        inStock: p.stock_status === 'IN_STOCK',
        sku: p.sku || '',
      };
    })
    .filter((r) => r.price > 0);
}

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

// Try to extract weight from product title
function parseWeightFromTitle(title) {
  const lower = title.toLowerCase();

  // Match patterns like "1 oz", "10 oz", "1/2 oz", "0.5 oz", "1/10 oz"
  const ozMatch = lower.match(/(\d+\/\d+|\d+\.?\d*)\s*(?:troy\s*)?oz/);
  if (ozMatch) {
    const val = ozMatch[1];
    if (val.includes('/')) {
      const [num, den] = val.split('/');
      return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(val);
  }

  // Match kg
  const kgMatch = lower.match(/(\d+\.?\d*)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 32.151;

  // Match grams
  const gMatch = lower.match(/(\d+\.?\d*)\s*(?:gram|g\b)/);
  if (gMatch) return parseFloat(gMatch[1]) * 0.032151;

  return null;
}

// Try to detect metal from title
function parseMetalFromTitle(title) {
  const lower = title.toLowerCase();
  if (lower.includes('gold') || lower.includes('eagle gold') || lower.includes('krugerrand')) return 'gold';
  if (lower.includes('silver') || lower.includes('eagle silver')) return 'silver';
  if (lower.includes('platinum')) return 'platinum';
  if (lower.includes('palladium')) return 'palladium';
  return null;
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing search query parameter: ?q=...' });
  }

  const dealers = [
    { name: 'JM Bullion', fn: fetchJMBullion },
    { name: 'APMEX', fn: fetchAPMEX },
    { name: 'Bullion Exchanges', fn: fetchBullionExchanges },
  ];

  const settledResults = await Promise.allSettled(
    dealers.map((d) => d.fn(query.trim()))
  );

  const results = [];
  const errors = [];

  settledResults.forEach((settled, i) => {
    if (settled.status === 'fulfilled') {
      results.push(...settled.value);
    } else {
      errors.push(`${dealers[i].name}: ${settled.reason?.message || 'Unknown error'}`);
    }
  });

  // Enrich results with parsed weight and metal
  for (const r of results) {
    r.weightOz = parseWeightFromTitle(r.title);
    r.metal = parseMetalFromTitle(r.title);
  }

  // Sort by price ascending
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
