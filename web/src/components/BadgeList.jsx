import { formatDate } from '../lib/format.js'

// A solution is { url, note }. A link opens the video; plain text such as
// "Use ChatGpt" is shown as a note.
function Solution({ solution }) {
  if (!solution) return null

  if (solution.url) {
    return (
      <a
        className="solution-link"
        href={solution.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        ▶ Watch solution
      </a>
    )
  }

  if (solution.note) {
    return <span className="solution-note">{solution.note}</span>
  }

  return null
}

// Shows a student's completed labs and the labs still to do.
// missingItems = [{ title, url, solution }]. Older data only has `missing`
// (a list of titles), so that is used when missingItems is not there.
export default function BadgeList({ matched = [], missing = [], missingItems }) {
  const pending =
    missingItems && missingItems.length > 0
      ? missingItems
      : missing.map((title) => ({ title, url: null, solution: null }))

  return (
    <div className="badge-lists">
      <section className="card">
        <h3 className="badge-heading">Completed ({matched.length})</h3>

        {matched.length === 0 ? (
          <p className="badge-empty">No labs completed yet.</p>
        ) : (
          <ul className="badge-list">
            {matched.map((b) => (
              <li key={b.id || b.title} className="badge-item badge-done">
                <span className="badge-check">✓</span>
                <span className="badge-title">{b.title}</span>
                <span className="badge-meta">
                  {formatDate(b.earned_on)} · +{b.points} pts
                </span>
                {b.solution && (
                  <span className="badge-links">
                    <Solution solution={b.solution} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="badge-heading">Still to do ({pending.length})</h3>

        {pending.length === 0 ? (
          <p className="badge-empty">All labs completed. 🎉</p>
        ) : (
          <ul className="badge-list">
            {pending.map((item) => (
              <li key={item.id || item.title} className="badge-item badge-todo">
                <span className="badge-check">○</span>
                <span className="badge-title">{item.title}</span>
                {(item.url || item.solution) && (
                  <span className="badge-links">
                    {item.url && (
                      <a
                        className="lab-link"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open lab ↗
                      </a>
                    )}
                    <Solution solution={item.solution} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}