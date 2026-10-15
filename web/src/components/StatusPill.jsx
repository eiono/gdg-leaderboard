// Small colored label showing whether a student's profile was read correctly.
// status values written by the scraper: 'ok' | 'private' | 'error' | 'mismatch'
const LABELS = {
  ok: 'Synced',
  private: 'Profile private',
  error: 'Could not load',
  mismatch: 'Name mismatch',
}

export default function StatusPill({ status }) {
  const key = LABELS[status] ? status : 'error'

  return <span className={`status-pill status-${key}`}>{LABELS[key]}</span>
}