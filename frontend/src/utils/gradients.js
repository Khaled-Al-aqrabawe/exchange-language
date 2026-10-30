// Deterministic, muted dark gradients for generated cover art (course covers,
// auth panels) — avoids random stock photography that doesn't relate to content.
const GRADIENTS = [
  'from-slate-900 to-teal-800',
  'from-stone-900 to-amber-800',
  'from-zinc-900 to-emerald-800',
  'from-neutral-900 to-rose-900',
  'from-slate-900 to-cyan-800',
  'from-gray-900 to-teal-900',
]

export function pickGradient(seed) {
  const str = String(seed)
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}
