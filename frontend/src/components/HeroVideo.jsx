import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import CallPreview from './CallPreview'

/**
 * Hero product video: a browser-style frame with a soft glow, playing a
 * walkthrough of the app (/public/hero-demo.webm or .mp4). Falls back to the
 * CallPreview mockup if the file is missing.
 */
export default function HeroVideo() {
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(true)
  const ref = useRef(null)

  if (failed) return <CallPreview />

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
  }

  return (
    <div className="relative w-full mx-auto max-w-xl" dir="ltr">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgb(251 113 133 / 0.35), transparent 70%)' }}
      />

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'rgb(255 255 255 / 0.06)',
          border: '1px solid rgb(255 255 255 / 0.16)',
          boxShadow: '0 30px 80px -20px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.12)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* window bar */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.1)' }}>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff6b6b' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ffd166' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#fb7185' }} />
          </div>
          <div
            className="mx-auto flex h-6 w-3/5 items-center justify-center rounded-md text-[11px] font-medium"
            style={{ background: 'rgb(255 255 255 / 0.08)', color: 'rgb(255 255 255 / 0.65)' }}
          >
            lanbro.app
          </div>
          <span className="w-10" />
        </div>

        <div className="group relative bg-[#1E293B]">
          <video
            ref={ref}
            className="block w-full aspect-video object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          >
            <source src="/hero-demo.webm" type="video/webm" />
            <source src="/hero-demo.mp4" type="video/mp4" onError={() => setFailed(true)} />
          </video>

          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause video' : 'Play video'}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            style={{ background: 'rgb(30 41 59 / 0.7)', color: '#fff', border: '1px solid rgb(255 255 255 / 0.25)', backdropFilter: 'blur(6px)' }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
