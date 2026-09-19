import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { callModel, createReview } from "../lib/review-engine";
import { seedWorkspace, sofiaReview } from "./fixtures/prototype";
import { workspaceSchema, reviewContentSchema } from "../lib/validation";
import { DEFAULT_MODELS } from "../lib/ai-config";

const state = seedWorkspace();
const profile = state.profiles.find((p) => p.id === "sofia")!;
const config = { provider: "openai" as const, model: DEFAULT_MODELS.openai, key: "test-key-not-a-real-credential" };
const fixture = reviewContentSchema.parse(sofiaReview);
const perspective = { reading: "Evidence only.", sourceIds: ["s3"], limits: "Framing unknown." };
const response = (value: unknown) => Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
const geminiResponse = (value: unknown) => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "Private reasoning is not an answer" }, { text: JSON.stringify(value) }] } }] });
const openaiRequest = z.object({
  model: z.string(), store: z.boolean(), instructions: z.string(), input: z.string(),
  reasoning: z.object({ effort: z.string() }).optional(),
  text: z.object({ verbosity: z.string().optional(), format: z.object({ strict: z.boolean(), schema: z.object({ properties: z.record(z.unknown()).optional() }) }) }),
}).passthrough();
const geminiRequest = z.object({
  systemInstruction: z.object({ parts: z.array(z.object({ text: z.string() })) }),
  contents: z.array(z.object({ parts: z.array(z.object({ text: z.string() })) })),
  generationConfig: z.object({ thinkingConfig: z.object({ thinkingLevel: z.string() }).optional(), responseMimeType: z.string(), responseJsonSchema: z.object({ properties: z.record(z.unknown()).optional() }) }).passthrough(),
});
const requestBody = (init?: RequestInit): unknown => JSON.parse(String(init?.body));

// No request may reach a real provider, even if a future test forgets a mock.
const blockedFetch: typeof fetch = async () => { throw Error("Unexpected network request in test"); };
globalThis.fetch = blockedFetch;

test("standard review isolates one profile and uses the OpenAI Responses contract", async () => {
  const transport: typeof fetch = async (url, init) => {
    assert.equal(String(url), "https://api.openai.com/v1/responses");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.key}`);
    const body = openaiRequest.parse(requestBody(init));
    assert.equal(body.store, false);
    assert.equal(body.model, "gpt-6-astra");
    assert.equal(body.reasoning?.effort, "medium");
    assert.equal(body.text.verbosity, "low");
    const input = z.object({ messages: z.array(z.unknown()) }).parse(JSON.parse(body.input));
    assert.equal(input.messages.length, 4);
    assert.equal(body.input.includes("Inception"), false);
    return response(fixture);
  };
  const review = await createReview(profile, state.style, config, "standard", "s3", transport);
  assert.equal(review.origin, "live");
  assert.equal(review.claims[0].sourceIds[0], "s3");
  assert.equal(review.revision, profile.revision);
});

test("Gemini authenticates in a header, asks for structured JSON, and omits thought parts", async () => {
  const result = await callModel({ ...config, provider: "gemini", model: DEFAULT_MODELS.gemini }, "standard", "Test", {}, {}, async (url, init) => {
    assert.match(String(url), /gemini-3.8-flash:generateContent$/);
    assert.equal(String(url).includes(config.key), false);
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), config.key);
    const body = geminiRequest.parse(requestBody(init));
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.equal(body.generationConfig.thinkingConfig?.thinkingLevel, "medium");
    return geminiResponse(fixture);
  });
  assert.deepEqual(result, fixture);
});

for (const [status, message] of [[401, /API key/], [403, /API key/], [429, /usage limit/], [503, /HTTP 503/]] as const) {
  test(`provider HTTP ${status} produces an actionable error`, async () => {
    await assert.rejects(() => callModel(config, "standard", "", {}, {}, async () => Response.json({}, { status })), message);
  });
}

for (const [name, update] of [
  ["adult confirmation", { adult: false }],
  ["confirmed intention", { intention: { ...profile.intention, confirmed: false } }],
  ["no-contact boundary", { boundary: "No contact" }],
] as const) {
  test(`${name} is enforced before calling a provider`, async () => {
    let calls = 0;
    await assert.rejects(() => createReview({ ...profile, ...update }, state.style, config, "standard", "s3", async () => { calls++; return response(fixture); }), /Confirm|boundary/);
    assert.equal(calls, 0);
  });
}

test("invented or cross-profile source IDs are rejected", async () => {
  await assert.rejects(() => createReview(profile, state.style, config, "standard", "s3", async () => response({ ...fixture, claims: [{ label: "Explicit", text: "Invented", sourceIds: ["another-profile"] }] })), /unknown source/);
});
test("unsupported numerical predictions are rejected", async () => {
  await assert.rejects(() => createReview(profile, state.style, config, "standard", "s3", async () => response({ ...fixture, summary: "Attraction score: 93" })), /numerical predictions/);
});
test("invalid structured output is rejected", async () => {
  await assert.rejects(() => createReview(profile, state.style, config, "standard", "s3", async () => response({ summary: "Missing required evidence" })), z.ZodError);
});
test("partial perspectives are disclosed and evidence readers receive no intention", async () => {
  let calls = 0;
  const review = await createReview(profile, state.style, config, "perspectives", "s3", async (_url, init) => {
    calls++;
    const body = openaiRequest.parse(requestBody(init));
    if (body.instructions.includes("Independently evaluate")) {
      assert.equal("intention" in JSON.parse(body.input), false);
      if (body.instructions.includes("Reciprocity evidence.")) return Response.json({}, { status: 503 });
      return response(perspective);
    }
    return response(body.instructions.includes("Critique the proposed") ? perspective : fixture);
  });
  assert.equal(calls, 6);
  assert.match(review.status!, /Partial/);
  assert.match(review.perspectives[1].reading, /Unavailable/);
});
test("all failed evidence readers abort before strategy or synthesis", async () => {
  let calls = 0;
  await assert.rejects(() => createReview(profile, state.style, config, "perspectives", "s3", async () => { calls++; return Response.json({}, { status: 503 }); }), /All review passes/);
  assert.equal(calls, 3);
});

for (const provider of ["openai", "gemini"] as const) {
  const providerConfig = { ...config, provider, model: DEFAULT_MODELS[provider] };
  test(`${provider}: all task settings, structured output, and no token caps`, async () => {
    const efforts: string[] = [], details: string[] = [];
    const transport: typeof fetch = async (_url, init) => {
      const raw = requestBody(init);
      const generation = provider === "openai" ? openaiRequest.parse(raw) : geminiRequest.parse(raw).generationConfig;
      for (const key of ["max_output_tokens", "max_tokens", "maxOutputTokens", "temperature", "top_p", "topP", "topK", "candidateCount", "thinkingBudget"]) assert.equal(key in generation, false, key);
      if (provider === "openai") {
        const body = openaiRequest.parse(raw);
        assert.equal(body.model, "gpt-6-astra");
        assert.equal(body.store, false);
        assert.equal(body.text.format.strict, true);
        efforts.push(body.reasoning!.effort);
        details.push(body.text.verbosity!);
        return response(body.text.format.schema.properties?.reading ? perspective : fixture);
      }
      const body = geminiRequest.parse(raw);
      efforts.push(body.generationConfig.thinkingConfig!.thinkingLevel);
      details.push(body.systemInstruction.parts[0].text.includes("Keep the visible answer concise") ? "low" : "medium");
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      return geminiResponse(body.generationConfig.responseJsonSchema.properties?.reading ? perspective : fixture);
    };
    await createReview(profile, state.style, providerConfig, "standard", "s3", transport);
    await createReview(profile, state.style, providerConfig, "perspectives", "s3", transport);
    assert.deepEqual(efforts, ["medium", "medium", "low", "high", "high", "high", "medium"]);
    assert.deepEqual(details, ["low", "low", "low", "medium", "medium", "medium", "low"]);
  });
  test(`${provider}: custom model IDs are preserved without unsupported tuning or fallback`, async () => {
    await callModel({ ...providerConfig, model: "custom-model" }, "critique", "", {}, {}, async (url, init) => {
      if (provider === "openai") {
        const body = openaiRequest.parse(requestBody(init));
        assert.equal(body.model, "custom-model");
        assert.equal(body.reasoning, undefined);
        assert.equal(body.text.verbosity, undefined);
        return response({});
      }
      assert.match(String(url), /custom-model:generateContent$/);
      assert.equal(geminiRequest.parse(requestBody(init)).generationConfig.thinkingConfig, undefined);
      return geminiResponse({});
    });
  });
  test(`${provider}: parseable JSON cannot hide a truncated provider response`, async () => {
    await assert.rejects(() => callModel(providerConfig, "standard", "", {}, {}, async () => {
      const body = provider === "openai"
        ? { status: "incomplete", output: [{ content: [{ type: "output_text", text: JSON.stringify(fixture) }] }] }
        : { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: JSON.stringify(fixture) }] } }] };
      return Response.json(body);
    }), /incomplete/);
  });
}

test("test fixtures remain valid workspaces", () => { assert.equal(workspaceSchema.safeParse(state).success, true); });
