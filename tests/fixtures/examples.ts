import { sofiaReview } from "./prototype";
import type { Profile, Review, Move } from "../../lib/types";
export function exampleReview(p: Profile): Review | null {
  if (!p.example || p.revision !== 1) return null;
  const r = structuredClone(sofiaReview);
  r.id = "example-" + p.id;
  r.goalVersion = p.intention.version;
  const make = (
    id: string,
    title: string,
    description: string,
    draft: string,
    fit: string,
    tradeoff: string,
    sourceIds: string[],
  ): Move => ({
    ...r.moves[0],
    id,
    title,
    description,
    draft,
    fit,
    tradeoff,
    sourceIds,
  });
  if (p.example === "maya") {
    r.summary =
      "She’s keeping your shared joke going. Interest in meeting hasn’t been stated yet.";
    r.claims = [
      {
        label: "Explicit",
        text: "She invited you to defend your opinion about Inception.",
        sourceIds: ["m4"],
      },
      {
        label: "Context-supported",
        text: "You are both contributing to a playful film conversation.",
        sourceIds: ["m1", "m2", "m3", "m4"],
      },
      {
        label: "Unknown",
        text: "This exchange does not confirm whether she wants to meet.",
        sourceIds: ["m4"],
      },
    ];
    r.unknown =
      "Willingness to meet and romantic interest remain unestablished.";
    r.question = "Does Saturday afternoon still work for you?";
    r.disagreement =
      "Playful engagement supports continuing the conversation. It does not establish readiness to meet; a low-pressure invitation can clarify that.";
    r.moves = [
      make(
        "date",
        "Turn the joke into an invitation",
        "Use the real topic you are already enjoying.",
        "Coffee date Saturday afternoon? You can present your case against Inception.",
        "Playful and direct, with an easy plan to answer.",
        "She may prefer more conversation first.",
        ["m2", "m4"],
      ),
      make(
        "conversation",
        "Keep the film conversation going",
        "Offer your real opinion, then ask about hers.",
        "",
        "Builds on her contribution without inventing your tastes.",
        "Delays your objective of a first date.",
        ["m4"],
      ),
      make(
        "voice",
        "Try a voice-note debate",
        "Offer a more personal format before meeting.",
        "That deserves a voice-note debate—up for it?",
        "Creates another way to get acquainted.",
        "A voice note may feel like more effort.",
        ["m4"],
      ),
    ];
    r.moves.forEach((m) => {
      m.assumption =
        "Saturday is genuinely available if you suggest it. No earlier invitation or request to slow down is missing.";
      m.branches = [
        "If she accepts: coordinate a public place and time.",
        "If she wants to keep chatting: decide whether that pace fits.",
        "If she declines: accept it without persuasion.",
      ];
    });
  }
  if (p.example === "nina") {
    r.summary =
      "She’s keeping the conversation open, but there’s no confirmed plan.";
    r.claims = [
      {
        label: "Explicit",
        text: "She says this weekend is difficult and suggests “maybe next week.”",
        sourceIds: ["n2"],
      },
      {
        label: "Context-supported",
        text: "The story reference supports continued engagement.",
        sourceIds: ["n2"],
      },
      {
        label: "Plausible",
        text: "Genuine unavailability and polite uncertainty both fit this reply.",
        sourceIds: ["n2"],
      },
    ];
    r.unknown =
      "Whether a workable date can be arranged, and whether her interest is romantic.";
    r.question = "When are you actually free next week?";
    r.disagreement =
      "The scheduling language can reflect genuine unavailability or weak interest. The current evidence does not distinguish them.";
    r.moves = [
      make(
        "schedule",
        "Offer one real scheduling choice",
        "First record when you are genuinely available. Then offer one or two easy options.",
        "",
        "A direct, relaxed way to find out whether coffee is practical.",
        "Another vague answer may leave the plan unresolved.",
        ["n1", "n2"],
      ),
      make(
        "leave",
        "Leave scheduling with her",
        "Give her room to suggest something that works.",
        "No worries—let me know when you know your schedule.",
        "Fits a calm, independent approach.",
        "The invitation may remain open indefinitely.",
        ["n2"],
      ),
      make(
        "story",
        "Continue the story for now",
        "Share a genuine continuation of your travel story.",
        "",
        "Keeps warmth without pressing for a plan.",
        "Does less to clarify whether a date can happen.",
        ["n2"],
      ),
    ];
    r.moves.forEach((m) => {
      m.assumption =
        "This is the first invitation. Availability has not been confirmed; do not invent days.";
      m.branches = [
        "If she proposes a day: coordinate if it works for you.",
        "If she stays vague: leave the invitation with her.",
        "If she declines: accept it.",
      ];
    });
  }
  if (p.example === "lena") {
    r.summary =
      "She has now proposed coffee herself. The useful next step is coordination.";
    r.claims = [
      {
        label: "Explicit",
        text: "She suggests Sunday afternoon and asks to get coffee.",
        sourceIds: ["l4"],
      },
      {
        label: "Context-supported",
        text: "Her restart weakens a persistent-disengagement reading.",
        sourceIds: ["l3"],
      },
      {
        label: "Unknown",
        text: "This does not reveal why she declined earlier or establish romantic framing.",
        sourceIds: ["l2", "l4"],
      },
    ];
    r.unknown =
      "Romantic attraction, exclusivity and future commitment remain unknown.";
    r.question = "Are you genuinely free Sunday afternoon?";
    r.disagreement =
      "The earlier forecast over-weighted an immediate counteroffer. Later engagement changes the current picture without rewriting her past feelings.";
    r.moves = [
      make(
        "coordinate",
        "Coordinate the coffee",
        "Confirm your real availability, then agree a time and place.",
        "",
        "Willingness to arrange coffee is explicit now.",
        "A coffee plan still does not establish romantic framing.",
        ["l4"],
      ),
    ];
    r.moves[0].assumption = "Your Sunday availability has not been recorded.";
    r.moves[0].branches = [
      "If Sunday works for both: agree details.",
      "If not: offer a genuinely available alternative.",
    ];
  }
  r.perspectives = [
    { name: "Conservative reading", reading: r.claims[0].text },
    { name: "Reciprocity evidence", reading: r.claims[1]?.text || r.summary },
    { name: "Alternatives & contradictions", reading: r.disagreement },
    {
      name: "Strategy & critique",
      reading:
        "An honest, low-pressure action is useful across these readings. Respect any boundary and avoid invented availability.",
    },
  ];
  const status = p.intention.status;
  if (status === "Friendship") {
    r.moves = r.moves.map((m, i) => ({
      ...m,
      title: i === 0 ? "Keep the invitation genuinely friendly" : m.title,
      draft:
        i === 0
          ? "It would be nice to catch up over coffee as friends. Would you be up for that?"
          : m.draft,
      fit: "Matches your friendship-only intention without implying romance.",
    }));
  } else if (status === "Unsure") {
    r.moves[0] = {
      ...r.moves[0],
      title: "Get to know each other without a label",
      draft:
        "I’d enjoy getting to know you a little better over coffee. Would you be up for that?",
      fit: "Leaves room to explore without pretending you have chosen a romantic destination.",
    };
  } else if (status === "Casual dating" || status === "Friends with benefits") {
    r.moves[0] = {
      ...r.moves[0],
      title: "Be honest about the connection you want",
      draft:
        status === "Casual dating"
          ? "I’d be up for a date. I’m only looking for something casual at the moment—does that fit what you’re after?"
          : "I’m looking for a casual connection rather than a relationship. Is that something you’d want to explore?",
      fit: "Makes intentions available for a mutual choice. No sexual interest is assumed.",
    };
  } else if (status === "Custom") {
    r.moves[0] = {
      ...r.moves[0],
      title: "Clarify your custom intention",
      draft: "",
      description: "Use live review for advice that fits your original brief.",
      fit: "Your custom brief needs a tailored review; this example cannot infer it.",
    };
  }
  return r;
}
