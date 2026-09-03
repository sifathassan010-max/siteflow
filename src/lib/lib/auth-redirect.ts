// Shared by every tool's create/submit form. Call this right after a fetch
// comes back not-ok, before showing a generic error message — if the
// visitor wasn't logged in, this sends them to /login instead of showing
// a confusing "Not logged in" error text.
export function redirectToLoginIfUnauthorized(
  status: number,
  router: { push: (href: string) => void }
): boolean {
  if (status !== 401) return false;
  const next =
    typeof window !== "undefined" ? window.location.pathname : "/";
  router.push(`/login?next=${encodeURIComponent(next)}`);
  return true;
}
