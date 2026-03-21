// Vercel serverless function — fetches live metal prices from metalpriceapi.com
// Cached for 24 hours via Cache-Control headers

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'METALS_API_KEY not configured' });
  }

  try {
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

    // metalpriceapi returns USDXAU = price of 1 troy oz of gold in USD
    const rates = data.rates || {};

    const prices = {
      gold: rates.USDXAU || null,
      silver: rates.USDXAG || null,
      platinum: rates.USDXPT || null,
      palladium: rates.USDXPD || null,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(prices);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
