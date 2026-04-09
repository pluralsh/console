FROM golang:1.26.2-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

COPY . .

ARG PACKAGE=./cmd/proxy
ARG TARGETOS=linux
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS="${TARGETOS}" GOARCH="${TARGETARCH:-$(go env GOARCH)}" \
    go build -trimpath -ldflags="-s -w" -o /out/observability-proxy "${PACKAGE}"

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=builder /out/observability-proxy /app/observability-proxy

EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["/app/observability-proxy"]
