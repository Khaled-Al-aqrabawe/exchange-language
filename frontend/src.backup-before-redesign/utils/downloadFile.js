// A plain <a download> is silently ignored by browsers for cross-origin URLs
// (the API runs on a different origin/port than the SPA), so it just opens
// the file instead of saving it. Fetching the bytes ourselves and saving via
// a blob object URL forces an actual download regardless of origin.
// The API can hand back an http:// (or :80) media URL behind a TLS proxy; an https page may not fetch that.
export function secureUrl(url) {
  const target = new URL(url, window.location.href)
  if (window.location.protocol === 'https:' && target.protocol === 'http:') {
    target.protocol = 'https:'
    if (target.port === '80') target.port = ''
  }
  return target.href
}

export async function downloadFile(url, filename) {
  const response = await fetch(secureUrl(url))
  if (!response.ok) throw new Error(`download ${response.status}`)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename || ''
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

// Saves plain text (e.g. session notes) as a .txt file.
export function downloadText(filename, text) {
  const objectUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

// Saves an in-memory blob (e.g. a zip returned by the API) under the given file name.
export function downloadBlob(filename, blob) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
