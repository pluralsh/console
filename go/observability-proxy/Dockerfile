FROM golang:1.26.1-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

COPY . .

ARG PACKAGE=./cmd/proxy
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/observability-proxy ${PACKAGE}

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=builder /out/observability-proxy /app/observability-proxy

EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["/app/observability-proxy"]
