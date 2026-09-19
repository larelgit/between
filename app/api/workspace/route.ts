import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, json, purgeExpired, sameOrigin } from "@/lib/storage";
import { seedWorkspace } from "@/lib/seed";
import { workspaceSchema } from "@/lib/validation";
import { removeUnchangedStarters } from "@/lib/legacy-starters";
export async function GET() {
  const user = await getChatGPTUser();
  if (!user)
    return json({ error: "Sign in to save your private workspace." }, 401);
  try {
    const db = database();
    let row = await db
      .prepare("SELECT body,version FROM workspaces WHERE owner=?")
      .bind(user.userId)
      .first<{ body: string; version: number }>();
    if (!row) {
      const data = seedWorkspace();
      await db
        .prepare(
          "INSERT OR IGNORE INTO workspaces (owner,body,version,updated) VALUES (?,?,1,?)",
        )
        .bind(user.userId, JSON.stringify(data), new Date().toISOString())
        .run();
      row = await db
        .prepare("SELECT body,version FROM workspaces WHERE owner=?")
        .bind(user.userId)
        .first<{ body: string; version: number }>();
    }
    if (!row) throw Error("Storage is unavailable.");
    const original = JSON.parse(row.body);
    const data = purgeExpired(await removeUnchangedStarters(original));
    if (JSON.stringify(data) !== row.body) {
      const changed = await db
        .prepare(
          "UPDATE workspaces SET body=?,version=version+1,updated=? WHERE owner=? AND version=?",
        )
        .bind(
          JSON.stringify(data),
          new Date().toISOString(),
          user.userId,
          row.version,
        )
        .run();
      if (changed.meta.changes) row.version++;
      else
        return json(
          {
            error: "Your workspace changed in another session. Please reload.",
          },
          409,
        );
    }
    return json({ data, version: row.version });
  } catch {
    return json(
      { error: "Your workspace could not be loaded. Please try again." },
      503,
    );
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return json({ error: "Sign in to save your private workspace." }, 401);
  if (!sameOrigin(request)) return json({ error: "Invalid origin." }, 403);
  try {
    const text = await request.text();
    if (text.length > 1500000)
      return json(
        {
          error:
            "Workspace is too large. Export and remove older conversations.",
        },
        413,
      );
    const body = JSON.parse(text);
    const check = workspaceSchema.safeParse(body.data);
    if (!check.success || !Number.isInteger(body.version))
      return json(
        { error: "Please check the information and try again." },
        400,
      );
    const data = purgeExpired(await removeUnchangedStarters(check.data));
    const r = await database()
      .prepare(
        "UPDATE workspaces SET body=?,version=version+1,updated=? WHERE owner=? AND version=?",
      )
      .bind(
        JSON.stringify(data),
        new Date().toISOString(),
        user.userId,
        body.version,
      )
      .run();
    if (!r.meta.changes)
      return json(
        {
          error:
            "Another session changed your workspace. Export unsaved work, then reload before editing.",
        },
        409,
      );
    return json({ version: body.version + 1, data });
  } catch {
    return json(
      { error: "Could not save. Your input is still here; please retry." },
      503,
    );
  }
}
