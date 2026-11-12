# SAI Cloud Dev Platform

SAI is a cloud development platform experience for organizing development workspaces, repositories, organizations, personal preferences, and AI tools.

## Standalone dashboard

The dashboard is rebranded for SAI and runs as an independent React app. It works locally without a SAI account, remote platform service, or Kubernetes cluster. By default, workspace and preference data is kept in browser `localStorage`; you can optionally configure Supabase for per-user remote persistence.

```sh
yarn install
yarn --cwd components/dashboard start
```

Open the development server on port `3000`. The UI supports managing workspaces and repositories, switching or creating organizations, updating settings, and using OpenRouter models in AI Studio. Supabase setup, anonymous-session limitations, and the browser-only fallback are documented in [`components/dashboard/README.md`](components/dashboard/README.md). OpenRouter keys remain in tab memory only.

## Project layout

-   `components/dashboard` — SAI Cloud Dev Platform web app, optional Supabase persistence, and OpenRouter integration.
-   Other `components/` packages — supporting protocol, API, and infrastructure code retained in this repository. They are not required to run the standalone dashboard preview.

All work on this branch is scoped to the `Spacze-Tesleem/SAI` repository.
