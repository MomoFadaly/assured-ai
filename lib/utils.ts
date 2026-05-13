/**
 * Shared utility helpers (used by shadcn-style components).
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Generate a stable session id stored in sessionStorage. */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'assured-ai-session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `s_${crypto.randomUUID()}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}
