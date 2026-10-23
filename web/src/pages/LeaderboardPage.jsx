import useLeaderboard from '../hooks/useLeaderboard.js'
import useFilteredStudents from '../hooks/useFilteredStudents.js'
import Podium from '../components/Podium.jsx'
import SearchBar from '../components/SearchBar.jsx'
import SortControls from '../components/SortControls.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import LastUpdated from '../components/LastUpdated.jsx'
import Loader from '../components/Loader.jsx'
import '../styles/components.css'

export default function LeaderboardPage() {
  const { data, loading, error } = useLeaderboard()
  const students = data?.students || []

  // Hooks must run on every render, so this sits above the early returns
  const { filtered, search, setSearch, sortBy, setSortBy } =
    useFilteredStudents(students)

  if (loading) return <Loader text="Loading leaderboard..." />

  if (error) {
    return (
      <div className="message-box error">
        Could not load the leaderboard. Please try again later.
        <br />
        <small>{error}</small>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <img 
          src={`${import.meta.env.BASE_URL}logo.jpeg`} 
          alt="GDG On Campus MCKV Institute of Engineering Logo" 
          style={{ height: '70px', objectFit: 'contain', display: 'block' }} 
        />
      </div>

      <h1>Leaderboard</h1>
      <LastUpdated timestamp={data.last_updated} />

      {/* Podium always shows the overall top 3, even while searching */}
      <Podium students={students} />

      <div className="controls">
        <SearchBar value={search} onChange={setSearch} />
        <SortControls value={sortBy} onChange={setSortBy} />
      </div>

      <LeaderboardTable students={filtered} />

      {/* Footer / Credits Section */}
      <footer style={{ 
        marginTop: '3rem', 
        padding: '1.5rem 0', 
        textAlign: 'center', 
        borderTop: '1px solid #eaeaea', 
        fontSize: '0.9rem', 
        color: '#555' 
      }}>
        <p style={{ margin: '0.4rem 0', fontWeight: '500' }}>
          Designed and Maintained by <strong>SK ASIF</strong>
        </p>
        <p style={{ margin: '0.4rem 0' }}>
          Any Queries contact: <a href="mailto:skasifx86@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>skasifx86@gmail.com</a>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.2rem', marginTop: '0.8rem' }}>
          <a 
            href="https://portfolio-ultra-gen-65z6.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: '#0070f3', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            Portfolio
          </a>
          
          <a 
            href="https://github.com/skasif074" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: '#0070f3', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>

          <a 
            href="https://www.linkedin.com/in/skasif074" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: '#0070f3', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  )
}
