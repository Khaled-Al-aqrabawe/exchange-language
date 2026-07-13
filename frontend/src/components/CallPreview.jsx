import { Camera, Mic, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { avatarUrl } from '../utils/images'

/**
 * A styled two-tile "video call" mockup for marketing pages. Starts with
 * static avatar photos; on request, swaps the local tile for the visitor's
 * real camera feed via getUserMedia — a genuine product demo rather than
 * unrelated stock footage.
 */
export default function CallPreview({ partnerSeed = 'hero-partner', partnerName = 'Sara · Arabic' }) {
  const videoRef = useRef(null)
  const [live, setLive] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject
      stream?.getTracks().forEach((t) => t.stop())
    }
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
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-2xl bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-900/10">
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

      <div className="absolute -bottom-4 -left-4 rounded-xl bg-white shadow-lg px-3 py-2 flex items-center gap-2 ring-1 ring-slate-900/5">
        <img src={avatarUrl('hero-msg', 60)} alt="" className="h-6 w-6 rounded-full object-cover" />
        <span className="text-xs font-medium text-slate-700">"Let's practice tomorrow?" 👋</span>
      </div>
    </div>
  )
}
