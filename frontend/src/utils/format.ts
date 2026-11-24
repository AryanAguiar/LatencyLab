export function formatLatency(nanoseconds: number): string {
  if (!Number.isFinite(nanoseconds) || nanoseconds < 0) return '—'
  if (nanoseconds < 1000) return `${Math.round(nanoseconds)} ns`
  if (nanoseconds < 1_000_000) return `${(nanoseconds / 1000).toFixed(1)} µs`
  const milliseconds = nanoseconds / 1_000_000
  return `${milliseconds < 10 ? milliseconds.toFixed(2) : milliseconds.toFixed(1)} ms`
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds} ms`
  return `${(milliseconds / 1000).toFixed(2)} s`
}
