/** Returns the current event timestamp using high-resolution time when available. */
export function getEventTimeStamp(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}
