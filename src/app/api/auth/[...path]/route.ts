import { auth } from "@/lib/auth/server"

// Catch-all proxy for all Neon Auth API calls (sign in/up, OAuth callbacks,
// session, email verification, password reset). The client SDK and UI talk to
// these routes, which forward to the Neon Auth server.
export const { GET, POST } = auth.handler()
