/**
 * Centralised runtime configuration for the frontend.
 *
 * Every component should import `API_BASE_URL` from here instead of reading
 * `process.env.NEXT_PUBLIC_API_URL` (or hard-coding "http://localhost:8000")
 * in its own file. This keeps the backend location defined in exactly one place.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_API_URL       (preferred)
 *   2. NEXT_PUBLIC_API_BASE_URL  (legacy name still used by a few components)
 *   3. http://localhost:8000     (local development fallback)
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000"

/** Build a fully-qualified API URL from a path like "/api/v1/clients". */
export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "")
  const suffix = path.startsWith("/") ? path : `/${path}`
  return `${base}${suffix}`
}
