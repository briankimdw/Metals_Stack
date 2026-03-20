import { getCatalogEntry } from '../utils/coinCatalog';

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

const NAMED_EMBLEMS = {
  star: (c) => (
    <>
      <polygon
        points="50,18 55.5,36 74,36 59.5,46 65,64 50,53 35,64 40.5,46 26,36 44.5,36"
        fill="none" stroke={c.dark} strokeWidth="1.2" opacity="0.3"
      />
      <polygon
        points="50,23 54,35 69,35 57,43 62,58 50,50 38,58 43,43 31,35 46,35"
        fill={c.dark} opacity="0.06"
      />
      {[0, 72, 144, 216, 288].map((a) => (
        <line key={a} x1="50" y1="50" x2={50 + 30 * Math.cos((a - 90) * Math.PI / 180)}
          y2={50 + 30 * Math.sin((a - 90) * Math.PI / 180)}
          stroke={c.dark} strokeWidth="0.3" opacity="0.1"
        />
      ))}
    </>
  ),
  eagle: (c) => (
    <>
      <path
        d="M50 28 C50 28 38 32 30 42 C34 38 40 36 44 37 C40 40 37 46 36 50
           C38 46 42 43 46 42 C44 46 44 52 44 56 C46 52 48 48 50 46
           C52 48 54 52 56 56 C56 52 56 46 54 42 C58 43 62 46 64 50
           C63 46 60 40 56 37 C60 36 66 38 70 42 C62 32 50 28 50 28Z"
        fill={c.dark} opacity="0.12"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2"
      />
      <path
        d="M43 50 L43 58 Q50 66 57 58 L57 50 Z"
        fill="none" stroke={c.dark} strokeWidth="0.8" opacity="0.2"
      />
      <line x1="50" y1="50" x2="50" y2="62" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      <line x1="43" y1="54" x2="57" y2="54" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
    </>
  ),
  laurel: (c) => (
    <>
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
      <path d="M44 26 L47 22 L50 26 L53 22 L56 26" fill="none"
        stroke={c.dark} strokeWidth="0.8" opacity="0.25" />
      <circle cx="50" cy="44" r="8" fill="none"
        stroke={c.dark} strokeWidth="0.8" opacity="0.18" />
      <text x="50" y="47" textAnchor="middle" fontSize="7" fontWeight="700"
        fontFamily="Georgia, serif" fill={c.dark} opacity="0.18">Pt</text>
    </>
  ),
  hexagon: (c) => (
    <>
      <polygon
        points="50,22 64,30 64,48 50,56 36,48 36,30"
        fill="none" stroke={c.dark} strokeWidth="1" opacity="0.2"
      />
      <polygon
        points="50,26 61,32 61,46 50,52 39,46 39,32"
        fill={c.dark} opacity="0.05"
      />
      <line x1="50" y1="26" x2="50" y2="52" stroke={c.dark} strokeWidth="0.4" opacity="0.12" />
      <line x1="39" y1="32" x2="61" y2="46" stroke={c.dark} strokeWidth="0.4" opacity="0.12" />
      <line x1="61" y1="32" x2="39" y2="46" stroke={c.dark} strokeWidth="0.4" opacity="0.12" />
      <text x="50" y="43" textAnchor="middle" fontSize="8" fontWeight="700"
        fontFamily="Georgia, serif" fill={c.dark} opacity="0.15">Pd</text>
    </>
  ),
  liberty: (c) => (
    <>
      {/* Torch */}
      <rect x="48" y="22" width="4" height="20" rx="1" fill="none"
        stroke={c.dark} strokeWidth="0.8" opacity="0.2" />
      <path d="M45 22 Q50 14 55 22" fill={c.dark} opacity="0.08"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2" />
      {/* Flame */}
      <path d="M48 22 Q50 16 52 22" fill={c.dark} opacity="0.1" />
      <path d="M49 20 Q50 15 51 20" fill={c.dark} opacity="0.06" />
      {/* Rays from torch */}
      {[-30, -15, 0, 15, 30].map((a) => (
        <line key={a} x1="50" y1="18" x2={50 + 12 * Math.cos((a - 90) * Math.PI / 180)}
          y2={18 + 12 * Math.sin((a - 90) * Math.PI / 180)}
          stroke={c.dark} strokeWidth="0.4" opacity="0.12"
        />
      ))}
      {/* Base pedestal */}
      <rect x="44" y="44" width="12" height="4" rx="1" fill="none"
        stroke={c.dark} strokeWidth="0.6" opacity="0.18" />
      <rect x="42" y="48" width="16" height="6" rx="1" fill="none"
        stroke={c.dark} strokeWidth="0.6" opacity="0.18" />
    </>
  ),
  maple: (c) => (
    <>
      {/* Maple leaf */}
      <path
        d="M50 20 L52 28 L58 24 L56 30 L64 30 L58 34 L62 40 L56 38
           L56 44 L50 40 L44 44 L44 38 L38 40 L42 34 L36 30 L44 30
           L42 24 L48 28 Z"
        fill={c.dark} opacity="0.08"
        stroke={c.dark} strokeWidth="0.7" opacity="0.22"
      />
      {/* Stem */}
      <line x1="50" y1="44" x2="50" y2="56" stroke={c.dark} strokeWidth="0.8" opacity="0.18" />
      {/* Center vein */}
      <line x1="50" y1="24" x2="50" y2="44" stroke={c.dark} strokeWidth="0.3" opacity="0.1" />
      {/* Side veins */}
      <line x1="50" y1="32" x2="42" y2="28" stroke={c.dark} strokeWidth="0.3" opacity="0.08" />
      <line x1="50" y1="32" x2="58" y2="28" stroke={c.dark} strokeWidth="0.3" opacity="0.08" />
      <line x1="50" y1="36" x2="40" y2="36" stroke={c.dark} strokeWidth="0.3" opacity="0.08" />
      <line x1="50" y1="36" x2="60" y2="36" stroke={c.dark} strokeWidth="0.3" opacity="0.08" />
    </>
  ),
  buffalo: (c) => (
    <>
      {/* Buffalo body */}
      <path
        d="M30 44 Q32 34 40 32 Q44 30 48 32 L52 32 Q56 30 60 32 Q68 34 70 44
           Q68 50 62 52 L38 52 Q32 50 30 44Z"
        fill={c.dark} opacity="0.08"
        stroke={c.dark} strokeWidth="0.7" opacity="0.2"
      />
      {/* Head hump */}
      <path d="M36 34 Q38 24 46 26 Q42 28 40 32" fill={c.dark} opacity="0.06"
        stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      {/* Horn */}
      <path d="M40 28 Q36 22 38 20" fill="none"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2" />
      {/* Eye */}
      <circle cx="42" cy="32" r="1" fill={c.dark} opacity="0.15" />
      {/* Legs */}
      <line x1="40" y1="52" x2="38" y2="60" stroke={c.dark} strokeWidth="0.8" opacity="0.15" />
      <line x1="44" y1="52" x2="43" y2="60" stroke={c.dark} strokeWidth="0.8" opacity="0.15" />
      <line x1="56" y1="52" x2="57" y2="60" stroke={c.dark} strokeWidth="0.8" opacity="0.15" />
      <line x1="60" y1="52" x2="62" y2="60" stroke={c.dark} strokeWidth="0.8" opacity="0.15" />
      {/* Tail */}
      <path d="M70 44 Q74 40 72 36" fill="none"
        stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
    </>
  ),
  britannia: (c) => (
    <>
      {/* Helmet */}
      <path d="M44 26 Q50 18 56 26 L54 28 L46 28 Z"
        fill={c.dark} opacity="0.08"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2" />
      {/* Helmet crest */}
      <path d="M50 18 Q52 14 50 12 Q48 14 50 18" fill={c.dark} opacity="0.1" />
      {/* Head/face */}
      <circle cx="50" cy="32" r="5" fill="none"
        stroke={c.dark} strokeWidth="0.7" opacity="0.18" />
      {/* Shield */}
      <path d="M40 38 L40 52 Q50 60 60 52 L60 38 Z"
        fill={c.dark} opacity="0.06"
        stroke={c.dark} strokeWidth="0.7" opacity="0.2" />
      {/* Shield cross */}
      <line x1="50" y1="38" x2="50" y2="56" stroke={c.dark} strokeWidth="0.5" opacity="0.12" />
      <line x1="40" y1="46" x2="60" y2="46" stroke={c.dark} strokeWidth="0.5" opacity="0.12" />
      {/* Trident */}
      <line x1="64" y1="24" x2="64" y2="56" stroke={c.dark} strokeWidth="0.6" opacity="0.18" />
      <line x1="61" y1="27" x2="64" y2="24" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      <line x1="67" y1="27" x2="64" y2="24" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      <line x1="64" y1="24" x2="64" y2="20" stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
    </>
  ),
  kangaroo: (c) => (
    <>
      {/* Kangaroo body */}
      <path
        d="M44 52 Q42 42 44 36 Q46 30 50 28 Q54 30 56 36 Q58 42 56 48 L60 52"
        fill={c.dark} opacity="0.08"
        stroke={c.dark} strokeWidth="0.7" opacity="0.2"
      />
      {/* Head */}
      <path d="M50 28 Q54 24 56 22 Q56 26 54 28"
        fill={c.dark} opacity="0.06"
        stroke={c.dark} strokeWidth="0.5" opacity="0.18" />
      {/* Ears */}
      <path d="M54 22 Q56 18 55 16" fill="none"
        stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      <path d="M56 22 Q58 18 57 16" fill="none"
        stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      {/* Eye */}
      <circle cx="55" cy="23" r="0.8" fill={c.dark} opacity="0.15" />
      {/* Tail */}
      <path d="M44 48 Q36 44 32 36 Q30 30 32 26"
        fill="none" stroke={c.dark} strokeWidth="0.8" opacity="0.18" />
      {/* Legs */}
      <path d="M52 48 Q54 54 58 58" fill="none"
        stroke={c.dark} strokeWidth="0.7" opacity="0.15" />
      <path d="M48 48 Q50 54 54 58" fill="none"
        stroke={c.dark} strokeWidth="0.7" opacity="0.15" />
      {/* Feet */}
      <line x1="58" y1="58" x2="64" y2="58" stroke={c.dark} strokeWidth="0.8" opacity="0.15" />
      <line x1="54" y1="58" x2="60" y2="58" stroke={c.dark} strokeWidth="0.8" opacity="0.15" />
    </>
  ),
  philharmonic: (c) => (
    <>
      {/* Organ pipes */}
      {[-12, -6, 0, 6, 12].map((x, i) => {
        const h = [24, 18, 14, 18, 24][i];
        return (
          <rect key={x} x={47 + x} y={20 + (24 - h)} width="4" height={h} rx="1"
            fill="none" stroke={c.dark} strokeWidth="0.6" opacity="0.2" />
        );
      })}
      {/* Base/stage */}
      <rect x="32" y="46" width="36" height="4" rx="1"
        fill={c.dark} opacity="0.06"
        stroke={c.dark} strokeWidth="0.6" opacity="0.18" />
      {/* Decorative base trim */}
      <rect x="34" y="50" width="32" height="3" rx="1"
        fill="none" stroke={c.dark} strokeWidth="0.5" opacity="0.12" />
      {/* Top arch */}
      <path d="M34 20 Q50 8 66 20" fill="none"
        stroke={c.dark} strokeWidth="0.7" opacity="0.18" />
    </>
  ),
  springbok: (c) => (
    <>
      {/* Springbok body */}
      <path
        d="M38 46 Q36 38 40 32 Q44 28 50 30 Q56 28 60 32 Q64 38 62 46"
        fill={c.dark} opacity="0.07"
        stroke={c.dark} strokeWidth="0.7" opacity="0.2"
      />
      {/* Head */}
      <path d="M40 32 Q36 28 34 24"
        fill="none" stroke={c.dark} strokeWidth="0.6" opacity="0.18" />
      {/* Horns */}
      <path d="M35 24 Q32 18 34 14" fill="none"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2" />
      <path d="M36 24 Q34 18 36 14" fill="none"
        stroke={c.dark} strokeWidth="0.6" opacity="0.2" />
      {/* Eye */}
      <circle cx="36" cy="26" r="0.8" fill={c.dark} opacity="0.15" />
      {/* Legs */}
      <line x1="42" y1="46" x2="40" y2="58" stroke={c.dark} strokeWidth="0.7" opacity="0.15" />
      <line x1="46" y1="46" x2="44" y2="58" stroke={c.dark} strokeWidth="0.7" opacity="0.15" />
      <line x1="54" y1="46" x2="56" y2="58" stroke={c.dark} strokeWidth="0.7" opacity="0.15" />
      <line x1="58" y1="46" x2="60" y2="58" stroke={c.dark} strokeWidth="0.7" opacity="0.15" />
      {/* Tail */}
      <path d="M62 42 Q66 38 64 34" fill="none"
        stroke={c.dark} strokeWidth="0.5" opacity="0.12" />
    </>
  ),
  panda: (c) => (
    <>
      {/* Head */}
      <circle cx="50" cy="36" r="12" fill={c.dark} opacity="0.06"
        stroke={c.dark} strokeWidth="0.7" opacity="0.2" />
      {/* Ears */}
      <circle cx="40" cy="26" r="4" fill={c.dark} opacity="0.1"
        stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      <circle cx="60" cy="26" r="4" fill={c.dark} opacity="0.1"
        stroke={c.dark} strokeWidth="0.5" opacity="0.15" />
      {/* Eye patches */}
      <ellipse cx="44" cy="34" rx="4" ry="3" fill={c.dark} opacity="0.12"
        transform="rotate(-10 44 34)" />
      <ellipse cx="56" cy="34" rx="4" ry="3" fill={c.dark} opacity="0.12"
        transform="rotate(10 56 34)" />
      {/* Eyes */}
      <circle cx="44" cy="34" r="1.2" fill={c.dark} opacity="0.06" />
      <circle cx="56" cy="34" r="1.2" fill={c.dark} opacity="0.06" />
      {/* Nose */}
      <ellipse cx="50" cy="39" rx="2" ry="1.5" fill={c.dark} opacity="0.1" />
      {/* Body */}
      <ellipse cx="50" cy="54" rx="10" ry="8" fill={c.dark} opacity="0.05"
        stroke={c.dark} strokeWidth="0.5" opacity="0.12" />
    </>
  ),
};

// Map old metal-keyed emblems to named ones for backward compatibility
const METAL_DEFAULT_EMBLEM = {
  gold: 'star',
  silver: 'eagle',
  platinum: 'laurel',
  palladium: 'hexagon',
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

export function CoinSVG({ metal, size = 72, emblem: emblemName, className, style }) {
  const c = COLORS[metal];
  const resolvedEmblem = emblemName || METAL_DEFAULT_EMBLEM[metal] || 'star';
  const emblem = NAMED_EMBLEMS[resolvedEmblem] || NAMED_EMBLEMS.star;
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

      {/* Emblem */}
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

export function CoinThumbnail({ imageUrl, metal, size = 36 }) {
  if (!imageUrl) {
    return <CoinSVG metal={metal} size={size} />;
  }

  if (imageUrl.startsWith('catalog:')) {
    const slug = imageUrl.slice(8);
    const entry = getCatalogEntry(slug);
    if (entry) {
      if (entry.type === 'bar') {
        return <BarSVG metal={entry.metal} size={size * 1.5} />;
      }
      return <CoinSVG metal={entry.metal} size={size} emblem={entry.emblem} />;
    }
    return <CoinSVG metal={metal} size={size} />;
  }

  return (
    <img
      src={imageUrl}
      alt="coin"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(255,255,255,0.1)',
      }}
    />
  );
}

export function CatalogCoinSVG({ emblem, metal, size = 64 }) {
  return <CoinSVG metal={metal} size={size} emblem={emblem} />;
}
