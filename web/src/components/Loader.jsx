export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader-spinner" />
      <p>{text}</p>
    </div>
  )
}