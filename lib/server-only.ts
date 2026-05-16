/**
 * Local stand-in for the `server-only` npm package.
 *
 * The official package's CJS entrypoint throws unconditionally — fine
 * for Next.js's bundler (which uses the `react-server` condition to
 * pick the empty entry), but a brick wall for any tsx-run script
 * that pulls in a server-only-marked module (e.g. our seed-showcase
 * step in `vercel-build`).
 *
 * This shim preserves the *intent* of `server-only` (guard against
 * accidental client-bundling) by throwing at runtime if `window` is
 * defined — i.e. if the module somehow leaked into a browser bundle.
 * Server scripts and the Next.js server runtime both have no
 * `window`, so the guard is silent on the intended path.
 *
 * Usage: replace every `import 'server-only'` with
 *        `import '@/lib/server-only'`.
 */

if (typeof globalThis !== 'undefined' && typeof (globalThis as { window?: unknown }).window !== 'undefined') {
  throw new Error(
    'A server-only module was imported in a client context. ' +
      'This module must only be used from a Server Component, server action, ' +
      'route handler, or server script.',
  );
}

export {};
