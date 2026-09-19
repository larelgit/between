# Release verification

Checked on September 19, 2026. The repeatable local entry point is `npm run check`.

| Check | Scope |
| --- | --- |
| `npm run lint` | Application, tests, and tooling; warnings fail the check. Generated video dependencies and build output are excluded. |
| `npm run typecheck` | Strict TypeScript checking. |
| `npm test` | 35 named Node tests using mocked provider transport; no API keys or paid requests. |
| `npm run build` | Vinext client, SSR, and Worker production bundles. |
| Browser checks | Edited draft saved into a decision snapshot; original recommendation preserved; settings dialog; dark theme; mobile layout at 390 × 844 with no horizontal overflow; screenshot upload/consent, editable transcription, unknown-speaker validation, selective import, and success state using a local fictional response fixture. |

The provider tests exercise OpenAI/Gemini request shapes, every task's reasoning and answer-detail settings, omitted token caps, custom model IDs, provider errors, incomplete results, profile isolation, missing readers, boundary gates, output schemas, source IDs, and numerical-prediction rejection. Data tests cover empty starting state, retention, safe legacy cleanup, and API error handling. Screenshot tests cover image wire formats for both providers, file validation, malformed extraction, speaker confirmation, text corrections, optional dates, deduplication, and history limits.

The CI workflow runs installation, lint, types, tests, and build on pushes and pull requests. A workflow file is not evidence of a successful hosted run; the repository's Actions tab is the authority for that status.

Screenshot messages were also saved and reloaded through the local authenticated workspace/D1 API; invalid image bytes, missing consent, and cross-origin transcription requests were rejected. The temporary browser fixture proxy is not part of the application.

No successful live provider call was made during this release preparation. Automated tests do not establish response quality, live-model availability, or latency. Comprehensive authenticated HTTP/D1 integration, multi-session races, automated browser coverage, and an independent accessibility/security review remain future work.

Screenshots use a temporary fictional local profile. They do not contain real user messages, provider keys, or production data. The profile is removed after capture.
