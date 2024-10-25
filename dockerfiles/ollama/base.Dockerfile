ARG OLLAMA_BASE_MODEL=llama3

FROM debian:12-slim AS base

WORKDIR /workspace

RUN apt-get -y update && apt-get -y install curl unzip

RUN curl -#LO https://github.com/atkrad/wait4x/releases/latest/download/wait4x-linux-amd64.tar.gz && \
  tar --one-top-level -xvf wait4x-linux-amd64.tar.gz

FROM ollama/ollama
ARG OLLAMA_BASE_MODEL
COPY --from=base /workspace/wait4x-linux-amd64/wait4x /usr/local/bin/wait4x

RUN nohup bash -c "ollama serve &" && wait4x http http://127.0.0.1:11434 && ollama pull ${OLLAMA_BASE_MODEL}
