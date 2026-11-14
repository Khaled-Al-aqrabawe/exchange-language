// Deterministic placeholder art, seeded by a stable key (user id, course id, ...) so the
// same entity always gets the same picture without a network request.

// Avatars stay inside the ink palette: six steps of the same blue-grey, so a row of them
// reads as one family instead of a row of different colours.
const AVATAR_TONES = [
  ['#e7ebf0', '#8d9bad'],
  ['#e2e7ee', '#7e8da1'],
  ['#dde3ec', '#71819a'],
  ['#e9ecef', '#95a1b0'],
  ['#dfe5ed', '#78889e'],
  ['#e4e9f0', '#8694a7'],
]

function hashSeed(seed) {
  let h = 0
  for (const ch of String(seed ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Default avatar: a person silhouette on a flat tint picked from the seed (user id).
export function avatarUrl(seed) {
  const h = hashSeed(seed)
  const [bg, fg] = AVATAR_TONES[h % AVATAR_TONES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="39" r="16" fill="${fg}"/><path d="M18 100c0-21 14-34 32-34s32 13 32 34z" fill="${fg}"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function photoUrl(seed, width = 800, height = 600) {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`
}

// Prefer a real uploaded avatar; fall back to the deterministic placeholder.
export function resolveAvatarUrl(avatar, seed, size = 200) {
  return avatar || avatarUrl(seed, size)
}
