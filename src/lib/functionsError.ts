/**
 * supabase.functions.invoke()'s error.message is just the generic string
 * "Edge Function returned a non-2xx status code" — the actual JSON body the
 * function returned (e.g. {error: "conflict", message: "..."}) sits unread
 * on error.context, a raw Response object. Without this, every real error
 * an edge function raises (403 forbidden, 409 conflict, 500 with a specific
 * reason) looks identical and undiagnosable to the user.
 */
export async function getFunctionErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.clone().json();
      if (body?.message) return body.message;
      if (body?.error) return body.error;
    } catch {
      // Body wasn't JSON — fall through to the generic message below.
    }
  }
  return (error as Error)?.message || fallback;
}
