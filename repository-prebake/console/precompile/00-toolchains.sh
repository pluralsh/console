#!/usr/bin/env bash
# Install the shared toolchains used by the prebaked repositories.
set -euo pipefail

cd /data/console

export MISE_YES=1
mise trust --all || true
mise install
# Console's .tool-versions does not include Go; Node comes from js/.tool-versions.
mise use -g go@1.27.1 "node@$(awk '$1 == "nodejs" { print $2 }' js/.tool-versions)"
