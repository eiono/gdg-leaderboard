import { useEffect, useRef, useState } from 'react'

// The scrolling notice. Edit the text here (the double spaces after
// "Google" look like a missing word, for example "Google Sheet").
const NOTICE_TEXT =
  'The leaderboard is only for tracking college participants’ data; after completion, we will verify and match the details with the data in the Google , and any discrepancy may result in profile rejection, after which the data in the Google  will be considered final.'

// Scroll speed in pixels per second. A smaller number is slower.
const SPEED_PHONE = 30
const SPEED_DESKTOP = 45

function pickSpeed() {
  try {
    return window.matchMedia('(max-width: 600px)').matches
      ? SPEED_PHONE
      : SPEED_DESKTOP
  } catch {
    return SPEED_DESKTOP
  }
}

// Slow right-to-left scrolling notice, shown just below the header.
export default function NoticeBar() {
  const itemRef = useRef(null)
  const [seconds, setSeconds] = useState(70)

  // The same speed on every screen: duration = text width / speed
  useEffect(() => {
    const el = itemRef.current
    if (!el) return undefined

    function update() {
      const width = el.offsetWidth
      if (width > 0) setSeconds(Math.max(20, Math.round(width / pickSpeed())))
    }

    update()
    window.addEventListener('resize', update)

    let observer = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      observer.observe(el)
    }

    return () => {
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="notice-bar" role="region" aria-label="Important notice">
      {/* Screen readers read the text once, not the moving copies */}
      <p className="notice-sr">{NOTICE_TEXT}</p>

      <div className="notice-viewport" aria-hidden="true">
        <div
          className="notice-track"
          style={{ '--notice-duration': `${seconds}s` }}
        >
          <span className="notice-item" ref={itemRef}>
            {NOTICE_TEXT}
          </span>
          <span className="notice-item">{NOTICE_TEXT}</span>
        </div>
      </div>
    </div>
  )
}