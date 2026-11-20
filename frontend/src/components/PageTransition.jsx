import { useEffect, useRef, useState } from 'react'
import { Routes, useLocation } from 'react-router-dom'

const css = `
@keyframes pt-slash {
  0% { clip-path: polygon(-40% 0, -40% 0, -70% 100%, -70% 100%) }
  45%, 55% { clip-path: polygon(-40% 0, 150% 0, 120% 100%, -70% 100%) }
  100% { clip-path: polygon(150% 0, 150% 0, 120% 100%, 120% 100%) }
}
@media (prefers-reduced-motion: reduce) { .pt-anim { display: none } }
`

const SWAP_MS = 380
const TOTAL_MS = 900

const section = (p) => '/' + (p.split('/')[1] || '')

/**
 * Wraps <Routes>: on moving to a different top-level page, a coral + violet
 * diagonal slash sweeps across the screen; the new page is swapped in while
 * the screen is covered. Skipped for the first render, the login splash
 * hand-off, and moves within the same section (e.g. between chats).
 */
export default function PageTransition({ children, onSwap }) {
  const location = useLocation()
  const [displayed, setDisplayed] = useState(location)
  const [animKey, setAnimKey] = useState(0)
  const [running, setRunning] = useState(false)
  const prev = useRef(location.pathname)

  useEffect(() => {
    const from = prev.current
    prev.current = location.pathname
    if (from === location.pathname) {
      setDisplayed(location)
      return
    }
    const skip = section(from) === section(location.pathname) || from === '/login'
    if (skip) {
      setDisplayed(location)
      return
    }
    setAnimKey((k) => k + 1)
    setRunning(true)
    const swap = setTimeout(() => setDisplayed(location), SWAP_MS)
    const done = setTimeout(() => setRunning(false), TOTAL_MS)
    return () => {
      clearTimeout(swap)
      clearTimeout(done)
    }
  }, [location])

  useEffect(() => { onSwap?.(displayed.pathname) }, [displayed.pathname, onSwap])

  return (
    <>
      <Routes location={displayed}>{children}</Routes>
      {running && (
        <div key={animKey} aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
          <style>{css}</style>
          <div className="pt-anim absolute inset-0" style={{ background: '#F43F5E', animation: `pt-slash ${TOTAL_MS - 100}ms cubic-bezier(.7,0,.3,1) both` }} />
          <div className="pt-anim absolute inset-0" style={{ background: '#7C3AED', animation: `pt-slash ${TOTAL_MS - 100}ms cubic-bezier(.7,0,.3,1) 90ms both` }} />
        </div>
      )}
    </>
  )
}
