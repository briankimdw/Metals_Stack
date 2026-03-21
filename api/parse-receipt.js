// Vercel serverless function — parses receipt text/image via OpenAI
// to extract precious metal purchase details

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { text, imageBase64 } = req.body || {};
  if (!text && !imageBase64) {
    return res.status(400).json({ error: 'Provide "text" or "imageBase64"' });
  }

  const systemPrompt = `You are a precious metals receipt parser. Extract purchase details from the receipt and return ONLY valid JSON (no markdown, no code fences). If the receipt contains multiple line items, return an array. Each item should have:
- metal: "gold", "silver", "platinum", or "palladium"
- type: "coin", "bar", "round", or "other"
- description: the product name/description
- weightOz: weight in troy ounces per item (convert grams to troy oz if needed: 1g = 0.032151 toz, 1kg = 32.151 toz)
- count: number of this item purchased
- totalPaid: total amount paid for this line item in USD (after any discounts, before shipping)
- purchaseDate: date in YYYY-MM-DD format if found, otherwise null

Return format: { "items": [ { ... } ] }

If you cannot determine a field, use null. If the receipt is not for precious metals, return { "items": [] }.`;

  const messages = [{ role: 'system', content: systemPrompt }];

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: 'Parse this receipt image for precious metal purchases:' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `Parse this receipt for precious metal purchases:\n\n${text}`,
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini',
        messages,
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `OpenAI error: ${errText}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response (handle potential markdown fences)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: content });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
