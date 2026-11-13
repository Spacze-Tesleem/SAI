#!/bin/sh
set -eu

# The regular Gitpod/Leeway build compiles these workspace libraries first.
# Vercel's Yarn install links their source workspaces but does not produce the
# `lib/` output consumed by the dashboard, so build the transitive libraries here.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

yarn workspace @gitpod/gitpod-protocol build
yarn workspace @gitpod/public-api build
yarn workspace @gitpod/public-api-common build

# Vercel is static and has no Gitpod API/WebSocket backend. Hand app routes
# off to the hosted Ona dashboard instead of booting the legacy Gitpod app.
REACT_APP_GITPOD_MINIMAL_MODE=true yarn --cwd components/dashboard build
