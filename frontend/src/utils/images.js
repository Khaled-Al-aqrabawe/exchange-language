// Deterministic placeholder photography (picsum.photos) seeded by a stable
// key (user id, course id, ...) so the same entity always gets the same image.
export function avatarUrl(seed, size = 200) {
  return `https://picsum.photos/seed/avatar-${seed}/${size}/${size}`
}

export function photoUrl(seed, width = 800, height = 600) {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`
}
