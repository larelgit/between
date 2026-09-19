import type { Workspace } from "./types";

export function seedWorkspace(): Workspace {
  return { profiles: [], style: "", retention: "until-deleted" };
}
