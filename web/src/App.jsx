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
          <Route path="/" element={<LeaderboardPage />} />
          <Route path="/student/:slug" element={<StudentPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<LeaderboardPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}