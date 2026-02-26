#!/usr/bin/env bash

# Exit on error
set -e

KAS_DIR="$(cd $(dirname "${BASH_SOURCE}")/.. && pwd -P)"
ROOT_DIR="${KAS_DIR}/../.."
BINARIES_DIR="${ROOT_DIR}/binaries"
PROTOC="${BINARIES_DIR}/protoc"

function plrl::protoc::generate() {
  local package=${1}
  local files=$(find "${package}" -name "*.proto")

  for proto in ${files}; do
    local baseDir="${proto%/*}"
    local filename="${proto##*/}"

    ${PROTOC} \
      -I"${KAS_DIR}" \
      -I"${KAS_DIR}/build/proto" \
      --plugin=protoc-gen-go="${BINARIES_DIR}/protoc-gen-go" \
      --plugin=protoc-gen-go-grpc="${BINARIES_DIR}/protoc-gen-go-grpc" \
      --plugin=protoc-gen-validate="${BINARIES_DIR}/protoc-gen-validate" \
      --plugin=protoc-gen-doc="${BINARIES_DIR}/protoc-gen-doc" \
      --proto_path="${baseDir}" \
      --go_out="${KAS_DIR}" \
      --go_opt=paths=source_relative \
      --go-grpc_out="${KAS_DIR}" \
      --go-grpc_opt=paths=source_relative \
      --validate_out="${KAS_DIR}" \
      --validate_opt=paths=source_relative,lang=go \
      --doc_out="${KAS_DIR}" \
      --doc_opt=markdown,"${filename%.*}_proto_docs.md",source_relative \
      "${baseDir}/${filename}"
  done
}

plrl::protoc::generate "${KAS_DIR}/cmd"
plrl::protoc::generate "${KAS_DIR}/pkg"