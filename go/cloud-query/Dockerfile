FROM golang:1.25 AS builder

WORKDIR /workspace

# Add the Go binary directory to the PATH
RUN export PATH="$PATH:$(go env GOPATH)/bin"

# pre-copy/cache dependencies
COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ cmd/
COPY api/ api/
COPY internal/ internal/

# Build the cloud-query binary
RUN CGO_ENABLED=0 go build -o bin/cloud-query cmd/*.go

FROM cgr.dev/chainguard/wolfi-base AS final

# Copy cloud-query and steampipe extensions
COPY --from=builder /workspace/bin/cloud-query /usr/local/bin/cloud-query

USER nonroot

CMD ["/usr/local/bin/cloud-query"]