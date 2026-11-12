# SAI Cloud Dev Platform

A standalone SAI workspace dashboard built with React and TypeScript. It opens directly into an interactive overview with workspace, repository, organization, settings, and AI Studio screens. The local demo does not require a SAI account, Kubernetes cluster, or remote platform service.

## Run locally

From the repository root:

```sh
yarn --cwd components/dashboard start
```

The development server binds to `0.0.0.0` and serves the app on port `3000` by default. Hot reload works in local and proxied preview environments.

## Local demo data

The mock API in `src/sai/local-api.ts` seeds sample SAI projects and stores workspace, repository, organization, and preference changes in this browser's `localStorage` under `sai.cloud-platform.v1`. Use **Settings → Reset demo data** to restore the starter state.

This is not a cloud compute service: workspace actions update local demo state and do not provision machines or clone repositories. No Git credentials are requested or stored.

## OpenRouter AI Studio

Open **AI Studio** in the sidebar to use the configured OpenRouter models:

- Poolside — `poolside/laguna-s-2.1` (standard model; usage may be billed)
- NVIDIA — `nvidia/llama-nemotron-embed-vl-1b-v2` (embeddings)
- Cohere — `cohere/north-mini-code:free`
- Perplexity — `perplexity/pplx-decider-flash-v1.3:free`

Paste your own OpenRouter API key in the AI Studio panel and verify it. The key is kept only in JavaScript memory for the current browser tab; SAI does not save it to local or session storage. Chat prompts and embedding inputs are sent directly from the browser to OpenRouter, and then handled by the selected model provider. Review OpenRouter/provider policies before sending private code or other sensitive data. Free-tier models can have usage limits; paid model usage may incur charges. For a production deployment, use an authenticated server-side proxy instead of exposing a key in browser code.
