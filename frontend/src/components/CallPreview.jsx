import { Camera, Mic, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarUrl } from '../utils/images'

const CHAT_KEYS = ['call1', 'call2', 'call3']

/**
 * A styled two-tile "video call" mockup for marketing pages. Starts with
 * static avatar photos; on request, swaps the local tile for the visitor's
 * real camera feed via getUserMedia — a genuine product demo rather than
 * unrelated stock footage. The floating chat bubble cycles through a few
 * lines to keep the hero feeling alive without any real video asset.
 */
export default function CallPreview({ partnerSeed = 'hero-partner', partnerName }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const [live, setLive] = useState(false)
  const [error, setError] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setLineIndex((i) => (i + 1) % CHAT_KEYS.length), 3800)
    return () => clearInterval(interval)
  }, [])

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.current) videoRef.current.srcObject = stream
      setLive(true)
    } catch {
      setError(true)
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto" dir="ltr">
      <div className="lp-surface relative p-3">
        <div className="flex items-center justify-end px-1 pb-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--ok)' }}>
            <span className="lp-dot" />
            {t('mockup.liveSession')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3">
          <div
            className="relative aspect-square overflow-hidden"
            style={{ borderRadius: 'var(--radius-control)', background: 'var(--surface-3)', border: '1px solid var(--line)' }}
          >
            <img src={avatarUrl(partnerSeed, 300)} alt="" className="h-full w-full object-cover" />
            <span
              className="absolute bottom-1.5 left-1.5 text-[11px] font-medium px-1.5 py-0.5"
              style={{ borderRadius: 'var(--radius-tag)', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              {partnerName || `${t('mockup.sara')} · ${t('mockup.arabic')}`}
            </span>
          </div>

          <div
            className="relative aspect-square overflow-hidden flex items-center justify-center"
            style={{ borderRadius: 'var(--radius-control)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
            {live ? (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            ) : (
              <button
                onClick={startPreview}
                className="flex flex-col items-center gap-2 transition-colors hover:opacity-80"
                style={{ color: 'var(--ink-soft)' }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center"
                  style={{ borderRadius: 'var(--radius-pill)', background: 'var(--surface)', border: '1px solid var(--line-strong)' }}
                >
                  <Camera size={17} />
                </span>
                <span className="text-[11px] font-medium px-2 text-center leading-tight">
                  {error ? t('mockup.cameraUnavailable') : t('mockup.previewCamera')}
                </span>
              </button>
            )}
            <span
              className="absolute bottom-1.5 left-1.5 text-[11px] font-medium px-1.5 py-0.5"
              style={{ borderRadius: 'var(--radius-tag)', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              {t('mockup.you')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <span
            className="flex h-8 w-8 items-center justify-center"
            style={{ borderRadius: 'var(--radius-pill)', background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
          >
            <Mic size={14} />
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center"
            style={{ borderRadius: 'var(--radius-pill)', background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
          >
            <Video size={14} />
          </span>
          <span
            className="flex h-8 items-center px-3.5 text-[11px] font-medium"
            style={{ borderRadius: 'var(--radius-pill)', background: 'var(--danger)', color: 'var(--danger-ink)' }}
          >
            {t('mockup.end')}
          </span>
        </div>
      </div>

      <div
        key={lineIndex}
        className="lp-pop absolute -bottom-4 left-4 px-3 py-2 flex items-center gap-2 lp-animate-in-scale max-w-[220px]"
      >
        <img src={avatarUrl('hero-msg', 60)} alt="" className="lp-avatar h-6 w-6 shrink-0" style={{ border: '1px solid var(--line)' }} />
        <span className="text-xs" style={{ color: 'var(--ink)' }}>{t(`mockup.${CHAT_KEYS[lineIndex]}`)}</span>
      </div>
    </div>
  )
}
