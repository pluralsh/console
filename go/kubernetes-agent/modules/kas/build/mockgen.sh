#!/usr/bin/env bash

KAS_DIR="$(cd $(dirname "${BASH_SOURCE}")/.. && pwd -P)"
ROOT_DIR="${KAS_DIR}/../.."
BINARIES_DIR="${ROOT_DIR}/binaries"

${BINARIES_DIR}/mockgen -typed "$@"
