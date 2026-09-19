import { getChatGPTUser } from "@/app/chatgpt-auth";
import { json, sameOrigin } from "@/lib/storage";
import { profileSchema } from "@/lib/validation";
import { createReview } from "@/lib/review-engine";
import { z } from "zod";
const input = z.object({
  profile: profileSchema,
  style: z.string().max(15000),
  selectedId: z.string().max(100),
  mode: z.enum(["standard", "perspectives"]),
  consent: z.literal(true),
  config: z.object({
    provider: z.enum(["openai", "gemini"]),
    model: z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/),
    key: z.string().min(15).max(500),
  }),
});
export async function POST(request: Request) {
  if (!(await getChatGPTUser()))
    return json({ error: "Sign in before requesting a private review." }, 401);
  if (!sameOrigin(request)) return json({ error: "Invalid origin." }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 700000)
      return json(
        { error: "Use a shorter, relevant conversation for review." },
        413,
      );
    const body = input.safeParse(JSON.parse(raw));
    if (!body.success)
      return json(
        {
          error:
            "Choose a provider and model, enter your API key, and confirm processing in Settings.",
        },
        400,
      );
    const { profile, style, config, mode, selectedId } = body.data;
    if (profile.boundary !== "None stated")
      return json(
        {
          error:
            "A boundary is recorded. Respect it directly; deeper review is not a way around it.",
        },
        422,
      );
    const review = await createReview(profile, style, config, mode, selectedId);
    return json({ review });
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error:
            "The model returned an incomplete review. No new analysis was saved.",
        },
        502,
      );
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analysis is unavailable. Your draft is preserved.",
      },
      502,
    );
  }
}
