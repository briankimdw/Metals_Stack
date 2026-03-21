// Vercel serverless function — fetches live metal prices once per day
// and caches via Cache-Control headers

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Cache for 24 hours on Vercel's edge and in the browser
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'METALS_API_KEY not configured' });
  }

  try {
    const response = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Metals API error: ${text}` });
    }

    const data = await response.json();

    // metals.dev returns: { status: "success", metals: { gold: 2935.12, silver: 32.80, ... } }
    const metals = data.metals || {};

    const prices = {
      gold: metals.gold || null,
      silver: metals.silver || null,
      platinum: metals.platinum || null,
      palladium: metals.palladium || null,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(prices);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
