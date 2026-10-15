import LeaderboardRow from './LeaderboardRow.jsx'
import '../styles/table.css'

export default function LeaderboardTable({ students = [] }) {
  if (students.length === 0) {
    return <div className="message-box">No students found.</div>
  }

  return (
    <div className="table-wrap card">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th className="col-rank">Rank</th>
            <th className="col-name">Student</th>
            <th className="col-progress">Badges</th>
            <th className="col-points">Points</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <LeaderboardRow key={s.slug} student={s} />
          ))}
        </tbody>
      </table>
    </div>
  )
}