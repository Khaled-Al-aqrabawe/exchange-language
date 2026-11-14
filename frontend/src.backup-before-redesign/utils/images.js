// Deterministic placeholder photography (picsum.photos) seeded by a stable
// key (user id, course id, ...) so the same entity always gets the same image.
const AVATAR_PALETTES = [
  ['#14b8a6', '#0f766e'], ['#ff6b57', '#c2410c'], ['#6366f1', '#4338ca'], ['#f59e0b', '#b45309'],
  ['#ec4899', '#be185d'], ['#22c55e', '#15803d'], ['#0ea5e9', '#0369a1'], ['#a855f7', '#7e22ce'],
]

function hashSeed(seed) {
  let h = 0
  for (const ch of String(seed ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Default avatar: a person silhouette on a colour picked from the seed (user id), so every user
// gets their own stable, random-looking picture without any network request.
export function avatarUrl(seed) {
  const h = hashSeed(seed)
  const [c1, c2] = AVATAR_PALETTES[h % AVATAR_PALETTES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="50" cy="38" r="17" fill="#fff" fill-opacity=".92"/><path d="M16 100c0-22 15-36 34-36s34 14 34 36z" fill="#fff" fill-opacity=".92"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function photoUrl(seed, width = 800, height = 600) {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`
}

// Prefer a real uploaded avatar; fall back to the deterministic placeholder.
export function resolveAvatarUrl(avatar, seed, size = 200) {
  return avatar || avatarUrl(seed, size)
}
