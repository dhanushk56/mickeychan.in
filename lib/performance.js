// One place decides whether a device gets the full motion layer or the light one.
// The layout sets data-perf before the first paint, so effects and CSS agree from
// the start instead of one racing the other.
export function lowPowerMode() {
  if (typeof document === "undefined") return true;
  const mode = document.documentElement.dataset.perf;
  if (mode === "low") return true;
  if (mode === "high") return false;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
