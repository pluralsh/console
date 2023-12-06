#!/usr/bin/env bash

set -euo pipefail

cd $(dirname $0)/..

source hack/lib.sh

CONTAINERIZE_IMAGE=golang:1.21.1 containerize ./hack/gen-client-mocks.sh

go run github.com/vektra/mockery/v2@latest  --dir=pkg/client --name=ConsoleClient --output=pkg/test/mocks