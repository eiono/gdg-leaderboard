import { useCallback, useState, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import SwagPopup from './components/SwagPopup.jsx'
import NoticeBar from './components/NoticeBar.jsx'
import Fireworks from './components/Fireworks.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import { sounds } from './lib/sounds.js'

// Lazy-load RaceIntro so the main leaderboard bundle stays small
const RaceIntro = lazy(() => import('./components/RaceIntro.jsx'))

const SEEN_KEY = 'swagPopupSeen'
const INTRO_SEEN_KEY = 'gdg_mckv_race_intro_seen'

// Opens on the first visit of a browser session, on whichever page the
// visitor lands on. Once closed it stays closed until they open the site
// again (or press the "Swags & Rules" button in the header).
function shouldOpenPopup() {
  try {
    return sessionStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    // Storage can be blocked (private mode, strict settings): show it anyway
    return true
  }
}

function shouldPlayIntro() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1'
  } catch {
    return true
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // Ignore storage errors in private mode
  }
}

export default function App() {
  const [popupOpen, setPopupOpen] = useState(shouldOpenPopup)

  // If popup was already dismissed earlier in this session, check if intro still needs to run
  const [introOpen, setIntroOpen] = useState(
    () => !shouldOpenPopup() && shouldPlayIntro()
  )

  // Leaderboard mounts & loads data only after popup + intro finish
  const [leaderboardReady, setLeaderboardReady] = useState(
    () => !shouldOpenPopup() && !shouldPlayIntro()
  )

  // Incrementing key ensures clean remount when clicking "Replay intro" (safe in StrictMode)
  const [introRunId, setIntroRunId] = useState(0)

  const closePopup = useCallback(() => {
    // Unlock browser audio inside the user's click gesture
    sounds.unlock()
    setPopupOpen(false)

    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Ignore: the popup simply shows again on the next visit
    }

    if (shouldPlayIntro()) {
      setIntroRunId((id) => id + 1)
      setIntroOpen(true)
    } else {
      setLeaderboardReady(true)
    }
  }, [])

  const openPopup = useCallback(() => setPopupOpen(true), [])

  const handleIntroComplete = useCallback(() => {
    markIntroSeen()
    setIntroOpen(false)
    setLeaderboardReady(true)
  }, [])

  const replayIntro = useCallback(() => {
    sounds.unlock()
    setIntroRunId((id) => id + 1)
    setIntroOpen(true)
  }, [])

  return (
    <div className="app">
      {/* Lazy-loaded Race Intro Overlay */}
      {introOpen && (
        <Suspense fallback={null}>
          <RaceIntro key={introRunId} onComplete={handleIntroComplete} />
        </Suspense>
      )}

      {/* Normal Leaderboard & Pages (loads after popup + intro finish) */}
      {leaderboardReady && (
        <>
          <Fireworks />

          <Header onOpenSwags={openPopup} />
          <NoticeBar />
          <main className="container">
            <Routes>
              {/* Student leaderboard (default) */}
              <Route path="/" element={<LeaderboardPage track="student" />} />
              <Route
                path="/student/:slug"
                element={<StudentPage track="student" />}
              />

              {/* Developer leaderboard */}
              <Route
                path="/developers"
                element={<LeaderboardPage track="developer" />}
              />
              <Route
                path="/developer/:slug"
                element={<StudentPage track="developer" />}
              />

              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<LeaderboardPage track="student" />} />
            </Routes>
          </main>

          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            <button
              type="button"
              className="race-replay-btn"
              onClick={replayIntro}
            >
              🏁 Replay intro
            </button>
          </div>

          <Footer />
        </>
      )}

      {/* SwagPopup renders on top first */}
      <SwagPopup open={popupOpen} onClose={closePopup} />
    </div>
  )
}