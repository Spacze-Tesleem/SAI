# SAI Cloud Dev Platform

SAI is a cloud development platform experience for organizing development workspaces, repositories, organizations, personal preferences, and AI tools.

## Standalone dashboard

The dashboard is rebranded for SAI and runs as an independent React app. Its local demo API means the workspace UI works without an account, a remote platform service, or a Kubernetes cluster.

```sh
yarn install
yarn --cwd components/dashboard start
```

Open the development server on port `3000`. The UI supports managing demo workspaces and repositories, switching or creating organizations, updating settings, and using OpenRouter models in AI Studio. Workspace and preference demo data is stored in browser `localStorage`; OpenRouter keys are held in tab memory only. See [`components/dashboard/README.md`](components/dashboard/README.md) for details and security limitations.

## Project layout

- `components/dashboard` — SAI Cloud Dev Platform web app, local demo API, and OpenRouter integration.
- Other `components/` packages — supporting protocol, API, and infrastructure code retained in this repository. They are not required to run the standalone dashboard preview.

All work on this branch is scoped to the `Spacze-Tesleem/SAI` repository.
