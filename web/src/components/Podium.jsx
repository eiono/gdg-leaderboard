import { Link } from 'react-router-dom'
import { formatNumber } from '../lib/format.js'
import '../styles/podium.css'

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

// Shows the top 3 students. Visual order is 2nd, 1st, 3rd (classic podium).
// track is 'student' or 'developer' and decides where the card links to.
export default function Podium({ students = [], track = 'student' }) {
  const top = students
    .filter((s) => s.rank >= 1 && s.rank <= 3)
    .sort((a, b) => a.rank - b.rank)

  if (top.length === 0) return null

  const order = [2, 1, 3]
    .map((rank) => top.find((s) => s.rank === rank))
    .filter(Boolean)

  return (
    <section className="podium" aria-label="Top 3">
      {order.map((s) => (
        <Link
          key={s.slug}
          to={`/${track}/${s.slug}`}
          className={`podium-card podium-rank-${s.rank}`}
        >
          <span className="podium-medal">{MEDALS[s.rank]}</span>
          <span className="podium-name">{s.name}</span>
          {s.flag && <span className="flag-label">{s.flag}</span>}
          <span className="podium-points">
            {formatNumber(s.points?.total)} pts
          </span>
          <span className="podium-badges">{s.progress} badges</span>
        </Link>
      ))}
    </section>
  )
}