# Gitpod Dashboard

The default application is Gitpod's original TypeScript and React dashboard. `src/index.tsx` initializes the Gitpod metrics, router, providers, and `RootAppRouter` from `src/App.tsx`. Its pages rely on the Gitpod platform APIs and services.

The SAI prototype remains isolated under `src/sai/`; it is not mounted by the default Gitpod entrypoint. The Supabase and OpenRouter sections below document that prototype only and do not change the Gitpod dashboard's behavior.

## Run locally

From the repository root, in a Gitpod workspace with the `gp` CLI available:

```sh
yarn --cwd components/dashboard start
```

The Gitpod app expects its platform API environment. It is not a self-contained frontend deployment.

## Vercel build

The Vercel build runs `scripts/build-vercel.sh`, which compiles the Gitpod protocol and public API TypeScript workspaces in the same order as the dashboard's `BUILD.yaml`. Because Vercel serves static files and does not run the Gitpod API or WebSocket services, the build enables `REACT_APP_GITPOD_MINIMAL_MODE`. Requests to the dashboard root and app routes are handed directly to Ona's hosted sign-in/dashboard, preserving the requested route after sign-in where possible. This avoids showing a static promotional splash or booting a dashboard that would wait for an API backend Vercel does not host.

## SAI prototype — Supabase persistence (optional)

The v1 integration stores the complete platform snapshot in `public.sai_platform_state`, with one JSONB row per Supabase Auth user. Workspace, repository, organization, and settings changes use this row. Row-level security compares `user_id` with `auth.uid()`; the browser can read or change only its own row. This whole-snapshot design is intentionally simple for v1: simultaneous edits from multiple tabs can be last-write-wins. The UI's organizations are currently personal groupings, not shared team accounts.

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261112000000_create_sai_platform_state.sql`](supabase/migrations/20261112000000_create_sai_platform_state.sql) to create the table, grants, and RLS policies.
3. In **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins**. SAI starts an anonymous Supabase Auth session automatically; the RLS policies apply to that authenticated session.
4. From the repository root, copy the example with `cp components/dashboard/.env.example components/dashboard/.env`. Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` from your project. The legacy project `anon` key is also supported using `REACT_APP_SUPABASE_ANON_KEY`. Restart the development server after changing environment variables.

Only a Supabase **publishable** key (or legacy `anon` key) belongs in this browser app. Never put a `service_role` key or other privileged secret in a `REACT_APP_*` variable: Create React App embeds these values into public browser assets. The publishable key is not a secret; the RLS migration is what restricts access.

If both Supabase variables are unset, SAI uses the local demo and `localStorage` under `sai.cloud-platform.v1`. If only one is set, the app reports a configuration error instead of silently falling back. On the first Supabase session, existing local demo data is copied into that user's remote row and the legacy local snapshot is removed after a successful save. Subsequent reads and writes use Supabase.

### Anonymous-session limitations

The initial integration uses a separate anonymous Auth identity for each browser profile. Its session is persisted by Supabase in that browser, so this does **not** provide cross-device sync until SAI adds sign-in or account linking. Clearing browser site data, losing the anonymous session, or opening another browser/profile can strand the previous row; there is not yet an account-recovery flow. Do not use this anonymous-only setup for important or production data. Anonymous auth is also not a substitute for signup abuse protection or production rate limits.

## Local demo data and platform scope

Without Supabase configuration, the mock API in `src/sai/local-api.ts` seeds sample SAI projects and stores workspace, repository, organization, and preference changes in this browser's `localStorage`. With Supabase configured, those changes are stored remotely as described above. Use **Settings → Reset demo data** to restore the starter state.

This is not a cloud compute service: workspace actions update SAI platform state and do not provision machines or clone repositories. Repository URLs are metadata only; no Git credentials are requested or stored. Organization membership and invitations are not backed by shared-access tables yet.

## OpenRouter AI Studio

Open **AI Studio** in the sidebar to use the configured OpenRouter models:

-   Poolside — `poolside/laguna-s-2.1` (standard model; usage may be billed)
-   NVIDIA — `nvidia/llama-nemotron-embed-vl-1b-v2` (embeddings)
-   Cohere — `cohere/north-mini-code:free`
-   Perplexity — `perplexity/pplx-decider-flash-v1.3:free`

Paste your own OpenRouter API key in the AI Studio panel and verify it. The key is kept only in JavaScript memory for the current browser tab; SAI does not save it to local or session storage. Chat prompts and embedding inputs are sent directly from the browser to OpenRouter, and then handled by the selected model provider. Review OpenRouter/provider policies before sending private code or other sensitive data. Free-tier models can have usage limits; paid model usage may incur charges. For a production deployment, use an authenticated server-side proxy instead of exposing a key in browser code.
