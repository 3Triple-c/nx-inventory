export { auth, type Auth } from './auth'

import { auth } from './auth'

/**
 * Every Phase 1 route/server component calls this first. Returns null
 * rather than throwing — callers decide whether "no session" means
 * redirect-to-login (a page) or a 401 (an API route).
 */
export async function getSession(headers: Headers) {
  return auth.api.getSession({ headers })
}

/** Hard-fails instead of returning null. Use getSession directly if you
 * want to handle "not logged in" more gracefully than a thrown error. */
export async function requireSession(headers: Headers) {
  const session = await getSession(headers)
  if (!session) {
    throw new Error('Unauthorized: no valid session')
  }
  return session
}