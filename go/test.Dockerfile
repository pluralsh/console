FROM golang:1.26.1

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

CMD ["sh", "-c", "go test ./..."]
