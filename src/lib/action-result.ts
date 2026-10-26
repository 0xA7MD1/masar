import { z } from "zod";

export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionFailure = { ok: false; error: string; fieldErrors?: FieldErrors };
export type ActionResult<T = null> = { ok: true; data: T } | ActionFailure;

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: FieldErrors): ActionFailure {
  return { ok: false, error, fieldErrors };
}

export function validationFail(error: z.ZodError): ActionFailure {
  return fail("راجع الحقول المظللة.", z.flattenError(error).fieldErrors as FieldErrors);
}

export const UNAUTHORIZED_MESSAGE = "انتهت الجلسة، سجّل دخولك من جديد.";
