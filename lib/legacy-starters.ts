import type { Workspace } from "./types";

// Fingerprints of the original, untouched starter records. Compare every
// field so any user edit preserves the entire record. No name-based deletion.
const STARTERS: Record<string, string> = {
  maya: "a1629331093cfea302ab300c7864ee6954fca51bba343772e08ce8e62b7f1a60",
  sofia: "60f514eba2f65be0a0f88d8f909dc7016f255268648bb33e334b4438d7fc24ff",
  nina: "2bf3da95a3291baf6700622b4e1fd2ff204e6bfddf2138945a2dd7ba7c4f0d57",
  lena: "76432b96d70b0a1a31a8702f111c97b59cdda3c7026d3ced76497df685223c62",
};

function canonical(value: unknown) {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
}

export async function removeUnchangedStarters(
  data: Workspace,
): Promise<Workspace> {
  const profiles = await Promise.all(
    data.profiles.map(async (profile) => {
      if (!profile.example || !STARTERS[profile.id]) return profile;
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical(profile)),
      );
      const hex = [...new Uint8Array(hash)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hex === STARTERS[profile.id] ? null : profile;
    }),
  );
  return {
    ...data,
    profiles: profiles.filter(
      (p): p is Workspace["profiles"][number] => p !== null,
    ),
  };
}
