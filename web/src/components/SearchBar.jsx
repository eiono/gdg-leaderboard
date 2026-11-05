// The placeholder follows the selected track:
//   student -> "Search by student name..."
//   developer (shown as Faculty) -> "Search by faculty name..."
export default function SearchBar({ value, onChange, track = 'student' }) {
  const who = track === 'developer' ? 'faculty' : 'student'

  return (
    <input
      type="search"
      className="search-bar"
      placeholder={`Search by ${who} name...`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Search ${who}s by name`}
    />
  )
}