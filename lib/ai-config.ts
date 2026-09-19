export type AIProvider = "openai" | "gemini";

// Verified against the providers' official documentation on 2026-09-19.
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-6-astra",
  gemini: "gemini-3.8-flash",
};

type TaskSettings = {
  label: string;
  effort: "low" | "medium" | "high";
  verbosity: "low" | "medium";
  focus: string;
};

// Reasoning depth and answer length are independent. These are starting
// presets for this workload, not claims of benchmark-optimal settings.
export const REVIEW_TASKS = {
  screenshot: {
    label: "Screenshot transcription",
    effort: "low",
    verbosity: "low",
    focus: "Transcribe every readable message verbatim in visual order. Preserve language and punctuation. Do not summarize, interpret, or fill gaps.",
  },
  standard: {
    label: "Standard review",
    effort: "medium",
    verbosity: "low",
    focus:
      "Balance the evidence, uncertainty, and a proportionate next action.",
  },
  conservative: {
    label: "Conservative reading",
    effort: "medium",
    verbosity: "low",
    focus:
      "Separate explicit statements from interpretation; retain uncertainty.",
  },
  reciprocity: {
    label: "Reciprocity evidence",
    effort: "low",
    verbosity: "low",
    focus:
      "Extract observable initiation, follow-through, questions, and boundaries without inferring feelings.",
  },
  alternatives: {
    label: "Alternatives and contradictions",
    effort: "high",
    verbosity: "medium",
    focus:
      "Compare materially different explanations and identify evidence that supports or contradicts each. Do not multiply speculative possibilities.",
  },
  strategy: {
    label: "Strategy and drafts",
    effort: "high",
    verbosity: "medium",
    focus:
      "Compare distinct actions against the confirmed intention, authenticity, boundaries, and missing context.",
  },
  critique: {
    label: "Critique",
    effort: "high",
    verbosity: "medium",
    focus:
      "Check the proposed advice against the original evidence and boundaries. Identify concrete errors and corrections without inventing objections.",
  },
  synthesis: {
    label: "Final synthesis",
    effort: "medium",
    verbosity: "low",
    focus:
      "Resolve findings by source quality and deliver a clear decision brief. Preserve unresolved disagreement and do not strengthen conclusions without new evidence.",
  },
} as const satisfies Record<string, TaskSettings>;

export type ReviewTask = keyof typeof REVIEW_TASKS;

// Custom model IDs remain available, but unknown models must not inherit
// parameters they may reject. Their reasoning uses the provider default.
export function hasTaskTuning(provider: AIProvider, model: string) {
  return model === DEFAULT_MODELS[provider];
}

export function taskInstructions(task: ReviewTask) {
  const settings = REVIEW_TASKS[task];
  return `${settings.focus}\n${
    settings.verbosity === "low"
      ? "Keep the visible answer concise. Include every required field, material caveat, and supporting source; omit repetition."
      : "Include enough detail to assess the evidence, alternatives, trade-offs, and corrections. Avoid repetition and irrelevant background."
  } Completeness takes priority over brevity. Return only the requested JSON; do not reveal internal reasoning.`;
}
