import { useEffect, useState } from 'react'
import { formatDateTime, timeAgo } from '../lib/format.js'

// Shows "Updated 3 hours ago" with the exact IST time on hover.
export default function LastUpdated({ timestamp }) {
  // Re-render every minute so "x minutes ago" stays accurate
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  if (!timestamp) return null

  return (
    <p className="last-updated" title={formatDateTime(timestamp)}>
      Updated {timeAgo(timestamp)} · refreshes every 6 hours
    </p>
  )
}