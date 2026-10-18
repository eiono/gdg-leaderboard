import logo from '../../logo.jpeg'
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
      <div className="header-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src={logo} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
        <h1>Leaderboard</h1>
      </div>
      <LastUpdated timestamp={data.last_updated} />

      {/* Podium always shows the overall top 3, even while searching */}
      <Podium students={students} />

      <div className="controls">
        <SearchBar value={search} onChange={setSearch} />
        <SortControls value={sortBy} onChange={setSortBy} />
      </div>

      <LeaderboardTable students={filtered} />
    </div>
  )
}
