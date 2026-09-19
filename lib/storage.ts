import { env } from "cloudflare:workers";
export function database() {
  if (!env.DB)
    throw Error("Storage is unavailable. Your input has not been saved.");
  return env.DB;
}
export { purgeExpired } from "./retention";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
