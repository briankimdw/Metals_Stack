import { useState, useMemo } from 'react';
import { useDealerSearch } from '../hooks/useDealerSearch';
import { METALS, formatCurrency } from '../utils/constants';
import { CapybaraWave, CapybaraSleeping } from './CapybaraMascot';

const SORT_OPTIONS = [
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'premium-asc', label: 'Premium: Low to High' },
  { value: 'dealer', label: 'Dealer' },
];

const DEALER_COLORS = {
  jmbullion: '#D4A843',
  apmex: '#1A5DAB',
  herobullion: '#C62828',
  provident: '#2E7D32',
};

export default function SearchDealers({ prices, onClose }) {
  const { results, loading, error, search } = useDealerSearch();
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('price-asc');
  const [filterDealer, setFilterDealer] = useState('all');
  const [filterMetal, setFilterMetal] = useState('all');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      search(searchInput);
    }
  };

  // Get spot price for a metal
  const getSpotPrice = (metal) => {
    if (!metal || !prices[metal]) return null;
    return prices[metal] || METALS[metal]?.defaultPrice || null;
  };

  // Filter and sort results
  const displayResults = useMemo(() => {
    if (!results?.results) return [];

    let list = [...results.results];

    // Filter by dealer
    if (filterDealer !== 'all') {
      list = list.filter((r) => r.dealerSlug === filterDealer);
    }

    // Filter by metal
    if (filterMetal !== 'all') {
      list = list.filter((r) => r.metal === filterMetal);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'premium-asc': {
          const pa = getPremiumPercent(a);
          const pb = getPremiumPercent(b);
          return (pa ?? 999) - (pb ?? 999);
        }
        case 'dealer': return a.dealer.localeCompare(b.dealer);
        default: return 0;
      }
    });

    return list;
  }, [results, sortBy, filterDealer, filterMetal]);

  // Get unique dealers from results for filter tabs
  const availableDealers = useMemo(() => {
    if (!results?.results) return [];
    const map = {};
    for (const r of results.results) {
      if (!map[r.dealerSlug]) {
        map[r.dealerSlug] = { slug: r.dealerSlug, name: r.dealer, count: 0 };
      }
      map[r.dealerSlug].count++;
    }
    return Object.values(map);
  }, [results]);

  // Get unique metals from results
  const availableMetals = useMemo(() => {
    if (!results?.results) return [];
    const set = new Set();
    for (const r of results.results) {
      if (r.metal) set.add(r.metal);
    }
    return Array.from(set);
  }, [results]);

  function getPremiumPercent(item) {
    if (!item.weightOz || !item.metal) return null;
    const spot = getSpotPrice(item.metal);
    if (!spot) return null;
    const pricePerOz = item.price / item.weightOz;
    return ((pricePerOz - spot) / spot) * 100;
  }

  function getPricePerOz(item) {
    if (!item.weightOz) return null;
    return item.price / item.weightOz;
  }

  function premiumClass(pct) {
    if (pct === null || pct === undefined) return '';
    if (pct < 5) return 'premium-low';
    if (pct < 15) return 'premium-mid';
    return 'premium-high';
  }

  return (
    <div className="dealer-search-page">
      {/* Header */}
      <div className="dealer-search-header">
        <div className="dealer-search-header-left">
          <button className="btn btn-ghost" onClick={onClose}>
            &larr; Back
          </button>
          <div>
            <h1 className="dealer-search-title">Search Dealers</h1>
            <span className="dealer-search-subtitle">Compare prices across multiple dealers</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <form className="dealer-search-form" onSubmit={handleSearch}>
        <div className="dealer-search-input-wrap">
          <SearchIcon />
          <input
            className="dealer-search-input"
            type="text"
            placeholder="Search coins, bars, rounds... (e.g. 2024 silver eagle)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !searchInput.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Spot Price Context */}
      {prices && (
        <div className="dealer-spot-bar">
          <span className="dealer-spot-label">Spot Prices:</span>
          {Object.entries(METALS).map(([key, m]) => (
            <span key={key} className="dealer-spot-item">
              <span className="dealer-spot-dot" style={{ background: m.color }} />
              {m.name} {formatCurrency(prices[key] || m.defaultPrice)}
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="dealer-loading">
          <div className="loading-spinner" />
          <p>Searching 4 dealers...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="dealer-error">
          <p>Search failed: {error}</p>
          <button className="btn btn-sm" onClick={() => search(searchInput)}>Retry</button>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          {/* Results Header */}
          <div className="dealer-results-header">
            <span className="dealer-results-count">
              {displayResults.length} result{displayResults.length !== 1 ? 's' : ''}
              {results.errors?.length > 0 && (
                <span className="dealer-errors-note" title={results.errors.join(', ')}>
                  ({results.errors.length} dealer{results.errors.length !== 1 ? 's' : ''} unavailable)
                </span>
              )}
            </span>
            <div className="dealer-results-controls">
              <select
                className="form-select dealer-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Tabs */}
          {(availableDealers.length > 1 || availableMetals.length > 1) && (
            <div className="dealer-filters">
              {availableDealers.length > 1 && (
                <div className="dealer-filter-group">
                  <button
                    className={`dealer-filter-tab ${filterDealer === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterDealer('all')}
                  >
                    All Dealers
                  </button>
                  {availableDealers.map((d) => (
                    <button
                      key={d.slug}
                      className={`dealer-filter-tab ${filterDealer === d.slug ? 'active' : ''}`}
                      onClick={() => setFilterDealer(d.slug)}
                    >
                      <span className="dealer-filter-dot" style={{ background: DEALER_COLORS[d.slug] || '#888' }} />
                      {d.name}
                      <span className="dealer-filter-count">{d.count}</span>
                    </button>
                  ))}
                </div>
              )}
              {availableMetals.length > 1 && (
                <div className="dealer-filter-group">
                  <button
                    className={`dealer-filter-tab ${filterMetal === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterMetal('all')}
                  >
                    All Metals
                  </button>
                  {availableMetals.map((m) => (
                    <button
                      key={m}
                      className={`dealer-filter-tab ${filterMetal === m ? 'active' : ''}`}
                      onClick={() => setFilterMetal(m)}
                    >
                      <span className="dealer-filter-dot" style={{ background: METALS[m]?.color || '#888' }} />
                      {METALS[m]?.name || m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          {displayResults.length > 0 ? (
            <div className="dealer-results-table-wrap">
              <table className="dealer-results-table">
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th>Product</th>
                    <th className="th-right">Price</th>
                    <th className="th-right">Price/oz</th>
                    <th className="th-right">Premium</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((item, i) => {
                    const pricePerOz = getPricePerOz(item);
                    const premium = getPremiumPercent(item);
                    return (
                      <tr key={`${item.dealerSlug}-${i}`}>
                        <td>
                          <div className="dealer-name-cell">
                            <span
                              className="dealer-dot"
                              style={{ background: DEALER_COLORS[item.dealerSlug] || '#888' }}
                            />
                            <span className="dealer-name">{item.dealer}</span>
                          </div>
                        </td>
                        <td>
                          <div className="dealer-product-cell">
                            {item.imageUrl && (
                              <img
                                className="dealer-product-thumb"
                                src={item.imageUrl}
                                alt=""
                                loading="lazy"
                              />
                            )}
                            <div className="dealer-product-info">
                              <span className="dealer-product-title">{item.title}</span>
                              {item.metal && item.weightOz && (
                                <span className="dealer-product-meta">
                                  {item.weightOz} oz {METALS[item.metal]?.name || item.metal}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="td-right">
                          <div className="dealer-price-cell">
                            <span className="dealer-price">{formatCurrency(item.price)}</span>
                            {item.priceLabel && (
                              <span className="dealer-price-label">{item.priceLabel}</span>
                            )}
                          </div>
                        </td>
                        <td className="td-right">
                          {pricePerOz ? (
                            <span className="dealer-price-per-oz">{formatCurrency(pricePerOz)}</span>
                          ) : (
                            <span className="dealer-na">---</span>
                          )}
                        </td>
                        <td className="td-right">
                          {premium !== null ? (
                            <span className={`dealer-premium ${premiumClass(premium)}`}>
                              {premium >= 0 ? '+' : ''}{premium.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="dealer-na">---</span>
                          )}
                        </td>
                        <td>
                          <span className={`stock-badge ${item.inStock ? 'in-stock' : 'out-of-stock'}`}>
                            {item.inStock ? 'In Stock' : 'Out'}
                          </span>
                        </td>
                        <td>
                          {item.productUrl && (
                            <a
                              className="btn btn-sm buy-link"
                              href={item.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Buy &rarr;
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dealer-empty">
              <CapybaraSleeping size={80} />
              <p>No results found. Try a different search term.</p>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!results && !loading && !error && (
        <div className="dealer-empty">
          <CapybaraWave size={140} />
          <h3>Find the best deals!</h3>
          <p>Search for coins, bars, and rounds across multiple dealers to compare prices and premiums.</p>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
