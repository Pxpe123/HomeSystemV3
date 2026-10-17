import "./PageDots.css"

export default function PageDots({ count, active, onChange, labels = [] }) {
  return (
    <div className="PageDots">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={labels[i] ? `Show ${labels[i]}` : `Home page ${i + 1}`}
          aria-current={i === active ? 'page' : undefined}
          style={{ border: 0, padding: 0 }}
          className={`Dot ${i === active ? "active" : ""}`}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  )
}
