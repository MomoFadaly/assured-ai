'use client';

/**
 * Google one-click button. Calls signIn('google', { callbackUrl }) which
 * redirects through Auth.js's built-in OAuth flow. Successful auth lands
 * back on the callbackUrl (default /chat).
 */

import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

export function GoogleButton({
  callbackUrl = '/chat',
  label = 'Continue with Google',
}: {
  callbackUrl?: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          start(async () => {
            try {
              await signIn('google', { callbackUrl, redirect: true });
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Couldn't reach Google.");
            }
          });
        }}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-3 h-12 rounded-lg bg-white border border-border hover:bg-accent/50 disabled:opacity-60 text-foreground font-medium text-base transition-colors"
      >
        {pending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <GoogleGlyph className="w-5 h-5" />
        )}
        {label}
      </button>
      {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
    </div>
  );
}

/** Official Google "G" mark, four-color. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
