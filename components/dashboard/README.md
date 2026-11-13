# SAI Dashboard

SAI's product UI is in `src/sai/`. Static deployments boot this standalone SAI dashboard; they do not hand users to a hosted Gitpod/Ona application. The repository also retains the API-dependent legacy dashboard, which is still used when building without the standalone SAI mode.

## Run locally

From the repository root, in a Gitpod-capable development environment with the `gp` CLI available:

```sh
# Standalone SAI experience
REACT_APP_SAI_STATIC_MODE=true yarn --cwd components/dashboard start

# Legacy API-dependent dashboard
yarn --cwd components/dashboard start
```

The standalone SAI UI can load without Gitpod APIs. The regular legacy dashboard still expects its platform APIs and services.

## Vercel build

The Vercel build runs `scripts/build-vercel.sh`, which compiles the Gitpod protocol and public API TypeScript workspaces needed by the dashboard build, then sets `REACT_APP_SAI_STATIC_MODE=true`. The static site serves SAI's own Home, Projects, Automations, Insights, Sessions, Workspaces, and AI Studio pages. It uses browser storage and the optional Supabase configuration described below; it does not redirect to Gitpod or Ona.

## Product scope

The Home composer records a session draft with its prompt, selected project/repository, branch, model, Agent or Plan mode, and preferred compute size. Drafts are saved to this browser's `localStorage` under `sai.agent-sessions.v1`. This is a local prototype: the draft does not clone code, provision a cloud environment, or execute an AI agent. The workspace list also currently represents local platform state rather than running infrastructure. Secure repository authorization, cloud provisioning, and an agent runtime still need to be implemented.

## Supabase persistence (optional)

The v1 integration stores the platform snapshot in `public.sai_platform_state`, with one JSONB row per Supabase Auth user. Workspace, repository, organization, and settings changes use this row. Row-level security compares `user_id` with `auth.uid()`; the browser can read or change only its own row. This whole-snapshot design is intentionally simple for v1: simultaneous edits from multiple tabs can be last-write-wins. The UI's organizations are currently personal groupings, not shared team accounts. **Agent-session drafts are separate and remain in browser storage.**

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261112000000_create_sai_platform_state.sql`](supabase/migrations/20261112000000_create_sai_platform_state.sql) to create the table, grants, and RLS policies.
3. In **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins**. SAI starts an anonymous Supabase Auth session automatically; the RLS policies apply to that authenticated session.
4. From the repository root, copy the example with `cp components/dashboard/.env.example components/dashboard/.env`. Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` from your project. The legacy project `anon` key is also supported using `REACT_APP_SUPABASE_ANON_KEY`. Restart the development server after changing environment variables.

Only a Supabase **publishable** key (or legacy `anon` key) belongs in this browser app. Never put a `service_role` key or other privileged secret in a `REACT_APP_*` variable: Create React App embeds these values into public browser assets. The publishable key is not a secret; the RLS migration is what restricts access.

If both Supabase variables are unset, SAI uses the local demo and `localStorage` under `sai.cloud-platform.v1`. If only one is set, the app reports a configuration error instead of silently falling back. On the first Supabase session, existing local demo data is copied into that user's remote row and the legacy local snapshot is removed after a successful save. Subsequent reads and writes use Supabase.

### Anonymous-session limitations

The initial integration uses a separate anonymous Auth identity for each browser profile. Its session is persisted by Supabase in that browser, so this does **not** provide cross-device sync until SAI adds sign-in or account linking. Clearing browser site data, losing the anonymous session, or opening another browser/profile can strand the previous row; there is not yet an account-recovery flow. Do not use this anonymous-only setup for important or production data. Anonymous auth is also not a substitute for signup abuse protection or production rate limits.

## Local demo data and platform scope

Without Supabase configuration, the mock API in `src/sai/local-api.ts` seeds sample SAI projects and stores workspace, repository, organization, and preference changes in this browser's `localStorage`. With Supabase configured, those changes are stored remotely as described above. Use **Settings → Reset data** to restore the starter state. Resetting platform data does not currently remove agent-session drafts.

Repository URLs are metadata only; no Git credentials are requested or stored. Organization membership and invitations are not backed by shared-access tables yet.

## OpenRouter AI Studio

Open **AI Studio** in the sidebar to use the configured OpenRouter models:

- Poolside — `poolside/laguna-s-2.1` (standard model; usage may be billed)
- NVIDIA — `nvidia/llama-nemotron-embed-vl-1b-v2` (embeddings)
- Cohere — `cohere/north-mini-code:free`
- Perplexity — `perplexity/pplx-decider-flash-v1.3:free`

Paste your own OpenRouter API key in the AI Studio panel and verify it. The key is kept only in JavaScript memory for the current browser tab; SAI does not save it to local or session storage. Chat prompts and embedding inputs are sent directly from the browser to OpenRouter, and then handled by the selected model provider. Review OpenRouter/provider policies before sending private code or other sensitive data. Free-tier models can have usage limits; paid model usage may incur charges. For a production deployment, use an authenticated server-side proxy instead of exposing a key in browser code.
