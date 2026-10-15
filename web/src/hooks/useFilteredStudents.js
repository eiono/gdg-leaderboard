import { useMemo, useState } from 'react'

// Handles search text and sorting for the leaderboard.
// Returns the filtered list plus the values and setters the controls need.
export default function useFilteredStudents(students = []) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('points') // 'points' | 'badges' | 'name'

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    // 1. Search by name
    let list = students.filter((s) =>
      s.name.toLowerCase().includes(query)
    )

    // 2. Sort (copy first so the original list is never changed)
    list = [...list]

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'badges') {
      list.sort(
        (a, b) =>
          (b.matched?.length || 0) - (a.matched?.length || 0) ||
          a.rank - b.rank
      )
    } else {
      // Default: official rank (points, then who finished earlier)
      list.sort((a, b) => a.rank - b.rank)
    }

    return list
  }, [students, search, sortBy])

  return { filtered, search, setSearch, sortBy, setSortBy }
}