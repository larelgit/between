import assert from "node:assert/strict";
import { test } from "node:test";
import { seedWorkspace as fixtures } from "./fixtures/prototype";
import { seedWorkspace } from "../lib/seed";
import { workspaceSchema } from "../lib/validation";
import { purgeExpired } from "../lib/retention";
import { removeUnchangedStarters } from "../lib/legacy-starters";
import { readApiResponse } from "../lib/api-response";

test("new workspaces are empty and schema-valid", () => {
  assert.equal(seedWorkspace().profiles.length, 0);
  assert.equal(workspaceSchema.safeParse(seedWorkspace()).success, true);
});
test("retention expires dated evidence and clears dependent summaries, retaining undated evidence", () => {
  const old = fixtures();
  old.retention = "30-days";
  old.profiles[1].messages[0].date = "2020-01-01";
  old.profiles[1].messages[1].date = "";
  const pruned = purgeExpired(old);
  assert.equal(pruned.profiles[1].messages.some((m) => m.id === "s0"), false);
  assert.equal(pruned.profiles[1].messages.some((m) => m.id === "s1"), true);
  assert.equal(pruned.profiles[1].review, null);
  assert.equal(pruned.profiles[1].context, "");
});
test("until-deleted retention leaves historical evidence intact", () => {
  const state = fixtures();
  state.retention = "until-deleted";
  assert.deepEqual(purgeExpired(state), state);
});
test("legacy cleanup removes only untouched starter profiles and is idempotent", async () => {
  const state = fixtures();
  assert.equal((await removeUnchangedStarters(state)).profiles.length, 0);
  state.profiles[0].context += " User's own note.";
  const real = { ...structuredClone(state.profiles[1]), id: "real-connection", example: undefined };
  state.profiles.push(real);
  const clean = await removeUnchangedStarters(state);
  assert.deepEqual(clean.profiles, [state.profiles[0], real]);
  assert.deepEqual(await removeUnchangedStarters(clean), clean);
});
test("API errors preserve actionable server messages and tolerate unexpected bodies", async () => {
  await assert.rejects(() => readApiResponse(Response.json({ error: "Another session saved first." }, { status: 409 })), /Another session/);
  await assert.rejects(() => readApiResponse(Response.json({ message: 42 }, { status: 500 })), /HTTP 500/);
  assert.deepEqual(await readApiResponse(Response.json({ ok: true })), { ok: true });
});
