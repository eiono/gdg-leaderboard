import { formatDate } from '../lib/format.js'

// Shows a student's completed badges (with earn date and points)
// and the syllabus badges they still have left.
export default function BadgeList({ matched = [], missing = [] }) {
  return (
    <div className="badge-lists">
      <section className="card">
        <h3 className="badge-heading">Completed ({matched.length})</h3>

        {matched.length === 0 ? (
          <p className="badge-empty">No syllabus badges earned yet.</p>
        ) : (
          <ul className="badge-list">
            {matched.map((b) => (
              <li key={b.id || b.title} className="badge-item badge-done">
                <span className="badge-check">✓</span>
                <span className="badge-title">{b.title}</span>
                <span className="badge-meta">
                  {formatDate(b.earned_on)} · +{b.points} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="badge-heading">Still to do ({missing.length})</h3>

        {missing.length === 0 ? (
          <p className="badge-empty">All syllabus badges completed. 🎉</p>
        ) : (
          <ul className="badge-list">
            {missing.map((title) => (
              <li key={title} className="badge-item badge-todo">
                <span className="badge-check">○</span>
                <span className="badge-title">{title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}