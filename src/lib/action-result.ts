/** Shape returned by every Server Action to its form (shared by server and client code). */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

/** `useActionState` initial value: nothing submitted yet. */
export const idleState = { ok: true } as ActionResult<never>;
