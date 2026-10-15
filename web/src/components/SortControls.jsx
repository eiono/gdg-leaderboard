export default function SortControls({ value, onChange }) {
  return (
    <select
      className="sort-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Sort students"
    >
      <option value="points">Sort: Rank (points)</option>
      <option value="badges">Sort: Badges completed</option>
      <option value="name">Sort: Name (A-Z)</option>
    </select>
  )
}