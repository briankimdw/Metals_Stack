const COLORS = {
  gold: {
    shine: '#FFF8DC', light: '#FFE44D', main: '#FFD700',
    mid: '#DAA520', dark: '#B8860B', shadow: '#8B6914',
  },
  silver: {
    shine: '#FFFFFF', light: '#F5F5F5', main: '#D4D4D4',
    mid: '#A8A8A8', dark: '#808080', shadow: '#5A5A5A',
  },
  platinum: {
    shine: '#FEFEFE', light: '#F0F0EE', main: '#E0E0DE',
    mid: '#B8B8B6', dark: '#8E8E8C', shadow: '#6A6A68',
  },
  palladium: {
    shine: '#F2F4F2', light: '#E0E2E0', main: '#C8CAC8',
    mid: '#9EA09E', dark: '#6B6D6B', shadow: '#4A4C4A',
  },
};

const EMBLEMS = {
  gold: (c) => (
    <>
      {/* 5-point star */}
      <polygon
        points="50,18 55.5,36 74,36 59.5,46 65,64 50,53 35,64 40.5,46 26,36 44.5,36"
        fill="none" stroke={c.dark} strokeWidth="1.2" opacity="0.3"
      />
      <polygon
        points="50,23 54,35 69,35 57,43 62,58 50,50 38,58 43,43 31,35 46,35"
        fill={c.dark} opacity="0.06"
      />
      {/* Small rays from star */}
      {[0, 72, 144, 216, 288].map((a) => (
        <line key={a} x1="50" y1="50" x2={50 + 30 * Math.cos((a - 90) * Math.PI / 180)}
          y2={50 + 30 * Math.sin((a - 90) * Math.PI / 180)}
          stroke={c.dark} strokeWidth="0.3" opacity="0.1"
        />
      ))}
    </>
  ),
  silver: (c) => (
    <>
      {/* Eagle wings spread */}
      <path
        d="M50 28 C50 28 38 32 30 42 C34 38 40 36 44 37 C40 40 37 46 36 50
           C38 46 42 43 46 42 C44 46 44 52 44 56 C46 52 48 48 50 46
           C52 48 54 52 56 56 C56 52 56 46 54 42 C58 43 62 46 64 50
           C63 46 60 40 56 37 C60 36 66 38 70 42 C62 32 50 28 50 28Z"
        fill={c.dark} opacity="0.12"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2"
      />
      {/* Shield body */}
      <path
        d="M43 50 L43 58 Q50 66 57 58 L57 50 Z"
        fill="none" stroke={c.dark} strokeWidth="0.8" opacity="0.2"
      />
      <line x1="50" y1="50" x2="50" y2="62" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      <line x1="43" y1="54" x2="57" y2="54" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
    </>
  ),
  platinum: (c) => (
    <>
      {/* Laurel wreath */}
      {[-1, 1].map((dir) => (
        <g key={dir} transform={`translate(50,50) scale(${dir},1) translate(-50,-50)`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse key={i}
              cx={34 - i * 0.5} cy={28 + i * 7}
              rx="5" ry="3"
              transform={`rotate(${-25 + i * 12} ${34 - i * 0.5} ${28 + i * 7})`}
              fill="none" stroke={c.dark} strokeWidth="0.6" opacity="0.2"
            />
          ))}
        </g>
      ))}
      {/* Crown at top */}
      <path d="M44 26 L47 22 L50 26 L53 22 L56 26" fill="none"
        stroke={c.dark} strokeWidth="0.8" opacity="0.25" />
      {/* Center circle */}
      <circle cx="50" cy="44" r="8" fill="none"
        stroke={c.dark} strokeWidth="0.8" opacity="0.18" />
      <text x="50" y="47" textAnchor="middle" fontSize="7" fontWeight="700"
        fontFamily="Georgia, serif" fill={c.dark} opacity="0.18">Pt</text>
    </>
  ),
  palladium: (c) => (
    <>
      {/* Hexagonal crystal */}
      <polygon
        points="50,22 64,30 64,48 50,56 36,48 36,30"
        fill="none" stroke={c.dark} strokeWidth="1" opacity="0.2"
      />
      <polygon
        points="50,26 61,32 61,46 50,52 39,46 39,32"
        fill={c.dark} opacity="0.05"
      />
      {/* Inner facets */}
      <line x1="50" y1="26" x2="50" y2="52" stroke={c.dark} strokeWidth="0.4" opacity="0.12" />
      <line x1="39" y1="32" x2="61" y2="46" stroke={c.dark} strokeWidth="0.4" opacity="0.12" />
      <line x1="61" y1="32" x2="39" y2="46" stroke={c.dark} strokeWidth="0.4" opacity="0.12" />
      {/* "Pd" text */}
      <text x="50" y="43" textAnchor="middle" fontSize="8" fontWeight="700"
        fontFamily="Georgia, serif" fill={c.dark} opacity="0.15">Pd</text>
    </>
  ),
};

const METAL_LABELS = {
  gold: 'FINE GOLD',
  silver: 'FINE SILVER',
  platinum: 'PLATINUM',
  palladium: 'PALLADIUM',
};

export function SvgDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {Object.entries(COLORS).map(([metal, c]) => (
          <g key={metal}>
            <radialGradient id={`coin-face-${metal}`} cx="36%" cy="34%" r="58%">
              <stop offset="0%" stopColor={c.shine} />
              <stop offset="25%" stopColor={c.light} />
              <stop offset="55%" stopColor={c.main} />
              <stop offset="85%" stopColor={c.mid} />
              <stop offset="100%" stopColor={c.dark} />
            </radialGradient>
            <linearGradient id={`coin-rim-${metal}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={c.light} />
              <stop offset="40%" stopColor={c.dark} />
              <stop offset="70%" stopColor={c.mid} />
              <stop offset="100%" stopColor={c.light} />
            </linearGradient>
            <linearGradient id={`bar-face-${metal}`} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor={c.shine} />
              <stop offset="20%" stopColor={c.light} />
              <stop offset="50%" stopColor={c.main} />
              <stop offset="80%" stopColor={c.mid} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            <linearGradient id={`bar-top-${metal}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.shine} stopOpacity="0.3" />
              <stop offset="100%" stopColor={c.main} stopOpacity="0" />
            </linearGradient>
          </g>
        ))}
      </defs>
    </svg>
  );
}

export function CoinSVG({ metal, size = 72, className, style }) {
  const c = COLORS[metal];
  const emblem = EMBLEMS[metal];
  const label = METAL_LABELS[metal];
  const dots = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 - 90) * (Math.PI / 180);
    return { x: 50 + 37 * Math.cos(angle), y: 50 + 37 * Math.sin(angle) };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      className={className} style={style}>
      {/* Drop shadow */}
      <circle cx="51" cy="52" r="46" fill="rgba(0,0,0,0.35)" />

      {/* Outer rim */}
      <circle cx="50" cy="50" r="48" fill={`url(#coin-rim-${metal})`} />

      {/* Reeded edge */}
      <circle cx="50" cy="50" r="47.5" fill="none"
        stroke={c.shadow} strokeWidth="2.8" strokeDasharray="1.6 0.9" />

      {/* Main coin face */}
      <circle cx="50" cy="50" r="43.5" fill={`url(#coin-face-${metal})`} />

      {/* Inner raised rim */}
      <circle cx="50" cy="50" r="40" fill="none"
        stroke={c.shine} strokeWidth="0.8" opacity="0.35" />
      <circle cx="50" cy="50" r="38.5" fill="none"
        stroke={c.dark} strokeWidth="0.5" opacity="0.3" />

      {/* Decorative dots around inner rim */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="0.8"
          fill={c.dark} opacity="0.15" />
      ))}

      {/* Metal-specific emblem */}
      {emblem(c)}

      {/* Text labels */}
      <text x="50" y="74" textAnchor="middle" fontSize="4.8"
        fontFamily="Georgia, 'Times New Roman', serif" fontWeight="600"
        fill={c.dark} opacity="0.35" letterSpacing="1.5">
        {label}
      </text>
      <text x="50" y="80" textAnchor="middle" fontSize="3.8"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={c.dark} opacity="0.25" letterSpacing="0.8">
        1 TROY OZ · 999.9
      </text>

      {/* Specular highlight */}
      <ellipse cx="38" cy="34" rx="18" ry="15"
        fill="white" opacity="0.09"
        transform="rotate(-20 38 34)" />
      <ellipse cx="36" cy="32" rx="10" ry="8"
        fill="white" opacity="0.06"
        transform="rotate(-20 36 32)" />

      {/* Edge highlight (top arc) */}
      <path d="M 18 30 A 40 40 0 0 1 70 16" fill="none"
        stroke="white" strokeWidth="0.6" opacity="0.12" />
    </svg>
  );
}

export function BarSVG({ metal, size = 120, className, style }) {
  const c = COLORS[metal];
  const label = METAL_LABELS[metal];
  const h = size * 0.35;

  return (
    <svg width={size} height={h} viewBox="0 0 160 56"
      className={className} style={style}>
      {/* Drop shadow */}
      <rect x="3" y="4" width="154" height="48" rx="3" fill="rgba(0,0,0,0.3)" />

      {/* Main bar body */}
      <rect x="0" y="0" width="156" height="48" rx="3.5" fill={`url(#bar-face-${metal})`} />

      {/* Top bevel highlight */}
      <rect x="1" y="1" width="154" height="12" rx="3" fill={`url(#bar-top-${metal})`} />

      {/* Outer border */}
      <rect x="0.5" y="0.5" width="155" height="47" rx="3" fill="none"
        stroke={c.dark} strokeWidth="0.6" opacity="0.3" />

      {/* Inner stamped border */}
      <rect x="8" y="7" width="140" height="34" rx="2" fill="none"
        stroke={c.dark} strokeWidth="0.7" opacity="0.2" />

      {/* Corner marks */}
      {[[12, 11], [144, 11], [12, 37], [144, 37]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.2" fill={c.dark} opacity="0.12" />
      ))}

      {/* Stamped text */}
      <text x="78" y="23" textAnchor="middle" fontSize="9" fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={c.dark} opacity="0.3" letterSpacing="3">
        {label}
      </text>
      <text x="78" y="34" textAnchor="middle" fontSize="6.5"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={c.dark} opacity="0.2" letterSpacing="1.5">
        1 OZ · 999.9 FINE
      </text>

      {/* Top edge gleam */}
      <line x1="15" y1="2" x2="100" y2="2"
        stroke="white" strokeWidth="0.8" opacity="0.15" strokeLinecap="round" />

      {/* Bottom edge shadow */}
      <rect x="4" y="42" width="148" height="5" rx="2" fill="rgba(0,0,0,0.06)" />
    </svg>
  );
}
