#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRICES_PATH = resolve(__dirname, '..', 'public', 'data', 'prices.json');

const API_KEY = process.env.METALPRICEAPI_KEY;
const API_URL = 'https://api.metalpriceapi.com/v1/latest';

const SYMBOL_MAP = {
  USDXAU: 'gold',
  USDXAG: 'silver',
  USDXPT: 'platinum',
  USDXPD: 'palladium',
};

async function main() {
  if (!API_KEY) {
    console.error('METALPRICEAPI_KEY env var is required');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(PRICES_PATH, 'utf-8'));

  const url = `${API_URL}?api_key=${API_KEY}&base=USD&currencies=XAU,XAG,XPT,XPD`;
  console.log('Fetching prices from MetalpriceAPI…');
  const res = await fetch(url);
  const json = await res.json();

  if (!json.success) {
    console.error('API error:', json.error?.info || JSON.stringify(json));
    process.exit(1);
  }

  const prices = {};
  for (const [symbol, metalKey] of Object.entries(SYMBOL_MAP)) {
    const rate = json.rates?.[symbol];
    if (rate !== undefined) {
      // API returns USD per unit as inverse (1/oz), so invert back to price per oz
      prices[metalKey] = parseFloat((1 / rate).toFixed(2));
    }
  }

  if (Object.keys(prices).length === 0) {
    console.error('No price data returned');
    process.exit(1);
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  data.latest = {
    ...prices,
    timestamp: now.toISOString(),
  };

  const existingIdx = data.history.findIndex((e) => e.date === dateStr);
  const historyEntry = { date: dateStr, ...prices };

  if (existingIdx >= 0) {
    data.history[existingIdx] = historyEntry;
  } else {
    data.history.push(historyEntry);
  }

  // Keep at most 365 days of history
  if (data.history.length > 365) {
    data.history = data.history.slice(-365);
  }

  writeFileSync(PRICES_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated prices for ${dateStr}:`, prices);
}

main();
