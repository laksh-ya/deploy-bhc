/**
 * Demo authentication helper.
 *
 * The production login calls the FastAPI backend (`POST /api/v1/auth/login`),
 * which verifies a bcrypt password hash stored in Firestore. That requires the
 * backend + database to be running, which is inconvenient when showcasing the
 * project (e.g. to a recruiter) or developing the UI offline.
 *
 * This module ships a small set of hard-coded demo accounts so the app can be
 * logged into with no backend at all. It is intentionally NOT a security layer —
 * it only gates the demo experience on the client.
 *
 * Enable it by setting `NEXT_PUBLIC_DEMO_MODE=true` (default when no API URL is
 * configured), or simply use the "Try the demo" button on the login screen.
 */

export type DemoUser = {
  name: string
  email: string
  role: string
}

type DemoCredential = DemoUser & { password: string }

/** Built-in demo accounts. Shown on the login screen for one-click access. */
export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    email: "demo@bhc.com",
    password: "demo123",
    name: "Demo Admin",
    role: "admin",
  },
  {
    email: "manager@bhc.com",
    password: "manager123",
    name: "Store Manager",
    role: "manager",
  },
]

/**
 * Demo mode is on when explicitly enabled, OR when no backend URL is configured
 * (so a fresh clone "just works" for a showcase).
 */
export const DEMO_MODE: boolean =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  (!process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_BASE_URL)

/**
 * Attempt a demo login. Returns the matching user (without the password) or
 * `null` if the credentials don't match a demo account.
 */
export function demoLogin(email: string, password: string): DemoUser | null {
  const match = DEMO_CREDENTIALS.find(
    (c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.password === password,
  )
  if (!match) return null
  const { password: _ignored, ...user } = match
  return user
}

/** The first demo account, used by the one-click "Try the demo" button. */
export const PRIMARY_DEMO_USER: DemoUser = (() => {
  const { password: _ignored, ...user } = DEMO_CREDENTIALS[0]
  return user
})()
