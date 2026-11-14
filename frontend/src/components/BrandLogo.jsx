// LanPro mark: a mint speech bubble holding the letters "L" and "P" - two people talking, in one
// shape. Mint with navy letters reads on both the navy header and light pages.
export function BrandMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M16 4h16c6.6 0 12 5.4 12 12v8c0 6.6-5.4 12-12 12H22l-9 8v-8.6C8.3 34.6 4 29.8 4 24v-8C4 9.4 9.4 4 16 4z" fill="#7fd8c3" />
      <path d="M15 15v14h7" fill="none" stroke="#0b1a2c" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 29V15h3.4a4.6 4.6 0 0 1 0 9.2H28" fill="none" stroke="#0b1a2c" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BrandWordmark({ className = 'text-[20px]' }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`} style={{ color: 'var(--ink)' }}>
      Lan<span style={{ color: 'var(--accent-2)' }}>Pro</span>
    </span>
  )
}
