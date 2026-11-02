import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import AboutPage from './pages/AboutPage.jsx'

export default function App() {
  return (
    <div className="app">
      <Header />
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
    </div>
  )
}