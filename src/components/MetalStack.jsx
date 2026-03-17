import { METALS, formatCurrency } from '../utils/constants';
import { SvgDefs, CoinSVG, BarSVG } from './CoinArt';

export default function MetalStack({ metalSummaries }) {
  const hasAny = Object.values(metalSummaries).some((m) => m.holdings.length > 0);

  return (
    <div className="stack-section">
      <SvgDefs />
      <h2 className="section-title">Your Stack</h2>

      {!hasAny ? (
        <div className="stack-empty">
          <div className="stack-empty-icon">📦</div>
          <span>Add some metals to build your stack!</span>
        </div>
      ) : (
        <div className="stack-container">
          {Object.entries(metalSummaries).map(([key, summary]) => {
            if (summary.holdings.length === 0) return null;

            const items = [];
            let idx = 0;
            for (const holding of summary.holdings) {
              const isCoin = holding.type === 'coin' || holding.type === 'round';
              const count = Math.min(Math.ceil(holding.quantity), 8);
              for (let j = 0; j < count; j++) {
                items.push(
                  isCoin ? (
                    <CoinSVG
                      key={`${holding.id}-${j}`}
                      metal={key}
                      size={76}
                      className="stack-piece stack-piece-coin"
                      style={{ animationDelay: `${idx * 0.07}s` }}
                    />
                  ) : (
                    <BarSVG
                      key={`${holding.id}-${j}`}
                      metal={key}
                      size={124}
                      className="stack-piece stack-piece-bar"
                      style={{ animationDelay: `${idx * 0.07}s` }}
                    />
                  ),
                );
                idx++;
              }
            }

            return (
              <div key={key} className="stack-column">
                <div className="stack-items">{items}</div>
                <div className="stack-platform" />
                <div className="stack-reflection" />
                <div className="stack-label">
                  <div className="stack-label-name" style={{ color: METALS[key].color }}>
                    {summary.name}
                  </div>
                  <div className="stack-label-qty">{summary.totalOz.toFixed(2)} oz</div>
                  <div className="stack-label-value">{formatCurrency(summary.currentValue)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
