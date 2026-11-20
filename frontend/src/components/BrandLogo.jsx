import logo from '../assets/lanbro-logo.png'

// LanBro mark: violet "L" and coral "B" joined by a handshake - two people, one conversation.
export function BrandMark({ className = 'h-9 w-9' }) {
  return <img src={logo} alt="" aria-hidden="true" className={`${className} object-contain`} style={{ width: 'auto' }} />
}

export function BrandWordmark({ className = 'text-[20px]' }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`} style={{ color: 'var(--ink)' }}>
      Lan<span style={{ color: 'var(--accent-2)' }}>Bro</span>
    </span>
  )
}
