// Deterministic cover art for courses and panels. The design uses flat, quiet
// surfaces rather than gradients, so this returns a plain tone from the neutral
// ladder; the name is kept because callers import `pickGradient`.
const COVERS = [
  'bg-[var(--surface-2)]',
  'bg-[var(--surface-3)]',
  'bg-[var(--accent-soft)]',
]

export function pickGradient(seed) {
  const str = String(seed)
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return COVERS[hash % COVERS.length]
}
