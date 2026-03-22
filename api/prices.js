// Vercel serverless function — fetches live metal prices
// Caches in Supabase so the external API is only called once per day

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const supabase = getSupabase();

    // 1. Check Supabase for today's cached prices
    if (supabase) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: cached } = await supabase
        .from('cached_prices')
        .select('gold, silver, platinum, palladium, created_at')
        .eq('fetched_at', today)
        .limit(1)
        .single();

      if (cached && (cached.gold || cached.silver)) {
        return res.status(200).json({
          gold: cached.gold ? parseFloat(cached.gold) : null,
          silver: cached.silver ? parseFloat(cached.silver) : null,
          platinum: cached.platinum ? parseFloat(cached.platinum) : null,
          palladium: cached.palladium ? parseFloat(cached.palladium) : null,
          timestamp: cached.created_at,
          source: 'cache',
        });
      }
    }

    // 2. Fetch from external API
    const apiKey = process.env.METALS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'METALS_API_KEY not configured' });
    }

    const response = await fetch(
      `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU,XAG,XPT,XPD`
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Metals API error: ${text}` });
    }

    const data = await response.json();

    if (!data.success) {
      return res.status(500).json({ error: data.error || 'API returned failure' });
    }

    const rates = data.rates || {};
    const prices = {
      gold: rates.USDXAU || null,
      silver: rates.USDXAG || null,
      platinum: rates.USDXPT || null,
      palladium: rates.USDXPD || null,
      timestamp: new Date().toISOString(),
      source: 'api',
    };

    // 3. Cache in Supabase for today
    if (supabase && (prices.gold || prices.silver)) {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('cached_prices')
        .upsert(
          {
            fetched_at: today,
            gold: prices.gold,
            silver: prices.silver,
            platinum: prices.platinum,
            palladium: prices.palladium,
          },
          { onConflict: 'fetched_at' }
        )
        .then(() => {}) // fire and forget, don't block response
        .catch(() => {}); // ignore cache write errors
    }

    return res.status(200).json(prices);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
