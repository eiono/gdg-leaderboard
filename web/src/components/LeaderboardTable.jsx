import { useState, useEffect } from 'react'
import LeaderboardRow from './LeaderboardRow.jsx'
import '../styles/table.css'
import { isQualified } from '../lib/tiers.js'

const TARGET_DATE = new Date('2026-11-23T00:00:00').getTime()

export default function LeaderboardTable({ students = [], track = 'student', closed = false }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  function calculateTimeLeft() {
    const difference = TARGET_DATE - new Date().getTime()

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isEnded: false,
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatNumber = (num) => String(num).padStart(2, '0')

  return (
    <div className="table-wrap card">
      <div className="countdown-header">
        <span className="countdown-title">Program Deadline:</span>
        {timeLeft.isEnded ? (
          <span className="countdown-ended">Program Ended</span>
        ) : (
          <div className="countdown-timer">
            <span>{formatNumber(timeLeft.days)}d</span> :{' '}
            <span>{formatNumber(timeLeft.hours)}h</span> :{' '}
            <span>{formatNumber(timeLeft.minutes)}m</span> :{' '}
            <span>{formatNumber(timeLeft.seconds)}s</span>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <div className="message-box">No one found.</div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="col-rank">Rank</th>
              <th className="col-name">
                {track === 'developer' ? 'Developer' : 'Student'}
              </th>
              <th className="col-progress">Badges</th>
              <th className="col-tier">Tier Status</th>
              <th className="col-points">Points</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <LeaderboardRow
                key={s.slug || s.id}
                student={s}
                track={track}
                limited={closed && !isQualified(s)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}