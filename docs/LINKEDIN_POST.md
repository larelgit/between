# LinkedIn post draft

I built Between: a place to think before you reply.

It keeps a conversation, your intention, your next step, and what actually happened in one private workspace.

The design rule that shaped the project: what I want should change the action I choose, not what I claim the other person meant.

A few engineering decisions behind it:

• Every review receives one connection's context.
• Claims link back to source messages, and unknowns stay visible.
• A saved decision preserves the original recommendation and my edited draft before I record an outcome.
• Versioned saves reject conflicting updates from another session.
• OpenAI and Gemini adapters use structured output, task-specific reasoning settings, and session-only API keys.

Built with React, TypeScript, Vinext, Cloudflare Workers, and D1. The repository includes 26 contract/data tests, CI, an architecture diagram, and a candid list of limitations.

The video uses fictional conversations. Between is a prototype for reflection and decision-making; it never sends messages or claims to know someone's feelings.

Try it: https://between-talking-stage.larel.chatgpt.site/
Code: https://github.com/larelgit/between

I'd be interested in feedback on the separation between evidence, interpretation, and action.

#TypeScript #React #SoftwareEngineering

---

Attach `docs/media/between-demo.mp4` as the native video (22 seconds, 1920 × 1080). Use `docs/media/between-poster.jpg` as its cover where supported. The GIF is optimized for the repository README. This is a draft; it has not been posted.
