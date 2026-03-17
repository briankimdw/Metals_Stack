export const METALS = {
  gold: {
    name: 'Gold',
    symbol: 'Au',
    color: '#FFD700',
    darkColor: '#B8860B',
    shine: '#FFF8DC',
    defaultPrice: 2935.0,
  },
  silver: {
    name: 'Silver',
    symbol: 'Ag',
    color: '#C0C0C0',
    darkColor: '#808080',
    shine: '#F0F0F0',
    defaultPrice: 32.8,
  },
  platinum: {
    name: 'Platinum',
    symbol: 'Pt',
    color: '#E5E4E2',
    darkColor: '#8E8E8C',
    shine: '#FAFAFA',
    defaultPrice: 985.0,
  },
  palladium: {
    name: 'Palladium',
    symbol: 'Pd',
    color: '#BFC1BF',
    darkColor: '#6B6D6B',
    shine: '#E0E2E0',
    defaultPrice: 955.0,
  },
};

export const FORM_TYPES = [
  { value: 'coin', label: 'Coin' },
  { value: 'bar', label: 'Bar' },
  { value: 'round', label: 'Round' },
  { value: 'other', label: 'Other' },
];

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatPercent = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};
