/** Funky TTT Finance AI mark — inline SVG, no external assets. */

export function TttFinanceLogo() {
  return (
    <div className="ttt-logo-wrap" aria-hidden>
      <svg className="ttt-logo-svg" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ttt-frame-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="45%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="ttt-inner-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="ttt-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="4"
          y="4"
          width="64"
          height="64"
          rx="18"
          fill="#0c1222"
          stroke="url(#ttt-frame-grad)"
          strokeWidth="2.5"
          className="ttt-logo-frame"
        />

        {/* Stylised "TTT" pillars — finance skyline */}
        <path
          fill="url(#ttt-inner-grad)"
          filter="url(#ttt-glow)"
          className="ttt-logo-pillars"
          d="M18 52V28h6v24h-6zm15 0V22h6v30h-6zm15 0V34h6v18h-6z"
        />

        {/* Tiny upward trend / AI spark */}
        <path
          className="ttt-logo-spark"
          d="M52 18 L58 12 L58 16 L52 22 Z"
          fill="#fde68a"
          opacity="0.95"
        />
        <circle cx="14" cy="16" r="2.5" fill="#67e8f9" className="ttt-logo-dot" />
        <circle cx="56" cy="46" r="2" fill="#f472b6" className="ttt-logo-dot ttt-logo-dot-delay" />
      </svg>
    </div>
  );
}
