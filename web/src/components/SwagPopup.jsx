import { useEffect, useRef, useState } from 'react'

// Edit the text here. Nothing else in the file needs to change.
const TIERS = [
  { id: 1, icon: '', name: 'Tier 1', reward: 'Bottle', labs: 5 },
  { id: 2, icon: '', name: 'Tier 2', reward: 'DevKit + T-shirt', labs: 10 },
]

const EXTRA_INFO = [
  'Only the labs listed on the About page count towards a tier. Your progress shows as a count like 7/10 on the leaderboard.',
  'Finishing all 10 labs locks your position on the leaderboard for good.',
  'Your Google Skills profile must be public. The leaderboard checks it every 3 hours, so a new badge can take a few hours to appear.',
  'Only badges earned within the program dates count.',
  'Swags are for eligible participants only. Organizers may ask you to verify your identity (for example with your college ID) when swags are handed out.',
  'Skill badges are official Google Cloud credentials. You can share them on LinkedIn and add them to your resume.',
  'Keep the name on your Skills profile the same as the name you registered with.',
]

// Popup that shows the swags / tiers / rules (text plus web/public/popup.png).
// It only displays itself; App.jsx decides when it is open:
//   <SwagPopup open={open} onClose={() => setOpen(false)} />
export default function SwagPopup({ open, onClose }) {
  const closeRef = useRef(null)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow

    // Stop the page behind the popup from scrolling
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab') {
        // The close button is the only control, so keep focus on it
        e.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="swag-backdrop"
      onClick={onClose} // a click outside the card closes the popup
    >
      <div
        className="swag-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swag-title"
        onClick={(e) => e.stopPropagation()} // clicks inside do not close it
      >
        <button
          ref={closeRef}
          type="button"
          className="swag-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="swag-body">
          <div className="swag-content">
            <h2 id="swag-title" className="swag-title">
              Swags &amp; Tiers
            </h2>
            <p className="swag-sub">
              Complete the required labs to unlock your swag.
            </p>

            <ul className="swag-tiers">
              {TIERS.map((t) => (
                <li key={t.id} className="swag-tier">
                  <span className="swag-tier-icon" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className="swag-tier-text">
                    <strong>{t.name}:</strong> {t.reward}
                  </span>
                  <span className="swag-tier-labs">
                    {t.labs} labs needed
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {!imageFailed && (
            <img
              className="swag-image"
              src={`${import.meta.env.BASE_URL}popup.png`}
              alt="Swags, tiers and rules"
              onError={() => setImageFailed(true)}
            />
          )}

          <div className="swag-content">
            <h3 className="swag-info-title">Good to know</h3>
            <ul className="swag-info">
              {EXTRA_INFO.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}