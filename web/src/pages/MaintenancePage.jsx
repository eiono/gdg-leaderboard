// Shown instead of the whole site while maintenance mode is on
// (see MAINTENANCE in main.jsx). Edit the wording here.
export default function MaintenancePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
        color: 'var(--text)',
        textAlign: 'center',
      }}
    >
      <div
        className="card"
        style={{ maxWidth: '520px', width: '100%', padding: '32px 24px' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.jpeg`}
          alt="GDG On Campus MCKV Institute of Engineering logo"
          style={{ height: '70px', objectFit: 'contain', marginBottom: '16px' }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />

        <div style={{ fontSize: '2.5rem' }} aria-hidden="true">
          🛠️
        </div>

        <h1 style={{ margin: '8px 0 12px', fontSize: '1.6rem' }}>
          Under Maintenance
        </h1>

        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--muted)' }}>
          The leaderboard is being updated. We will be back shortly. Your
          progress and ranks are safe. Please check again in a little while.
        </p>
      </div>
    </main>
  )
}