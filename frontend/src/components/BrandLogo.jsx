// Lingua Hub mark: two overlapping speech bubbles - a teal one and a coral one - for two
// people talking. Drawn in SVG so it stays sharp at any size and follows the theme.
export function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="4" y="5" width="30" height="23" rx="9" fill="#14b8a6" />
      <path d="M10 26l-1 10 10-8z" fill="#14b8a6" />
      <rect x="16" y="18" width="28" height="22" rx="9" fill="#ff6b57" style={{ stroke: 'var(--surface)' }} strokeWidth="2.5" />
      <path d="M38 38l2 7-9-6z" fill="#ff6b57" />
      {[13, 19, 25].map((x) => <circle key={`a${x}`} cx={x} cy="14" r="1.9" fill="#fff" />)}
      {[25, 31, 37].map((x) => <circle key={`b${x}`} cx={x} cy="29" r="1.9" fill="#fff" />)}
    </svg>
  )
}

export function BrandWordmark({ className = 'text-[20px]' }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`} style={{ color: 'var(--ink)' }}>
      Lingua<span style={{ color: '#ff6b57' }}>Hub</span>
    </span>
  )
}
