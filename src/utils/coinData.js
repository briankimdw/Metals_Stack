// Common coin/bar descriptions for autocomplete suggestions
// Organized by metal for contextual suggestions

export const COIN_SUGGESTIONS = {
  gold: [
    'American Gold Eagle',
    'American Gold Buffalo',
    'Canadian Gold Maple Leaf',
    'South African Krugerrand',
    'Austrian Gold Philharmonic',
    'Chinese Gold Panda',
    'British Gold Britannia',
    'Australian Gold Kangaroo',
    'Mexican Gold Libertad',
    'American Gold Eagle Proof',
    'Saint-Gaudens Double Eagle',
    'Indian Head Gold Eagle',
    'British Sovereign',
    'Swiss Gold Franc',
    'PAMP Suisse Gold Bar',
    'Credit Suisse Gold Bar',
    'Valcambi Gold Bar',
    'Perth Mint Gold Bar',
    'Royal Canadian Mint Gold Bar',
    'Gold CombiBar',
  ],
  silver: [
    'American Silver Eagle',
    'Canadian Silver Maple Leaf',
    'Austrian Silver Philharmonic',
    'British Silver Britannia',
    'Australian Silver Kangaroo',
    'Chinese Silver Panda',
    'Mexican Silver Libertad',
    'Morgan Silver Dollar',
    'Peace Silver Dollar',
    'Walking Liberty Half Dollar',
    'American Silver Eagle Proof',
    'Junk Silver (90%)',
    'Constitutional Silver',
    'Silver Rounds (Generic)',
    'Sunshine Minting Silver Round',
    'Buffalo Silver Round',
    'PAMP Suisse Silver Bar',
    'Engelhard Silver Bar',
    'Johnson Matthey Silver Bar',
    'Royal Canadian Mint Silver Bar',
    'SilverTowne Silver Bar',
    'Asahi Silver Bar',
    'Perth Mint Silver Bar',
  ],
  platinum: [
    'American Platinum Eagle',
    'Canadian Platinum Maple Leaf',
    'Australian Platinum Koala',
    'British Platinum Britannia',
    'Isle of Man Platinum Noble',
    'PAMP Suisse Platinum Bar',
    'Valcambi Platinum Bar',
    'Credit Suisse Platinum Bar',
  ],
  palladium: [
    'Canadian Palladium Maple Leaf',
    'American Palladium Eagle',
    'PAMP Suisse Palladium Bar',
    'Valcambi Palladium Bar',
  ],
};

// Flatten all suggestions for general use
export const ALL_SUGGESTIONS = Object.values(COIN_SUGGESTIONS).flat();

// Weight unit conversions TO troy ounces
export const WEIGHT_UNITS = [
  { value: 'toz', label: 'troy oz', factor: 1 },
  { value: 'g', label: 'grams', factor: 0.0321507 },
  { value: 'kg', label: 'kg', factor: 32.1507 },
  { value: 'oz', label: 'oz (avoirdupois)', factor: 0.911458 },
  { value: 'dwt', label: 'pennyweight', factor: 0.05 },
];

// NLP-style search: parse a query into structured filters
export function parseSearchQuery(query) {
  const lower = query.toLowerCase().trim();
  if (!lower) return null;

  const filters = { text: [], metals: [], types: [], years: [], minOz: null, maxOz: null };

  // Extract year patterns like "2024" or "2023-2024"
  const yearRangeMatch = lower.match(/(\d{4})\s*-\s*(\d{4})/);
  if (yearRangeMatch) {
    const y1 = parseInt(yearRangeMatch[1]);
    const y2 = parseInt(yearRangeMatch[2]);
    if (y1 >= 1900 && y1 <= 2100 && y2 >= 1900 && y2 <= 2100) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        filters.years.push(String(y));
      }
    }
  } else {
    const yearMatches = lower.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
      filters.years.push(...yearMatches);
    }
  }

  // Extract metals
  const metalAliases = {
    gold: 'gold', au: 'gold', yellow: 'gold',
    silver: 'silver', ag: 'silver',
    platinum: 'platinum', pt: 'platinum', plat: 'platinum',
    palladium: 'palladium', pd: 'palladium',
  };
  for (const [alias, metal] of Object.entries(metalAliases)) {
    if (lower.includes(alias) && !filters.metals.includes(metal)) {
      filters.metals.push(metal);
    }
  }

  // Extract types
  const typeAliases = {
    coin: 'coin', coins: 'coin',
    bar: 'bar', bars: 'bar', ingot: 'bar', ingots: 'bar',
    round: 'round', rounds: 'round',
  };
  for (const [alias, type] of Object.entries(typeAliases)) {
    if (new RegExp(`\\b${alias}\\b`).test(lower) && !filters.types.includes(type)) {
      filters.types.push(type);
    }
  }

  // Extract weight filters like ">5oz", "under 1oz", "10oz"
  const weightPatterns = [
    { re: /(?:over|above|more than|greater than|>)\s*(\d+\.?\d*)\s*oz/i, fn: (v) => { filters.minOz = v; } },
    { re: /(?:under|below|less than|smaller than|<)\s*(\d+\.?\d*)\s*oz/i, fn: (v) => { filters.maxOz = v; } },
    { re: /(\d+\.?\d*)\s*oz\+/i, fn: (v) => { filters.minOz = v; } },
  ];
  for (const { re, fn } of weightPatterns) {
    const m = lower.match(re);
    if (m) fn(parseFloat(m[1]));
  }

  // Common coin name keywords to search in description
  const knownKeywords = [
    'eagle', 'buffalo', 'maple', 'krugerrand', 'panda', 'britannia',
    'kangaroo', 'libertad', 'philharmonic', 'sovereign', 'morgan',
    'peace', 'walking liberty', 'pamp', 'engelhard', 'jm', 'combibar',
    'proof', 'bu', 'ms', 'generic', 'junk', 'constitutional',
  ];

  // Build text search terms — everything that wasn't consumed by structured filters
  const words = lower.split(/\s+/);
  for (const word of words) {
    // Skip words already captured as metal/type/year
    if (metalAliases[word] || typeAliases[word]) continue;
    if (/^(19|20)\d{2}$/.test(word)) continue;
    if (/^[<>]/.test(word)) continue;
    if (['over', 'above', 'under', 'below', 'more', 'less', 'than', 'greater', 'smaller', 'oz', 'and', 'or', 'my', 'all', 'the', 'in', 'with'].includes(word)) continue;
    if (word.length > 1) filters.text.push(word);
  }

  return filters;
}

// Apply parsed filters to a list of holdings
export function filterHoldings(holdings, query) {
  const filters = parseSearchQuery(query);
  if (!filters) return holdings;

  return holdings.filter((h) => {
    // Metal filter
    if (filters.metals.length > 0 && !filters.metals.includes(h.metal)) return false;

    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(h.type)) return false;

    // Year filter (check description and purchaseDate)
    if (filters.years.length > 0) {
      const desc = (h.description || '').toLowerCase();
      const date = h.purchaseDate || '';
      const hasYear = filters.years.some((y) => desc.includes(y) || date.startsWith(y));
      if (!hasYear) return false;
    }

    // Weight filters
    if (filters.minOz !== null && h.quantity < filters.minOz) return false;
    if (filters.maxOz !== null && h.quantity > filters.maxOz) return false;

    // Text search (fuzzy match against description, notes, metal name, type)
    if (filters.text.length > 0) {
      const searchable = `${h.description} ${h.notes} ${h.metal} ${h.type}`.toLowerCase();
      const allMatch = filters.text.every((term) => searchable.includes(term));
      if (!allMatch) return false;
    }

    return true;
  });
}
