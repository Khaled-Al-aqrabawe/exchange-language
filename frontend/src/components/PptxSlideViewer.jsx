import JSZip from 'jszip'
import { init as initPptxPreview } from 'pptx-preview'
import { useEffect, useRef, useState } from 'react'

const SLIDE_W = 1280
const SLIDE_H = 720

// Picture backgrounds, in slide order, as data URLs (null where a slide has none). The preview
// library doesn't draw these itself, which leaves light slide text on a white page.
async function readSlideBackgrounds(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const text = (path) => zip.file(path)?.async('string')
  const parse = (xml) => new DOMParser().parseFromString(xml, 'application/xml')
  const pres = parse(await text('ppt/presentation.xml'))
  const presRels = parse(await text('ppt/_rels/presentation.xml.rels'))
  const target = (doc, id) => [...doc.getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === id)?.getAttribute('Target')
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }
  const result = []
  for (const sld of [...pres.getElementsByTagName('p:sldId')]) {
    let dataUrl = null
    try {
      const slidePath = `ppt/${target(presRels, sld.getAttribute('r:id'))}`.replace('ppt/ppt/', 'ppt/')
      const slide = parse(await text(slidePath))
      const blip = slide.getElementsByTagName('p:bg')[0]?.getElementsByTagName('a:blip')[0]
      if (blip) {
        const slideRels = parse(await text(slidePath.replace('slides/', 'slides/_rels/') + '.rels'))
        const mediaPath = `ppt/${target(slideRels, blip.getAttribute('r:embed')).replace('../', '')}`
        const ext = mediaPath.split('.').pop().toLowerCase()
        dataUrl = `data:${mime[ext] || 'image/png'};base64,${await zip.file(mediaPath).async('base64')}`
      }
    } catch { /* leave this slide's background as the library drew it */ }
    result.push(dataUrl)
  }
  return result
}

// Draws slide `index` of a .pptx in the browser, scaled to fill its (16:9) parent.
// The parent decides which slide is shown, so two people can be kept on the same one.
export default function PptxSlideViewer({ url, index, onReady, onError }) {
  const boxRef = useRef(null)
  const stageRef = useRef(null)
  const previewerRef = useRef(null)
  const backgroundsRef = useRef([])
  const [scale, setScale] = useState(1)
  const [ready, setReady] = useState(false)
  const callbacks = useRef({})
  callbacks.current = { onReady, onError }

  const applyBackground = () => {
    const bg = backgroundsRef.current[previewerRef.current?.currentIndex ?? 0]
    if (!bg) return
    stageRef.current?.querySelectorAll('.slide-background').forEach((el) => {
      el.style.backgroundImage = `url(${bg})`
      el.style.backgroundSize = '100% 100%'
      el.style.backgroundPosition = '0 0'
      el.style.backgroundRepeat = 'no-repeat'
      el.style.opacity = '1'
    })
  }

  useEffect(() => {
    const box = boxRef.current
    const update = () => setScale(box.clientWidth / SLIDE_W)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const stage = stageRef.current
    setReady(false)
    const observer = new MutationObserver(applyBackground)
    observer.observe(stage, { childList: true, subtree: true })
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error('fetch'); return r.arrayBuffer() })
      .then(async (buffer) => {
        if (cancelled) return
        backgroundsRef.current = await readSlideBackgrounds(buffer).catch(() => [])
        if (cancelled) return
        stage.innerHTML = ''
        const previewer = initPptxPreview(stage, { width: SLIDE_W, height: SLIDE_H, mode: 'slide' })
        previewerRef.current = previewer
        await previewer.preview(buffer)
        if (cancelled) return
        applyBackground()
        setReady(true)
        callbacks.current.onReady?.(previewer.slideCount)
      })
      .catch(() => { if (!cancelled) callbacks.current.onError?.() })
    return () => {
      cancelled = true
      observer.disconnect()
      try { previewerRef.current?.destroy() } catch { /* already gone */ }
      previewerRef.current = null
    }
  }, [url])

  // Jump to the requested slide.
  useEffect(() => {
    const previewer = previewerRef.current
    if (!ready || !previewer) return
    const target = Math.max(0, Math.min(previewer.slideCount - 1, index || 0))
    if (target === previewer.currentIndex) return
    previewer.removeCurrentSlide()
    previewer.currentIndex = target
    previewer.htmlRender.renderSlide(target)
    applyBackground()
  }, [index, ready])

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden bg-white">
      <div
        ref={stageRef}
        className="absolute start-0 top-0 [&_.pptx-preview-wrapper-next]:hidden [&_.pptx-preview-wrapper-pagination]:hidden"
        style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left', visibility: ready ? 'visible' : 'hidden' }}
      />
    </div>
  )
}
