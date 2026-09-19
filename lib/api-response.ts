import { z } from "zod";

/** Treat error bodies as untrusted, and give callers a stable fallback. */
export async function readApiResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw Error(error.success ? error.data.error : `Request failed (HTTP ${response.status}).`);
  }
  return body;
}
