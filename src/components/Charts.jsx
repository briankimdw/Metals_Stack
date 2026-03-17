import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency } from '../utils/constants';

const CHART_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  platinum: '#E5E4E2',
  palladium: '#BFC1BF',
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1C2235', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name || d.payload?.name}</div>
      <div style={{ color: '#8892A4' }}>{formatCurrency(d.value ?? d.payload?.pnl)}</div>
    </div>
  );
}

export default function Charts({ metalSummaries, totals }) {
  if (totals.totalValue === 0) return null;

  const allocationData = Object.entries(metalSummaries)
    .filter(([, s]) => s.currentValue > 0)
    .map(([key, s]) => ({
      name: s.name,
      value: s.currentValue,
      color: CHART_COLORS[key],
    }));

  const pnlData = Object.entries(metalSummaries)
    .filter(([, s]) => s.totalCost > 0)
    .map(([, s]) => ({
      name: s.name,
      pnl: parseFloat(s.pnl.toFixed(2)),
      fill: s.pnl >= 0 ? '#10B981' : '#EF4444',
    }));

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-card-title">Portfolio Allocation</div>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%" cy="50%"
              innerRadius={65} outerRadius={105}
              paddingAngle={3} dataKey="value" stroke="none"
            >
              {allocationData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ color: '#F0F0F0', fontSize: 13 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Profit / Loss by Metal</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={pnlData} barSize={44}>
            <XAxis
              dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: '#8892A4', fontSize: 13 }}
            />
            <YAxis
              axisLine={false} tickLine={false}
              tick={{ fill: '#8892A4', fontSize: 12 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {pnlData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
