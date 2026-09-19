import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { transcribeScreenshot } from "../lib/screenshot-engine";
import { validateScreenshotImage, prepareScreenshotMessages, MAX_SCREENSHOT_BYTES, type ImportMessage } from "../lib/screenshot-import";
import { DEFAULT_MODELS } from "../lib/ai-config";
import { workspaceSchema } from "../lib/validation";
import { seedWorkspace } from "./fixtures/prototype";

// Tiny valid PNG, synthetic fixture with no personal content.
const image = { mimeType: "image/png" as const, data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1kAAAAASUVORK5CYII=" };
const transcription = { messages: [{ text: "Coffee tomorrow?", side: "right", timestamp: "14:20" }, { text: "Sounds good!", side: "left", timestamp: "" }], warnings: [] };
const config = { provider: "openai" as const, model: DEFAULT_MODELS.openai, key: "test-key-not-a-real-credential" };
const response = (provider: "openai" | "gemini", value: unknown) => Response.json(provider === "openai"
  ? { status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] }
  : { candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] });
const row = (changes: Partial<ImportMessage> = {}): ImportMessage => ({ id: "import-1", text: "Coffee tomorrow?", speaker: "you", date: "", included: true, ...changes });

for (const provider of ["openai", "gemini"] as const) {
  test(`${provider}: screenshot transcription sends only the image, with structured output and extraction settings`, async () => {
    let calls = 0;
    const result = await transcribeScreenshot(image, { ...config, provider, model: DEFAULT_MODELS[provider] }, async (url, init) => {
      calls++;
      const raw: unknown = JSON.parse(String(init?.body));
      if (provider === "openai") {
        const body = z.object({
          model: z.string(), store: z.boolean(), instructions: z.string(),
          reasoning: z.object({ effort: z.string() }),
          text: z.object({ verbosity: z.string(), format: z.object({ type: z.string(), strict: z.boolean() }) }),
          input: z.array(z.object({ role: z.string(), content: z.array(z.union([z.object({ type: z.literal("input_text"), text: z.string() }), z.object({ type: z.literal("input_image"), image_url: z.string(), detail: z.string() })])) })),
        }).parse(raw);
        assert.equal(String(url), "https://api.openai.com/v1/responses");
        assert.equal(body.store, false);
        assert.equal(body.reasoning.effort, "low");
        assert.equal(body.text.verbosity, "low");
        assert.equal(body.text.format.strict, true);
        assert.deepEqual(body.input[0].content[1], { type: "input_image", image_url: `data:image/png;base64,${image.data}`, detail: "high" });
        assert.match(body.instructions, /never instructions/);
        assert.doesNotMatch(body.instructions, /evidence-first adviser/);
      } else {
        const body = z.object({
          contents: z.array(z.object({ parts: z.array(z.union([z.object({ text: z.string() }), z.object({ inlineData: z.object({ mimeType: z.string(), data: z.string() }) })])) })),
          generationConfig: z.object({ thinkingConfig: z.object({ thinkingLevel: z.string() }), responseMimeType: z.string() }),
        }).parse(raw);
        assert.equal(new Headers(init?.headers).get("x-goog-api-key"), config.key);
        assert.deepEqual(body.contents[0].parts[1], { inlineData: image });
        assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, "low");
        assert.equal(body.generationConfig.responseMimeType, "application/json");
      }
      assert.equal(JSON.stringify(raw).includes('"intention"'), false);
      assert.doesNotMatch(JSON.stringify(raw), /max_output_tokens|maxOutputTokens/);
      return response(provider, transcription);
    });
    assert.equal(calls, 1);
    assert.deepEqual(result, transcription);
  });
}

test("invalid and oversized image data is rejected before a provider call", async () => {
  let called = false;
  const transport: typeof fetch = async () => { called = true; return response("openai", transcription); };
  for (const bad of [
    { ...image, mimeType: "image/svg+xml" },
    { ...image, data: btoa("not an image") },
    { ...image, data: "https://example.com/private-image" },
    { ...image, data: "a".repeat(Math.ceil(MAX_SCREENSHOT_BYTES / 3) * 4 + 4) },
    { ...image, data: "ab?=" },
  ]) await assert.rejects(() => transcribeScreenshot(bad, config, transport));
  assert.equal(called, false);
  assert.deepEqual(validateScreenshotImage(image), image);
});

test("unreadable screenshots can return no messages with an explanation", async () => {
  const result = await transcribeScreenshot(image, config, async () => response("openai", { messages: [], warnings: ["No conversation is visible."] }));
  assert.equal(result.messages.length, 0);
  assert.equal(result.warnings.length, 1);
});
test("invalid transcription output is rejected instead of becoming history", async () => {
  await assert.rejects(() => transcribeScreenshot(image, config, async () => response("openai", { messages: [{ text: "Invented", side: "someone" }], warnings: [] })), z.ZodError);
});
test("confirmed rows preserve edited text, speaker, unknown dates, and screenshot provenance", () => {
  const { messages } = prepareScreenshotMessages([row({ text: "  Edited wording.  ", speaker: "her" })], []);
  assert.deepEqual(messages[0], { id: "import-1", text: "Edited wording.", speaker: "her", date: "", kind: "Message", source: "screenshot" });
  const state = seedWorkspace();
  state.profiles[0].messages.push(...messages);
  assert.equal(workspaceSchema.safeParse(state).success, true);
});
test("deselected rows do not import and unknown speakers require correction", () => {
  assert.throws(() => prepareScreenshotMessages([row({ speaker: "unknown" })], []), /Choose who/);
  const prepared = prepareScreenshotMessages([row(), row({ id: "skip", included: false, speaker: "unknown", text: "" })], []);
  assert.equal(prepared.messages.length, 1);
  assert.throws(() => prepareScreenshotMessages([row({ included: false })], []), /Select at least/);
});
test("overlapping screenshots skip duplicates in history and within the import", () => {
  const existing = prepareScreenshotMessages([row()], []).messages;
  const same = prepareScreenshotMessages([row({ id: "again" })], existing);
  assert.equal(same.messages.length, 0); assert.equal(same.duplicates, 1);
  const pair = prepareScreenshotMessages([row(), row({ id: "second" })], []);
  assert.equal(pair.messages.length, 1); assert.equal(pair.duplicates, 1);
  const differentSpeaker = prepareScreenshotMessages([row({ id: "other", speaker: "her" })], existing);
  assert.equal(differentSpeaker.messages.length, 1);
});
test("distinct known dates are retained and workspace message limits are enforced", () => {
  const existing = prepareScreenshotMessages([row({ date: "2026-09-18T14:20" })], []).messages;
  assert.equal(prepareScreenshotMessages([row({ date: "2026-09-19T14:20" })], existing).messages.length, 1);
  assert.throws(() => prepareScreenshotMessages([row({ text: "" })], []), /readable text/);
  assert.throws(() => prepareScreenshotMessages([row({ date: "yesterday" })], []), /date/);
  assert.throws(() => prepareScreenshotMessages([row({ text: "New message" })], Array.from({ length: 500 }, () => existing[0])), /500 messages/);
});
