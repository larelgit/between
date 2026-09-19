import type { Workspace } from "./types";
export function purgeExpired(data: Workspace): Workspace {
  if (data.retention === "until-deleted") return data;
  const days = data.retention === "30-days" ? 30 : 90;
  const cutoff = Date.now() - days * 86400000;
  return {
    ...data,
    profiles: data.profiles.map((p) => {
      const messages = p.messages.filter(
        (m) => !m.date || new Date(m.date).getTime() >= cutoff,
      );
      const changed = messages.length !== p.messages.length;
      return {
        ...p,
        messages,
        decisions: changed
          ? []
          : p.decisions.filter((d) => new Date(d.date).getTime() >= cutoff),
        review: changed ? null : p.review,
        stated: changed ? "Source removed by retention policy." : p.stated,
        context: changed ? "" : p.context,
        revision: p.revision + (changed ? 1 : 0),
      };
    }),
  };
}
