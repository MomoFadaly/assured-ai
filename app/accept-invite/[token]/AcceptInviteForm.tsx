'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { acceptInviteAction, type AcceptInviteResult } from './actions';

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState<AcceptInviteResult | undefined, FormData>(
    acceptInviteAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <Field label="Email">
        <input
          type="email"
          value={email}
          readOnly
          disabled
          className="h-11 w-full rounded-md border border-border bg-muted/30 px-3.5 text-[14px] text-foreground/75"
        />
      </Field>

      <Field label="Your name" required>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="e.g., Avery Patel"
          className="h-11 w-full rounded-md border border-border bg-background px-3.5 text-[14px] focus:border-foreground focus:outline-none"
        />
      </Field>

      <Field label="Password" required hint="At least 10 characters. We hash with bcrypt.">
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
          className="h-11 w-full rounded-md border border-border bg-background px-3.5 text-[14px] focus:border-foreground focus:outline-none"
        />
      </Field>

      {state?.ok === false && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-3 text-[13px] text-red-700 dark:text-red-300">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-foreground px-5 text-[14px] font-semibold text-background shadow-sm hover:opacity-90 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          Create my account
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
