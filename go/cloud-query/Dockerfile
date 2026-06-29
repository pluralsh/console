FROM golang:1.26.4 AS builder

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

ARG BUILD_TIME=1970-01-01T00:00:00Z
ARG GIT_COMMIT=unknown
ARG VERSION=dev

LABEL org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.authors="Plural Labs, Inc." \
      org.opencontainers.image.url="https://www.plural.sh" \
      org.opencontainers.image.documentation="https://github.com/pluralsh/console/tree/master/go/cloud-query" \
      org.opencontainers.image.source="https://github.com/pluralsh/console/tree/master/go/cloud-query" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.ref.name="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="Plural" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="Cloud Query" \
      org.opencontainers.image.description="Cloud query service for Plural Console" \
      org.opencontainers.image.base.name="cgr.dev/chainguard/wolfi-base" \
      org.opencontainers.image.rebuild-trigger="2026-06-26-cloud-query"

# Copy cloud-query and steampipe extensions
COPY --from=builder /workspace/bin/cloud-query /usr/local/bin/cloud-query

USER nonroot

CMD ["/usr/local/bin/cloud-query"]