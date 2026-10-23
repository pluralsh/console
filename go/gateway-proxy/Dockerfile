FROM dhi.io/golang:1.27.3-alpine3.23-dev AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o gateway-proxy ./cmd

FROM dhi.io/static:20250419-debian13

LABEL org.opencontainers.image.authors="Plural Labs, Inc." \
      org.opencontainers.image.url="https://www.plural.sh" \
      org.opencontainers.image.source="https://github.com/pluralsh/console/tree/master/go/gateway-proxy" \
      org.opencontainers.image.vendor="Plural" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="gateway-proxy" \
      org.opencontainers.image.description="Anthropic Messages API proxy for Bedrock-invoke FM gateways"

WORKDIR /app
COPY --from=builder /build/gateway-proxy /app/gateway-proxy

EXPOSE 8080
USER 65532:65532

ENTRYPOINT ["/app/gateway-proxy"]
