FROM rust:1.98.1-bookworm AS builder

WORKDIR /src

RUN apt-get update \
    && apt-get install -y --no-install-recommends cmake g++ pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --locked --release --bin ferrotunnel-client

FROM gcr.io/distroless/cc-debian12:nonroot

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /src/target/release/ferrotunnel-client /ferrotunnel-client

USER nonroot:nonroot

ENTRYPOINT ["/ferrotunnel-client"]
