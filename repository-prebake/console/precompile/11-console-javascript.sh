#!/usr/bin/env bash
# Install Console's vendored Yarn workspace dependencies.
set -euo pipefail

cd /data/console/js
eval "$(mise activate bash --shims)"

node .yarn/releases/yarn-4.17.1.cjs install --immutable
