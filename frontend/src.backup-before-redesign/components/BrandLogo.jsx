// LanguagePro mark: a rounded indigo badge with a globe (meridians) and a coral "speech" dot,
// for learning languages around the world. Drawn in SVG so it stays sharp at any size.
export function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#4f46e5" />
      <circle cx="24" cy="24" r="12" fill="none" stroke="#fff" strokeWidth="2.5" />
      <ellipse cx="24" cy="24" rx="5" ry="12" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M12 24h24M14 17.5h20M14 30.5h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="37" cy="11" r="5" fill="#ff6b57" style={{ stroke: '#4f46e5' }} strokeWidth="2.5" />
    </svg>
  )
}

export function BrandWordmark({ className = 'text-[20px]' }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`} style={{ color: 'var(--ink)' }}>
      Language<span style={{ color: '#ff6b57' }}>Pro</span>
    </span>
  )
}
