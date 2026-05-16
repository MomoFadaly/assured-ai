'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { resetPasswordAction, type FormState } from '@/app/sign-in/actions';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(
    resetPasswordAction,
    undefined,
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (state?.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label
          htmlFor="password"
          className="block text-[11px] uppercase tracking-[0.16em] font-semibold text-foreground/70 mb-1.5"
        >
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            required
            autoComplete="new-password"
            autoFocus
            minLength={10}
            placeholder="At least 10 characters"
            aria-invalid={state?.fieldErrors?.password ? true : undefined}
            aria-describedby={state?.fieldErrors?.password ? 'pw-error' : undefined}
            className="w-full h-12 px-4 pr-12 rounded-lg border border-border bg-background font-medium text-base focus:border-foreground focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-accent"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p id="pw-error" className="mt-1.5 text-xs text-red-600">
            {state.fieldErrors.password}
          </p>
        )}
      </div>
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 p-3">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-foreground hover:opacity-90 disabled:opacity-60 text-background font-medium text-base transition-all active:scale-[0.98]"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Save new password
      </button>
    </form>
  );
}
