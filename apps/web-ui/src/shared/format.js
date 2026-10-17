/** Server sun times may be decimal hours or Unix timestamps. Locale stays explicit. */
export function sunTime(value) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 0 && value < 24) {
    const minutes = Math.round(value * 60);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  return new Date(value > 1e11 ? value : value * 1000).toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  );
}
