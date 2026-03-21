// Cute cartoon capybara SVG mascot - used throughout the app
export function CapybaraLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="50" cy="62" rx="30" ry="25" fill="#C4956A" />
      {/* Belly */}
      <ellipse cx="50" cy="68" rx="18" ry="15" fill="#E8D5B7" />
      {/* Head */}
      <ellipse cx="50" cy="35" rx="24" ry="22" fill="#C4956A" />
      {/* Snout */}
      <ellipse cx="50" cy="44" rx="14" ry="10" fill="#D4AD82" />
      {/* Nose */}
      <ellipse cx="50" cy="40" rx="5" ry="3.5" fill="#6B4226" />
      {/* Eyes */}
      <circle cx="39" cy="30" r="4" fill="#2C1810" />
      <circle cx="61" cy="30" r="4" fill="#2C1810" />
      {/* Eye shine */}
      <circle cx="40.5" cy="28.5" r="1.5" fill="white" />
      <circle cx="62.5" cy="28.5" r="1.5" fill="white" />
      {/* Ears */}
      <ellipse cx="32" cy="18" rx="6" ry="5" fill="#C4956A" transform="rotate(-15 32 18)" />
      <ellipse cx="68" cy="18" rx="6" ry="5" fill="#C4956A" transform="rotate(15 68 18)" />
      <ellipse cx="32" cy="18" rx="4" ry="3" fill="#D4AD82" transform="rotate(-15 32 18)" />
      <ellipse cx="68" cy="18" rx="4" ry="3" fill="#D4AD82" transform="rotate(15 68 18)" />
      {/* Mouth */}
      <path d="M 45 46 Q 50 50 55 46" stroke="#6B4226" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="34" cy="38" rx="5" ry="3" fill="#E8A0A0" opacity="0.4" />
      <ellipse cx="66" cy="38" rx="5" ry="3" fill="#E8A0A0" opacity="0.4" />
      {/* Feet */}
      <ellipse cx="35" cy="85" rx="8" ry="4" fill="#A07850" />
      <ellipse cx="65" cy="85" rx="8" ry="4" fill="#A07850" />
    </svg>
  );
}

export function CapybaraWave({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="60" cy="72" rx="34" ry="28" fill="#C4956A" />
      {/* Belly */}
      <ellipse cx="60" cy="78" rx="20" ry="17" fill="#E8D5B7" />
      {/* Head */}
      <ellipse cx="60" cy="42" rx="26" ry="24" fill="#C4956A" />
      {/* Snout */}
      <ellipse cx="60" cy="52" rx="15" ry="11" fill="#D4AD82" />
      {/* Nose */}
      <ellipse cx="60" cy="48" rx="5.5" ry="3.5" fill="#6B4226" />
      {/* Eyes - happy squint */}
      <path d="M 46 36 Q 49 32 52 36" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 68 36 Q 71 32 74 36" stroke="#2C1810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <ellipse cx="40" cy="22" rx="7" ry="5.5" fill="#C4956A" transform="rotate(-15 40 22)" />
      <ellipse cx="80" cy="22" rx="7" ry="5.5" fill="#C4956A" transform="rotate(15 80 22)" />
      <ellipse cx="40" cy="22" rx="4.5" ry="3.5" fill="#D4AD82" transform="rotate(-15 40 22)" />
      <ellipse cx="80" cy="22" rx="4.5" ry="3.5" fill="#D4AD82" transform="rotate(15 80 22)" />
      {/* Happy mouth */}
      <path d="M 53 55 Q 60 61 67 55" stroke="#6B4226" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="43" cy="46" rx="5" ry="3.5" fill="#E8A0A0" opacity="0.5" />
      <ellipse cx="77" cy="46" rx="5" ry="3.5" fill="#E8A0A0" opacity="0.5" />
      {/* Waving arm */}
      <path d="M 90 65 Q 100 50 95 38" stroke="#C4956A" strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="95" cy="36" r="5" fill="#C4956A" />
      {/* Feet */}
      <ellipse cx="42" cy="97" rx="9" ry="5" fill="#A07850" />
      <ellipse cx="72" cy="97" rx="9" ry="5" fill="#A07850" />
      {/* Gold coin in other hand */}
      <circle cx="32" cy="72" r="8" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
      <text x="32" y="75" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#8B6914">$</text>
    </svg>
  );
}

export function CapybaraSleeping({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
      {/* Body - lying down */}
      <ellipse cx="50" cy="55" rx="38" ry="18" fill="#C4956A" />
      {/* Belly */}
      <ellipse cx="55" cy="58" rx="20" ry="12" fill="#E8D5B7" />
      {/* Head resting */}
      <ellipse cx="22" cy="42" rx="18" ry="16" fill="#C4956A" />
      {/* Snout */}
      <ellipse cx="15" cy="48" rx="10" ry="7" fill="#D4AD82" />
      {/* Nose */}
      <ellipse cx="12" cy="46" rx="3.5" ry="2.5" fill="#6B4226" />
      {/* Closed eyes */}
      <path d="M 18 38 Q 22 35 26 38" stroke="#2C1810" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="14" cy="43" rx="4" ry="2.5" fill="#E8A0A0" opacity="0.4" />
      {/* Ears */}
      <ellipse cx="15" cy="28" rx="5" ry="4" fill="#C4956A" transform="rotate(-20 15 28)" />
      <ellipse cx="30" cy="26" rx="5" ry="4" fill="#C4956A" transform="rotate(10 30 26)" />
      {/* Zzz */}
      <text x="38" y="25" fontSize="12" fontWeight="bold" fill="#D4AD82" opacity="0.6">z</text>
      <text x="48" y="18" fontSize="10" fontWeight="bold" fill="#D4AD82" opacity="0.4">z</text>
      <text x="55" y="12" fontSize="8" fontWeight="bold" fill="#D4AD82" opacity="0.25">z</text>
      {/* Feet */}
      <ellipse cx="80" cy="65" rx="6" ry="4" fill="#A07850" />
      <ellipse cx="70" cy="67" rx="6" ry="4" fill="#A07850" />
    </svg>
  );
}

export function CapybaraWithGold({ size = 160 }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">
      {/* Gold bar stack */}
      <rect x="110" y="120" width="60" height="18" rx="3" fill="url(#capy-gold1)" />
      <rect x="116" y="105" width="48" height="18" rx="3" fill="url(#capy-gold2)" />
      <rect x="122" y="90" width="36" height="18" rx="3" fill="url(#capy-gold3)" />

      {/* Body */}
      <ellipse cx="70" cy="110" rx="45" ry="35" fill="#C4956A" />
      {/* Belly */}
      <ellipse cx="70" cy="118" rx="26" ry="22" fill="#E8D5B7" />
      {/* Head */}
      <ellipse cx="70" cy="60" rx="32" ry="30" fill="#C4956A" />
      {/* Snout */}
      <ellipse cx="70" cy="73" rx="18" ry="13" fill="#D4AD82" />
      {/* Nose */}
      <ellipse cx="70" cy="68" rx="6.5" ry="4.5" fill="#6B4226" />
      {/* Eyes - sparkly */}
      <circle cx="55" cy="52" r="5.5" fill="#2C1810" />
      <circle cx="85" cy="52" r="5.5" fill="#2C1810" />
      <circle cx="57" cy="50" r="2" fill="white" />
      <circle cx="87" cy="50" r="2" fill="white" />
      {/* Star sparkles in eyes */}
      <circle cx="54" cy="53.5" r="0.8" fill="white" opacity="0.6" />
      <circle cx="84" cy="53.5" r="0.8" fill="white" opacity="0.6" />
      {/* Ears */}
      <ellipse cx="46" cy="35" rx="8" ry="7" fill="#C4956A" transform="rotate(-15 46 35)" />
      <ellipse cx="94" cy="35" rx="8" ry="7" fill="#C4956A" transform="rotate(15 94 35)" />
      <ellipse cx="46" cy="35" rx="5" ry="4.5" fill="#D4AD82" transform="rotate(-15 46 35)" />
      <ellipse cx="94" cy="35" rx="5" ry="4.5" fill="#D4AD82" transform="rotate(15 94 35)" />
      {/* Happy mouth */}
      <path d="M 62 78 Q 70 85 78 78" stroke="#6B4226" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="48" cy="66" rx="6" ry="4" fill="#E8A0A0" opacity="0.45" />
      <ellipse cx="92" cy="66" rx="6" ry="4" fill="#E8A0A0" opacity="0.45" />
      {/* Arms hugging gold */}
      <path d="M 100 100 Q 115 95 120 108" stroke="#C4956A" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* Feet */}
      <ellipse cx="48" cy="142" rx="10" ry="6" fill="#A07850" />
      <ellipse cx="85" cy="142" rx="10" ry="6" fill="#A07850" />
      {/* Sparkles around */}
      <text x="140" y="80" fontSize="14" fill="#FFD700" opacity="0.7">&#10022;</text>
      <text x="160" y="100" fontSize="10" fill="#FFD700" opacity="0.5">&#10022;</text>
      <text x="30" y="30" fontSize="10" fill="#FFD700" opacity="0.4">&#10022;</text>
      <text x="15" y="80" fontSize="8" fill="#FFD700" opacity="0.3">&#10022;</text>

      <defs>
        <linearGradient id="capy-gold1" x1="110" y1="120" x2="170" y2="138" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" /><stop offset="1" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id="capy-gold2" x1="116" y1="105" x2="164" y2="123" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE44D" /><stop offset="1" stopColor="#DAA520" />
        </linearGradient>
        <linearGradient id="capy-gold3" x1="122" y1="90" x2="158" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8DC" /><stop offset="1" stopColor="#FFD700" />
        </linearGradient>
      </defs>
    </svg>
  );
}
