export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="bookGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#9d27b0" />
        </linearGradient>
        <linearGradient id="yellowSwoosh" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="greenSwoosh" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <radialGradient id="pageGrad">
          <stop offset="20%" stopColor="#6d28d9" />
          <stop offset="95%" stopColor="#4f46e5" />
        </radialGradient>
      </defs>

      {/* Book */}
      <path d="M100 175 L30 160 A 5 5 0 0 1 25 155 V 45 A 5 5 0 0 1 30 40 L100 25 L170 40 A 5 5 0 0 1 175 45 V 155 A 5 5 0 0 1 170 160 L100 175 Z" fill="url(#bookGrad)" />
      <path d="M100 175 L90 172 V 28 L100 25 Z" fill="#000" opacity="0.1" />
      <path d="M100 175 L110 172 V 28 L100 25 Z" fill="#000" opacity="0.1" />

      {/* Pages */}
      <ellipse cx="100" cy="100" rx="65" ry="55" fill="url(#pageGrad)" />

      {/* Concentric circles */}
      <circle cx="100" cy="100" r="45" stroke="white" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="100" r="35" stroke="white" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="100" r="25" stroke="white" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />

      {/* Swooshes */}
      <path d="M50 85 C 80 65, 120 65, 150 85" stroke="url(#yellowSwoosh)" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M60 115 C 90 135, 130 135, 160 115" stroke="url(#greenSwoosh)" strokeWidth="12" fill="none" strokeLinecap="round" />

      {/* Play Button */}
      <circle cx="100" cy="100" r="15" fill="#f59e0b" />
      <polygon points="95,93 109,100 95,107" fill="white" />
      
      {/* Particles */}
      <rect x="145" y="45" width="8" height="8" rx="2" fill="#facc15" />
      <rect x="158" y="60" width="5" height="5" rx="1" fill="#facc15" opacity="0.8" />
      <rect x="40" y="50" width="7" height="7" rx="1.5" fill="#34d399" />
      <circle cx="55" cy="70" r="4" fill="#8b5cf6" />
      <circle cx="155" cy="125" r="3" fill="#facc15" />
      <circle cx="45" cy="110" r="2" fill="#8b5cf6" />
      <rect x="135" y="140" width="6" height="6" rx="1" fill="#34d399" transform="rotate(45 138 143)"/>
      <rect x="60" y="130" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
    </svg>
  );
}
