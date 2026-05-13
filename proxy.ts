/**
 * Next.js proxy (formerly "middleware" file convention, renamed in Next 16.2.5).
 *
 * No-op for now. Earlier iterations wrapped /admin under Clerk auth, but the
 * verifier product unified operator surfaces into the main workspace, so there's
 * no longer a Clerk-protected zone. Keep this file in place as a clean hook
 * for role-gated routes if / when they return.
 */

import { NextResponse } from 'next/server';

export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
