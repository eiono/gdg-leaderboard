export default function SearchBar({ value, onChange }) {
  return (
    <input
      type="search"
      className="search-bar"
      placeholder="Search by student name..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search students by name"
    />
  )
}