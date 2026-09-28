# Embedding server

This image packages Hugging Face Text Embeddings Inference with a public model
downloaded at build time. The default image serves
`nomic-ai/nomic-embed-text-v1.5` through the OpenAI-compatible
`POST /v1/embeddings` endpoint.

The model is baked into `/model` at immutable revision
`e9b6763023c676ca8431644204f50c2b100d9aab`. Runtime Hugging Face access is
disabled. The default model returns 512-dimensional vectors, which matches
the Console vector-store contract.

## Local workflow

Run these commands from this directory:

```sh
make build
make smoke-test
make run
```

`make run` listens on `http://127.0.0.1:8080`. The smoke test uses an internal
Docker network, waits for TEI readiness, checks both single and batched
OpenAI requests, and verifies 512 finite values per vector.

The image build accepts public model overrides:

```sh
make build \
  MODEL_ID=sentence-transformers/all-mpnet-base-v2 \
  MODEL_REVISION=<immutable-commit> \
  SERVED_MODEL_NAME=sentence-transformers/all-mpnet-base-v2
```

The model must be compatible with TEI and available publicly on Hugging Face.
The default TEI image is pinned by architecture-specific digest. Override
`TEI_IMAGE` and `TEI_VERSION` together when using another public TEI release.

## Proxy contract

Configure an OpenAI-compatible AI proxy to use the service as its embeddings
upstream. In the chart, the service URL is:

```text
http://console-embedding-server:80/v1
```

The proxy should send the served model name and `dimensions: 512`. This image
does not select query or document prompt modes and does not add Nomic-specific
task prefixes. The caller owns routing and authentication.

## Release image

The release workflow publishes only to GHCR:

```text
ghcr.io/pluralsh/embedding-server:vX.Y.Z
ghcr.io/pluralsh/embedding-server:sha-<short-commit>
```

Release tags must use `rust/embedding-server/vX.Y.Z`. The amd64 and arm64
images use the pinned TEI CPU images in the Makefile and release workflow.
The image labels identify the model ID, model revision, TEI version, source
repository, image version, and Git commit.
