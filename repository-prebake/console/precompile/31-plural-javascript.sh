#!/usr/bin/env bash
# Install Plural's vendored Yarn workspace dependencies.
set -euo pipefail

cd /data/plural/www
eval "$(mise activate bash --shims)"

# Match plural/www/Dockerfile and avoid installing git hooks in the image.
export HUSKY=0
node .yarn/releases/yarn-4.17.1.cjs install --immutable
