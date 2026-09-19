/**
 * Transient user feedback for mutations, built on primitives the app already
 * has: the mounted sonner <Toaster> (`src/app/App.tsx`) and the shared
 * `mapApiError` copy (`src/lib/errors.ts`).
 *
 * Use this for outcomes with no form left on screen (e.g. a list action whose
 * sheet closes on submit). When a form IS on screen, render `mapApiError`
 * inline instead, so the message stays attached to the field the user sees.
 */
import { toast } from 'sonner';
import { mapApiError } from '@/lib/errors';

/** Toast a normalized error message for any thrown value. */
export function toastError(error: unknown, fallback?: string): void {
  toast.error(mapApiError(error, fallback));
}

/** Toast a success message. */
export function toastSuccess(message: string): void {
  toast.success(message);
}

/** Toast a non-blocking warning (the action partly succeeded). */
export function toastWarning(message: string): void {
  toast.warning(message);
}
