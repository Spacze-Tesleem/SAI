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

yarn --cwd components/dashboard build
