#!/usr/bin/env bash
# Install the shared toolchains used by the prebaked repositories.
set -euo pipefail

cd /data/console

export MISE_YES=1
mise trust --all || true
mise install
# Console's .tool-versions does not include Go or Node.
mise use -g go@1.27.1 node@24.11.1
