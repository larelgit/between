import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { json, sameOrigin } from "@/lib/storage";
import { screenshotImageSchema, validateScreenshotImage, MAX_SCREENSHOT_REQUEST_BYTES } from "@/lib/screenshot-import";
import { transcribeScreenshot } from "@/lib/screenshot-engine";

const input = z.object({
  image: screenshotImageSchema,
  consent: z.literal(true),
  config: z.object({
    provider: z.enum(["openai", "gemini"]),
    model: z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/),
    key: z.string().min(15).max(500),
  }),
});

export async function POST(request: Request) {
  if (!(await getChatGPTUser())) return json({ error: "Sign in before importing a screenshot." }, 401);
  if (!sameOrigin(request)) return json({ error: "Invalid origin." }, 403);
  // Bound the body while streaming, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Choose a screenshot first." }, 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SCREENSHOT_REQUEST_BYTES) {
        await reader.cancel();
        return json({ error: "Choose a screenshot smaller than 8 MB." }, 413);
      }
      chunks.push(value);
    }
  } catch {
    return json({ error: "The upload was interrupted. Choose the screenshot and try again." }, 400);
  } finally {
    reader.releaseLock();
  }
  let parsed: z.infer<typeof input>;
  try {
    const raw = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
    parsed = input.parse(JSON.parse(new TextDecoder().decode(raw)));
    validateScreenshotImage(parsed.image);
  } catch {
    return json({ error: "Choose a PNG, JPEG, or WebP screenshot, connect your AI provider, and confirm image processing." }, 400);
  }
  try {
    const transcription = await transcribeScreenshot(parsed.image, parsed.config);
    return json({ transcription });
  } catch (error) {
    return json({ error: error instanceof z.ZodError ? "The provider could not return readable messages. Try a clearer crop." : error instanceof Error ? error.message : "Could not read the screenshot. Try again." }, 502);
  }
}
