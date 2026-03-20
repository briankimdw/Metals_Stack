export const COIN_CATALOG = [
  // Gold coins
  { slug: 'american-eagle-gold', name: 'American Gold Eagle', metal: 'gold', type: 'coin', emblem: 'eagle' },
  { slug: 'american-buffalo-gold', name: 'American Gold Buffalo', metal: 'gold', type: 'coin', emblem: 'buffalo' },
  { slug: 'canadian-maple-gold', name: 'Canadian Gold Maple Leaf', metal: 'gold', type: 'coin', emblem: 'maple' },
  { slug: 'south-african-krugerrand', name: 'South African Krugerrand', metal: 'gold', type: 'coin', emblem: 'springbok' },
  { slug: 'austrian-philharmonic-gold', name: 'Austrian Gold Philharmonic', metal: 'gold', type: 'coin', emblem: 'philharmonic' },
  { slug: 'british-britannia-gold', name: 'British Gold Britannia', metal: 'gold', type: 'coin', emblem: 'britannia' },
  { slug: 'australian-kangaroo-gold', name: 'Australian Gold Kangaroo', metal: 'gold', type: 'coin', emblem: 'kangaroo' },
  { slug: 'chinese-panda-gold', name: 'Chinese Gold Panda', metal: 'gold', type: 'coin', emblem: 'panda' },
  { slug: 'mexican-libertad-gold', name: 'Mexican Gold Libertad', metal: 'gold', type: 'coin', emblem: 'liberty' },
  { slug: 'generic-gold-bar', name: 'Gold Bar (Generic)', metal: 'gold', type: 'bar', emblem: 'star' },

  // Silver coins
  { slug: 'american-eagle-silver', name: 'American Silver Eagle', metal: 'silver', type: 'coin', emblem: 'eagle' },
  { slug: 'canadian-maple-silver', name: 'Canadian Silver Maple Leaf', metal: 'silver', type: 'coin', emblem: 'maple' },
  { slug: 'british-britannia-silver', name: 'British Silver Britannia', metal: 'silver', type: 'coin', emblem: 'britannia' },
  { slug: 'australian-kangaroo-silver', name: 'Australian Silver Kangaroo', metal: 'silver', type: 'coin', emblem: 'kangaroo' },
  { slug: 'austrian-philharmonic-silver', name: 'Austrian Silver Philharmonic', metal: 'silver', type: 'coin', emblem: 'philharmonic' },
  { slug: 'morgan-silver-dollar', name: 'Morgan Silver Dollar', metal: 'silver', type: 'coin', emblem: 'liberty' },
  { slug: 'generic-silver-round', name: 'Silver Round (Generic)', metal: 'silver', type: 'round', emblem: 'star' },
  { slug: 'generic-silver-bar', name: 'Silver Bar (Generic)', metal: 'silver', type: 'bar', emblem: 'star' },

  // Platinum coins
  { slug: 'american-eagle-platinum', name: 'American Platinum Eagle', metal: 'platinum', type: 'coin', emblem: 'eagle' },
  { slug: 'canadian-maple-platinum', name: 'Canadian Platinum Maple Leaf', metal: 'platinum', type: 'coin', emblem: 'maple' },
  { slug: 'generic-platinum-bar', name: 'Platinum Bar (Generic)', metal: 'platinum', type: 'bar', emblem: 'laurel' },

  // Palladium coins
  { slug: 'american-eagle-palladium', name: 'American Palladium Eagle', metal: 'palladium', type: 'coin', emblem: 'eagle' },
  { slug: 'canadian-maple-palladium', name: 'Canadian Palladium Maple Leaf', metal: 'palladium', type: 'coin', emblem: 'maple' },
  { slug: 'generic-palladium-bar', name: 'Palladium Bar (Generic)', metal: 'palladium', type: 'bar', emblem: 'hexagon' },
];

export function getCatalogEntry(slug) {
  return COIN_CATALOG.find((c) => c.slug === slug) || null;
}

export function getCatalogByMetal(metal) {
  return COIN_CATALOG.filter((c) => c.metal === metal);
}
