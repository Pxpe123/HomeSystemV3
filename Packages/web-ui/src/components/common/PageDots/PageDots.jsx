import "./PageDots.css"

export default function PageDots({ count, active, onChange }) {
  return (
    <div className="PageDots">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`Dot ${i === active ? "active" : ""}`}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  )
}
