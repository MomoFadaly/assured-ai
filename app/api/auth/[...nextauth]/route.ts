/**
 * Auth.js v5 catch-all route — wires NextAuth handlers to Next.js App Router.
 *
 * All auth flows (/api/auth/signin, /api/auth/callback/*, /api/auth/signout)
 * funnel through here. Configured in lib/auth/auth.ts.
 */

import { handlers } from '@/lib/auth/auth';
export const { GET, POST } = handlers;
export const runtime = 'nodejs';
