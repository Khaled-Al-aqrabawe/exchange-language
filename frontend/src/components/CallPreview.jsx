import { Camera, Mic, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { avatarUrl } from '../utils/images'

const CHAT_LINES = [
  "Let's practice tomorrow? 👋",
  'Your accent is getting so good!',
  'Same time next week?',
]

/**
 * A styled two-tile "video call" mockup for marketing pages. Starts with
 * static avatar photos; on request, swaps the local tile for the visitor's
 * real camera feed via getUserMedia — a genuine product demo rather than
 * unrelated stock footage. The floating chat bubble cycles through a few
 * lines to keep the hero feeling alive without any real video asset.
 */
export default function CallPreview({ partnerSeed = 'hero-partner', partnerName = 'Sara · Arabic' }) {
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
    const interval = setInterval(() => setLineIndex((i) => (i + 1) % CHAT_LINES.length), 3800)
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
      <span
        className="pointer-events-none absolute -inset-6 rounded-[2rem] blur-2xl lp-blob-drift"
        style={{ background: 'var(--gradient-brand)', opacity: 0.25 }}
      />
      <div className="relative rounded-2xl p-3 shadow-2xl" style={{ background: '#0f1117', border: '1px solid rgb(255 255 255 / 0.08)' }}>
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live session
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800">
            <img src={avatarUrl(partnerSeed, 300)} alt="" className="h-full w-full object-cover" />
            <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white bg-black/40 backdrop-blur px-2 py-0.5 rounded-md">
              {partnerName}
            </span>
          </div>

          <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
            {live ? (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            ) : (
              <button
                onClick={startPreview}
                className="group flex flex-col items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                  <Camera size={17} />
                </span>
                <span className="text-[11px] font-medium px-2 text-center leading-tight">
                  {error ? 'Camera unavailable' : 'Preview your camera'}
                </span>
              </button>
            )}
            <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white bg-black/40 backdrop-blur px-2 py-0.5 rounded-md">
              You
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300">
            <Mic size={14} />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300">
            <Video size={14} />
          </span>
          <span className="flex h-8 items-center rounded-full bg-rose-500 px-4 text-[11px] font-semibold text-white">
            End
          </span>
        </div>
      </div>

      <div
        key={lineIndex}
        className="absolute -bottom-4 -left-4 rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 lp-animate-in-scale max-w-[220px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <img src={avatarUrl('hero-msg', 60)} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
        <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{CHAT_LINES[lineIndex]}</span>
      </div>
    </div>
  )
}
