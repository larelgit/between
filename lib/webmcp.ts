export type ModelTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};

export type ModelContext = {
  registerTool: (tool: ModelTool, options: { signal: AbortSignal }) => void | Promise<void>;
};
