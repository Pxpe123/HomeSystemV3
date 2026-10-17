/** Browser media may come from HomeSystem or an embedded server payload, never a provider host. */
export function serverImage(value, origin = globalThis.location?.origin) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (
    /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(value)
  )
    return value;
  if (!origin) return null;
  try {
    const base = new URL(origin);
    const image = new URL(value, base);
    if (
      !["http:", "https:"].includes(image.protocol) ||
      image.origin !== base.origin ||
      image.username ||
      image.password
    )
      return null;
    return image.href;
  } catch {
    return null;
  }
}
