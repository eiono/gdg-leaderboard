import { useCallback, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import SwagPopup from './components/SwagPopup.jsx'
import NoticeBar from './components/NoticeBar.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import AboutPage from './pages/AboutPage.jsx'

const SEEN_KEY = 'swagPopupSeen'

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

export default function App() {
  const [popupOpen, setPopupOpen] = useState(shouldOpenPopup)

  const closePopup = useCallback(() => {
    setPopupOpen(false)
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Ignore: the popup simply shows again on the next visit
    }
  }, [])

  const openPopup = useCallback(() => setPopupOpen(true), [])

  return (
    <div className="app">
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
      <Footer />

      <SwagPopup open={popupOpen} onClose={closePopup} />
    </div>
  )
}