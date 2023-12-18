#!/usr/bin/env bash

# Exit on error
set -e

cd $(dirname $0)/..

source hack/lib.sh

CONTAINERIZE_IMAGE=golang:1.21.1 containerize ./hack/gen-client-mocks.sh

go run github.com/vektra/mockery/v2@latest  --dir=internal/client --name=ConsoleClient --output=internal/test/mocks