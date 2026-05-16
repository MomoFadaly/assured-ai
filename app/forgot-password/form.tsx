'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  requestPasswordResetAction,
  type FormState,
} from '@/app/sign-in/actions';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-[11px] uppercase tracking-[0.16em] font-semibold text-foreground/70 mb-1.5"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          defaultValue={state?.values?.email ?? ''}
          placeholder="you@company.com"
          aria-invalid={state?.fieldErrors?.email ? true : undefined}
          aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
          className="w-full h-12 px-4 rounded-lg border border-border bg-background font-medium text-base focus:border-foreground focus:outline-none transition-colors"
        />
        {state?.fieldErrors?.email && (
          <p id="email-error" className="mt-1.5 text-xs text-red-600">
            {state.fieldErrors.email}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-foreground hover:opacity-90 disabled:opacity-60 text-background font-medium text-base transition-all active:scale-[0.98]"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Send the reset link
      </button>
    </form>
  );
}
