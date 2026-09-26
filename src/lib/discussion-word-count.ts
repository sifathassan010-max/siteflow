// New threads need a 1,000-word minimum (replies have no minimum). Shared
// here so the client-side live counter and the server-side check in the
// API route can never drift apart.
export const NEW_THREAD_MIN_WORDS = 1000;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
