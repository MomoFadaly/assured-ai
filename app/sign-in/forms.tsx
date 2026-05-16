'use client';

/**
 * Client-side sign-in / sign-up forms for AssuredAI.
 *
 * One component, two modes (toggled by ?signup=1 on the URL). Both call
 * into a server action that:
 *   - validates input with zod
 *   - returns structured `FormState` so we can render specific field errors
 *   - issues a redirect on success
 *
 * Password strength is evaluated locally as the user types via the
 * pure-JS evaluator in lib/auth/password.ts. The same rules run again
 * server-side at submit — never trust the client.
 */

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  signInWithPasswordAction,
  signUpAction,
  type FormState,
} from './actions';
import { evaluatePassword } from '@/lib/auth/password';

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(
    signInWithPasswordAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <EmailField initial={state?.values?.email} error={state?.fieldErrors?.email} />
      <PasswordField
        autoComplete="current-password"
        error={state?.fieldErrors?.password}
        showForgot
      />
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 p-3"
        >
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-foreground hover:opacity-90 disabled:opacity-60 text-background font-medium text-base transition-all active:scale-[0.98]"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(
    signUpAction,
    undefined,
  );
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(state?.values?.email ?? '');

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const strength = password ? evaluatePassword(password, email) : null;

  return (
    <form action={action} className="space-y-4">
      <NameField initial={state?.values?.name} error={state?.fieldErrors?.name} />
      <EmailField
        initial={state?.values?.email}
        error={state?.fieldErrors?.email}
        onChange={setEmail}
      />
      <div>
        <PasswordField
          autoComplete="new-password"
          error={state?.fieldErrors?.password}
          minLength={10}
          placeholder="At least 10 characters"
          onChange={setPassword}
        />
        <StrengthMeter password={password} email={email} />
      </div>
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 p-3"
        >
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending || (strength !== null && !strength.ok)}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-foreground hover:opacity-90 disabled:opacity-60 text-background font-medium text-base transition-all active:scale-[0.98]"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Create account
      </button>
      <p className="text-[11px] text-muted-foreground text-center">
        By creating an account you agree to our{' '}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy
        </Link>
        .
      </p>
    </form>
  );
}

// ----------------------------------------------------------------------
// Reusable fields
// ----------------------------------------------------------------------

function NameField({ initial, error }: { initial?: string; error?: string }) {
  return (
    <div>
      <label
        htmlFor="name"
        className="block text-[11px] uppercase tracking-[0.16em] font-semibold text-foreground/70 mb-1.5"
      >
        Name <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
      </label>
      <input
        id="name"
        name="name"
        type="text"
        autoComplete="name"
        defaultValue={initial ?? ''}
        placeholder="What should we call you?"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'name-error' : undefined}
        className="w-full h-12 px-4 rounded-lg border border-border bg-background font-medium text-base focus:border-foreground focus:outline-none transition-colors"
      />
      {error && (
        <p id="name-error" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function EmailField({
  initial,
  error,
  onChange,
}: {
  initial?: string;
  error?: string;
  onChange?: (v: string) => void;
}) {
  return (
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
        defaultValue={initial ?? ''}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder="you@company.com"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'email-error' : undefined}
        className="w-full h-12 px-4 rounded-lg border border-border bg-background font-medium text-base focus:border-foreground focus:outline-none transition-colors"
      />
      {error && (
        <p id="email-error" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  error,
  autoComplete,
  minLength,
  placeholder,
  showForgot,
  onChange,
}: {
  error?: string;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  placeholder?: string;
  showForgot?: boolean;
  onChange?: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          htmlFor="password"
          className="block text-[11px] uppercase tracking-[0.16em] font-semibold text-foreground/70"
        >
          Password
        </label>
        {showForgot && (
          <Link
            href="/forgot-password"
            className="text-[11px] text-foreground hover:underline font-semibold"
          >
            Forgot?
          </Link>
        )}
      </div>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'pw-error' : undefined}
          className="w-full h-12 px-4 pr-12 rounded-lg border border-border bg-background font-medium text-base focus:border-foreground focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-accent"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <p id="pw-error" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function StrengthMeter({ password, email }: { password: string; email: string }) {
  if (!password) return null;
  const s = evaluatePassword(password, email);
  const labels = ['Too weak', 'Weak', 'Ok', 'Strong', 'Excellent'];
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-emerald-600',
  ];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < s.score ? colors[s.score] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">{labels[s.score]}</p>
        {s.reasons[0] ? (
          <p className="text-xs text-red-600">{s.reasons[0]}</p>
        ) : s.suggestions[0] ? (
          <p className="text-xs text-muted-foreground">{s.suggestions[0]}</p>
        ) : null}
      </div>
    </div>
  );
}
