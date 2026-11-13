# SAI — Cloud Development & AI Agent Workspace

SAI is an independent product for creating project workspaces and preparing coding-agent tasks. The product UI is built in [`components/dashboard/src/sai/`](components/dashboard/src/sai/). It takes inspiration from cloud IDE and coding-agent workflows, but SAI owns its application and does not send users to a hosted third-party workspace.

## Current experience

- **Home:** create an agent-session draft with a task prompt, project/repository, branch, model, Agent or Plan mode, and a compute-size preference.
- **Projects and workspaces:** manage repository metadata and local workspace records in the existing dashboard.
- **Sessions:** review drafts saved in this browser under `sai.agent-sessions.v1`.
- **AI Studio:** connect an OpenRouter key for direct model chat and embeddings. The key remains in browser memory for the current tab.
- **Settings and organizations:** configure appearance and default editor/machine preferences; optional Supabase persistence is documented in [`components/dashboard/README.md`](components/dashboard/README.md).

**Prototype boundary:** session submission currently saves a draft; it does not clone a repository, provision a cloud machine, or run an AI coding agent. Workspace lifecycle actions are also local platform records, not real compute. A production agent runtime, secure repository authorization, and cloud provisioning service still need to be designed and connected.

## Development

Install the repository dependencies using its Yarn workspace setup, then run SAI from a Gitpod-capable development environment with the `gp` CLI available:

```sh
REACT_APP_SAI_STATIC_MODE=true yarn --cwd components/dashboard start
```

For the standalone SAI build used by the static deployment:

```sh
REACT_APP_SAI_STATIC_MODE=true yarn --cwd components/dashboard build
```

Vercel runs [`components/dashboard/scripts/build-vercel.sh`](components/dashboard/scripts/build-vercel.sh). Dashboard routing is configured in [`components/dashboard/vercel.json`](components/dashboard/vercel.json).

Run the dashboard unit tests with:

```sh
yarn --cwd components/dashboard test:unit --runInBand
```

## More information

- [Dashboard setup, Supabase persistence, and OpenRouter configuration](components/dashboard/README.md)
- [SAI dashboard source](components/dashboard/src/sai/)
