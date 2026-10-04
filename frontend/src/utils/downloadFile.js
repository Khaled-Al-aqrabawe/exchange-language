// A plain <a download> is silently ignored by browsers for cross-origin URLs
// (the API runs on a different origin/port than the SPA), so it just opens
// the file instead of saving it. Fetching the bytes ourselves and saving via
// a blob object URL forces an actual download regardless of origin.
export async function downloadFile(url, filename) {
  const response = await fetch(url)
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
