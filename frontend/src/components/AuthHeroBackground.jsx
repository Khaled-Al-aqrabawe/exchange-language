// Purely decorative multilingual "hello"s drifting behind a page - not UI
// copy, so intentionally not run through i18n. Colors follow the site's own
// brand palette instead of a fixed dark backdrop.
// Kept to the outer ~15% margins on each side so the words never collide with
// primary content, whether that's a centered auth card or a two-column hero.
// Positioned `fixed` to the viewport (not the page) so it covers the whole
// page uniformly and stays put while the page scrolls, rather than being
// stretched thin across whatever the total scroll height happens to be.
const GREETINGS = [
  { text: 'Hello', top: '6%', start: '4%', size: 'text-lg', float: 'lp-float-1', accent: 1 },
  { text: 'مرحبا', top: '15%', start: '88%', size: 'text-2xl', float: 'lp-float-2', accent: 2 },
  { text: 'Hola', top: '30%', start: '5%', size: 'text-xl', float: 'lp-float-3', accent: 1 },
  { text: 'Hallo', top: '38%', start: '90%', size: 'text-base', float: 'lp-float-1', accent: 2 },
  { text: 'Bonjour', top: '52%', start: '3%', size: 'text-lg', float: 'lp-float-2', accent: 2 },
  { text: '你好', top: '60%', start: '92%', size: 'text-2xl', float: 'lp-float-3', accent: 1 },
  { text: 'こんにちは', top: '66%', start: '6%', size: 'text-base', float: 'lp-float-1', accent: 2 },
  { text: 'Merhaba', top: '85%', start: '86%', size: 'text-lg', float: 'lp-float-2', accent: 1 },
]

export default function AuthHeroBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <span
        className="absolute -top-32 -end-24 h-96 w-96 rounded-full blur-3xl lp-blob-drift"
        style={{ background: 'var(--accent)', opacity: 0.16 }}
      />
      <span
        className="absolute -bottom-32 -start-24 h-96 w-96 rounded-full blur-3xl lp-blob-drift"
        style={{ background: 'var(--accent-2)', opacity: 0.14, animationDelay: '3s' }}
      />
      {GREETINGS.map((g) => (
        <span
          key={g.text}
          className={`absolute hidden sm:block font-display font-semibold ${g.size} ${g.float}`}
          style={{
            top: g.top,
            insetInlineStart: g.start,
            color: g.accent === 1 ? 'var(--accent)' : 'var(--accent-2)',
            opacity: 0.22,
          }}
        >
          {g.text}
        </span>
      ))}
    </div>
  )
}
