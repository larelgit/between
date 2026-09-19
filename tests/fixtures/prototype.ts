import type { Workspace, Profile, Review, Move } from "../../lib/types";
const intention = {
  status: "Dating and seeing where it goes",
  role: "Confident initiator",
  secondary: "Warm",
  objective: "Make a first one-on-one invitation",
  custom: "",
  pace: "Natural and unhurried",
  boundaries: "No repeated persuasion after a decline.",
  confirmed: true,
  version: 1,
};
const sofiaMoves: Move[] = [
  {
    id: "clarify",
    title: "Make the invitation a little clearer",
    description:
      "Separate coffee from a thank-you, and let your intention be known.",
    draft:
      "You don’t owe me anything. I’d like to take you for coffee as a date—are you free after class Thursday?",
    fit: "Warm, honest initiative. A small next step toward exploring dating.",
    tradeoff:
      "Being direct makes rejection more possible, but leaves less room for mixed expectations.",
    assumption:
      "You are genuinely free after Thursday’s class, and there has been no earlier decline.",
    timing: "At a natural point in the conversation.",
    stop: "Accept a decline or a friendship-only answer. A no-contact request means no further messages.",
    branches: [
      "If she accepts: agree on a place and time.",
      "If she meant as friends: accept that clarification.",
      "If she is unsure: leave room without persuading.",
    ],
    sourceIds: ["s2", "s3"],
  },
  {
    id: "in-person",
    title: "Ask her in person",
    description:
      "Bring it up naturally after class, when there is room for an easy answer.",
    draft: "",
    fit: "A good fit if you feel more yourself face-to-face.",
    tradeoff:
      "Waits for an in-person opportunity. Avoid putting her on the spot.",
    assumption: "You will naturally see each other after class.",
    timing: "During a relaxed conversation, with an easy way to leave.",
    stop: "Do not corner her or insist on an immediate answer.",
    branches: [
      "If she welcomes the invitation: coordinate.",
      "If she declines: accept it.",
    ],
    sourceIds: ["s3"],
  },
  {
    id: "friendly",
    title: "Keep this coffee friendly",
    description:
      "Get to know each other without treating the meeting as a date.",
    draft: "No debt to settle! Coffee after class Thursday could be nice.",
    fit: "Offers a slower pace while keeping the meeting genuinely friendly.",
    tradeoff: "Your romantic intention stays unresolved.",
    assumption:
      "You actually want a friendly meeting without expecting romance in return.",
    timing: "When you are ready to coordinate.",
    stop: "Friendship is not an investment that she owes you for.",
    branches: [
      "Enjoy the conversation without assuming attraction.",
      "Clarify your own intentions when they become relevant.",
    ],
    sourceIds: ["s3"],
  },
];
const sofiaReview: Review = {
  id: "example-sofia",
  mode: "standard",
  origin: "example",
  revision: 1,
  goalVersion: 1,
  summary:
    "She’s open to coffee. Whether she sees it as a date is still an open question.",
  claims: [
    {
      label: "Explicit",
      text: "She said “Yeah, I owe you one!” in response to your coffee suggestion.",
      sourceIds: ["s3"],
    },
    {
      label: "Context-supported",
      text: "Her reply connects coffee to your help with the assignment. A thank-you coffee is a reasonable reading.",
      sourceIds: ["s1", "s2", "s3"],
    },
    {
      label: "Plausible",
      text: "She may also be open to a date, but she has not said so.",
      sourceIds: ["s3"],
    },
  ],
  unknown:
    "Romantic interest. A friendly yes to coffee doesn’t establish how she sees the connection.",
  question: "Are you genuinely free after Thursday’s class?",
  disagreement:
    "The invitation may be understood as friendly or romantic. The exchange does not distinguish those readings. A clear, low-pressure invitation works without assuming either.",
  perspectives: [
    {
      name: "Conservative reading",
      reading:
        "Coffee is linked to a thank-you. Romantic framing has not been established.",
    },
    {
      name: "Reciprocity evidence",
      reading:
        "She responds positively to spending time together, without explicitly calling it a date.",
    },
    {
      name: "Alternatives & contradictions",
      reading:
        "Friendly appreciation and openness to a date both remain possible.",
    },
    {
      name: "Strategy & critique",
      reading:
        "Clarify once, gently. This is reasonable across both readings, provided there was no earlier refusal.",
    },
  ],
  moves: sofiaMoves,
  created: "2026-09-18T14:30:00Z",
};
export function seedWorkspace(): Workspace {
  const base = {
    age: "22",
    met: "University",
    stage: "Acquaintance",
    current: "A few conversations in person. No date yet.",
    stated: "“I’m usually free after Thursday’s class.”",
    context:
      "You know each other from university and often talk about assignments. You are free after Thursday’s class.",
    boundary: "None stated",
    adult: true,
    archived: false,
    color: "green",
    intention: { ...intention },
    decisions: [],
    revision: 1,
  };
  const sofia: Profile = {
    ...base,
    id: "sofia",
    name: "Sofia",
    example: "sofia",
    messages: [
      {
        id: "s0",
        speaker: "her",
        text: "I’m usually free after Thursday’s class.",
        date: "2026-09-17T14:00:00",
        kind: "She said",
      },
      {
        id: "s1",
        speaker: "her",
        text: "Thanks again for helping me with that assignment.",
        date: "2026-09-18T14:24:00",
        kind: "Message",
      },
      {
        id: "s2",
        speaker: "you",
        text: "No problem. We should get coffee sometime.",
        date: "2026-09-18T14:26:00",
        kind: "Message",
      },
      {
        id: "s3",
        speaker: "her",
        text: "Yeah, I owe you one!",
        date: "2026-09-18T14:28:00",
        kind: "Message",
      },
    ],
    review: sofiaReview,
  };
  const maya: Profile = {
    ...base,
    id: "maya",
    name: "Maya",
    age: "24",
    met: "Dating app",
    color: "rose",
    stage: "New match",
    current: "Matched three days ago. No meeting yet.",
    stated: "No relationship preference stated.",
    context:
      "A reciprocal conversation about films. You are free Saturday afternoon.",
    example: "maya",
    intention: {
      ...intention,
      role: "Playful romantic interest",
      secondary: "Confident",
      objective: "Suggest a first date",
    },
    messages: [
      {
        id: "m1",
        speaker: "you",
        text: "Your profile says you have strong opinions about film endings. Worst one?",
        date: "2026-09-18T11:00:00",
        kind: "Message",
      },
      {
        id: "m2",
        speaker: "her",
        text: "Don’t make me start with Inception.",
        date: "2026-09-18T11:10:00",
        kind: "Message",
      },
      {
        id: "m3",
        speaker: "you",
        text: "That is a bold opening attack.",
        date: "2026-09-18T11:14:00",
        kind: "Message",
      },
      {
        id: "m4",
        speaker: "her",
        text: "You’ll have to defend it properly then.",
        date: "2026-09-18T11:18:00",
        kind: "Message",
      },
    ],
    review: null,
  };
  const nina: Profile = {
    ...base,
    id: "nina",
    name: "Nina",
    age: "23",
    met: "Through friends",
    color: "blue",
    stage: "Talking stage",
    current: "Talking for ten days. One invitation; no meeting.",
    stated: "She mentioned a difficult work week.",
    context:
      "You invited her for coffee once. Your actual availability next week is not recorded.",
    example: "nina",
    intention: {
      ...intention,
      status: "Serious relationship",
      role: "Calm, independent equal",
      secondary: "",
      objective: "Find out whether a first date can happen",
    },
    messages: [
      {
        id: "n1",
        speaker: "you",
        text: "Would you be up for coffee this weekend?",
        date: "2026-09-18T18:00:00",
        kind: "Message",
      },
      {
        id: "n2",
        speaker: "her",
        text: "This weekend is a mess. Maybe next week? I do want to hear the rest of your travel story.",
        date: "2026-09-18T18:20:00",
        kind: "Message",
      },
    ],
    review: null,
  };
  const lena: Profile = {
    ...base,
    id: "lena",
    name: "Lena",
    age: "24",
    met: "Mutual friends",
    color: "amber",
    stage: "Invitation pending",
    current: "A first coffee is being arranged. Romantic framing unknown.",
    stated: "“I’m free Sunday afternoon—want to get that coffee?”",
    context:
      "An invitation was declined, then she restarted conversation and later proposed coffee.",
    example: "lena",
    intention: {
      ...intention,
      role: "Calm, independent equal",
      objective: "Coordinate a first meeting",
    },
    messages: [
      {
        id: "l1",
        speaker: "you",
        text: "Coffee Thursday evening?",
        date: "2026-09-06T12:00:00",
        kind: "Message",
      },
      {
        id: "l2",
        speaker: "her",
        text: "I can’t this week, sorry.",
        date: "2026-09-06T14:00:00",
        kind: "Message",
      },
      {
        id: "l3",
        speaker: "her",
        text: "How did that presentation go?",
        date: "2026-09-11T14:00:00",
        kind: "Message",
      },
      {
        id: "l4",
        speaker: "her",
        text: "I’m free Sunday afternoon—want to get that coffee?",
        date: "2026-09-15T14:00:00",
        kind: "Message",
      },
    ],
    review: null,
    decisions: [
      {
        id: "14",
        date: "2026-09-06T12:00:00",
        goal: { ...intention },
        stage: "Talking stage",
        sourceIds: ["l1", "l2"],
        reading:
          "Reciprocal conversation supported engagement. We gave too much weight to that as readiness to meet.",
        move: {
          ...sofiaMoves[0],
          title: "Invite her for coffee",
          draft: "Coffee Thursday evening?",
        },
        expectation:
          "Acceptance or a concrete alternative was the leading expectation; decline was also possible.",
        actualAction: "Sent as written",
        actualText: "Coffee Thursday evening?",
        outcome: "I can’t this week, sorry.",
        outcomeKind: "Actual reply",
        revision:
          "Our earlier reading was too strong. The leading forecast missed. Near-term feasibility weakened; attraction remains unknown.",
      },
      {
        id: "21",
        date: "2026-09-11T14:00:00",
        goal: { ...intention },
        stage: "Talking stage",
        sourceIds: ["l3"],
        reading: "A new, self-initiated topic supports willingness to talk.",
        move: { ...sofiaMoves[1], title: "Respond warmly to her question" },
        expectation: "No leading expectation about meeting.",
        actualAction: "Not recorded",
        actualText: "",
        outcome: "How did that presentation go?",
        outcomeKind: "Actual reply",
        revision:
          "Persistent disengagement weakened. This does not cancel her earlier decline or establish willingness to meet.",
      },
      {
        id: "27",
        date: "2026-09-15T14:00:00",
        goal: { ...intention },
        stage: "Invitation pending",
        sourceIds: ["l4"],
        reading: "Willingness to propose a meeting is now explicit.",
        move: {
          ...sofiaMoves[1],
          title: "Confirm availability and coordinate",
        },
        expectation:
          "A plan can be coordinated if Sunday genuinely works for both.",
        actualAction: "Not recorded",
        actualText: "",
        outcome: "I’m free Sunday afternoon—want to get that coffee?",
        outcomeKind: "Actual reply",
        revision:
          "Willingness to arrange coffee is resolved. Romantic attraction, exclusivity and commitment remain unknown.",
      },
    ],
  };
  return {
    profiles: [maya, sofia, nina, lena],
    style: "Natural, concise, warm. No forced persona.",
    retention: "until-deleted",
  };
}
export { sofiaReview };
