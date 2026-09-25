ARG MODEL_ID=nomic-ai/nomic-embed-text-v1.5
ARG MODEL_REVISION=e9b6763023c676ca8431644204f50c2b100d9aab
ARG SERVED_MODEL_NAME=nomic-ai/nomic-embed-text-v1.5
ARG TEI_IMAGE=ghcr.io/huggingface/text-embeddings-inference:cpu-1.9@sha256:8419f533857b503ebf6ec292a95d4f1cf9c0464ac8b8abeef39518cf110e5726
ARG TEI_VERSION=1.9.4
ARG IMAGE_VERSION=dev
ARG GIT_COMMIT=unknown

FROM python:3.12-slim-bookworm@sha256:392307d22300de8b5986851a12d9176dfc0fc073e65bf6523ebd7dcbeb23564e AS model

ARG MODEL_ID
ARG MODEL_REVISION

ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV MODEL_ID=${MODEL_ID}
ENV MODEL_REVISION=${MODEL_REVISION}

RUN pip install --no-cache-dir huggingface_hub==1.32.0

RUN python -c 'import os; from huggingface_hub import snapshot_download; snapshot_download(repo_id=os.environ["MODEL_ID"], revision=os.environ["MODEL_REVISION"], local_dir="/model", ignore_patterns=["onnx/**"])'

FROM ${TEI_IMAGE} AS runtime

ARG MODEL_ID
ARG MODEL_REVISION
ARG SERVED_MODEL_NAME
ARG TEI_VERSION
ARG IMAGE_VERSION
ARG GIT_COMMIT

COPY --from=model /model /model

LABEL org.opencontainers.image.title="Plural OpenAI-compatible embedding server" \
      org.opencontainers.image.description="Air-gapped Text Embeddings Inference server with a baked public model" \
      org.opencontainers.image.source="https://github.com/pluralsh/console/tree/master/rust/embedding-server" \
      org.opencontainers.image.version=${IMAGE_VERSION} \
      org.opencontainers.image.revision=${GIT_COMMIT} \
      org.opencontainers.image.model.id=${MODEL_ID} \
      org.opencontainers.image.model.revision=${MODEL_REVISION} \
      org.opencontainers.image.model.source=https://huggingface.co/${MODEL_ID} \
      org.opencontainers.image.tei.version=${TEI_VERSION} \
      org.opencontainers.image.tei.source="https://github.com/huggingface/text-embeddings-inference"

ENV MODEL_ID=/model \
    SERVED_MODEL_NAME=${SERVED_MODEL_NAME} \
    HF_HUB_OFFLINE=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_DATASETS_OFFLINE=1 \
    HUGGINGFACE_HUB_CACHE=/model/.cache \
    PORT=80

EXPOSE 80

# The upstream image provides the text-embeddings-router entrypoint and its
# default --json-output argument. MODEL_ID and SERVED_MODEL_NAME are supplied
# through the environment so this wrapper does not replace that entrypoint.
