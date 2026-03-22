// Vercel serverless function — searches multiple precious metals dealers in parallel
// Returns normalized product results for price comparison

import * as cheerio from 'cheerio';

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

// --- APMEX (server-rendered HTML) ---
async function fetchAPMEX(query) {
  const url = `https://www.apmex.com/search?q=${encodeURIComponent(query)}`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];
  $('.mod-product-card.product-item').each((i, el) => {
    if (i >= 12) return false;
    const card = $(el);
    const title = card.find('.mod-product-title').text().trim();
    const priceText = card.find('.price').first().text().trim();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const linkPath = card.find('a.item-link').attr('href') || '';
    const productUrl = linkPath ? `https://www.apmex.com/${linkPath.replace(/^\//, '')}` : '';
    const img = card.find('img').first();
    const imageUrl = img.attr('data-src') || img.attr('src') || '';

    if (title && price > 0) {
      results.push({
        dealer: 'APMEX',
        dealerSlug: 'apmex',
        title,
        price,
        priceLabel: 'As Low As',
        productUrl,
        imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
        inStock: true,
        sku: '',
      });
    }
  });

  return results;
}

// --- Hero Bullion (WooCommerce HTML) ---
async function fetchHeroBullion(query) {
  const url = `https://www.herobullion.com/?s=${encodeURIComponent(query)}&post_type=product`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];
  $('.products .product').each((i, el) => {
    if (i >= 12) return false;
    const card = $(el);
    const title = card.find('.woocommerce-loop-product__title').text().trim();
    const priceText = card.find('.price').text().trim();
    // Extract the numeric price — "as low as $90.77" or "$90.77"
    const priceMatch = priceText.match(/\$([0-9,]+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
    const link = card.find('a').first().attr('href') || '';
    const img = card.find('img').first();
    const imageUrl = img.attr('data-src') || img.attr('src') || '';
    const stockEl = card.find('.stock, .out-of-stock');
    const stockText = stockEl.text().trim().toLowerCase();
    const inStock = !stockText.includes('out of stock');

    if (title && price > 0) {
      results.push({
        dealer: 'Hero Bullion',
        dealerSlug: 'herobullion',
        title,
        price,
        priceLabel: 'As low as',
        productUrl: link,
        imageUrl,
        inStock,
        sku: '',
      });
    }
  });

  return results;
}

// --- Provident Metals (HTML with SearchSpring) ---
async function fetchProvident(query) {
  const url = `https://www.providentmetals.com/search?q=${encodeURIComponent(query)}`;

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];
  $('.cat-product').each((i, el) => {
    if (i >= 12) return false;
    const card = $(el);
    const linkEl = card.find('span a, a').first();
    const title = linkEl.text().trim() || card.find('.product-name').text().trim();
    const priceText = card.find('.price').text().trim();
    const priceMatch = priceText.match(/\$([0-9,]+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
    const link = linkEl.attr('href') || '';
    const productUrl = link.startsWith('http') ? link : `https://www.providentmetals.com${link}`;
    const img = card.find('.thumbnail img, img').first();
    const imageUrl = img.attr('data-src') || img.attr('src') || '';

    if (title && price > 0) {
      results.push({
        dealer: 'Provident Metals',
        dealerSlug: 'provident',
        title,
        price,
        priceLabel: 'As low as',
        productUrl,
        imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
        inStock: true,
        sku: '',
      });
    }
  });

  return results;
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

  // Default: assume 1 oz for coins
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
    { name: 'Hero Bullion', fn: fetchHeroBullion },
    { name: 'Provident Metals', fn: fetchProvident },
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
