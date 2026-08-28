FROM golang:1.26.6

ARG MODULE_PATH

WORKDIR /workspace
COPY go ./go
COPY charts ./charts

# Install system deps needed by tools install targets.
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*

# Install tools.
WORKDIR /workspace/go/tools
RUN make tools

WORKDIR /workspace/${MODULE_PATH}
RUN go mod download

# Create nonroot user.
RUN addgroup --gid 65532 nonroot && \
    adduser --uid 65532 --gid 65532 --disabled-password --gecos "" --home /home/nonroot nonroot && \
    mkdir -p /home/nonroot/.cache /workspace/binaries && \
    chown -R 65532:65532 /workspace /go /home/nonroot

ENV HOME=/home/nonroot \
    GOCACHE=/home/nonroot/.cache/go-build

USER 65532:65532

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=5 \
  CMD kill -0 1 || exit 1

CMD ["sh", "-c", "go test ./..."]
