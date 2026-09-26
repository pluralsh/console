# Step 1: Build the Go binary
FROM golang:1.27.1 AS build

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy the go.mod and go.sum files
COPY go.mod go.sum ./

# Download all Go dependencies (you can cache these layers if the go.mod and go.sum are not changing)
RUN go mod tidy

# Copy the entire project to the container's /app directory
COPY . .

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flaky-service .

# Step 2: Create a smaller image to run the application
FROM alpine:3.22@sha256:5291449c3df73caf6ed85e649dec1b9e818b39a5d8c871e97afc13e9cd5e8fa8

# Install necessary dependencies to run Go binaries
RUN apk --no-cache add ca-certificates

RUN addgroup -S app && adduser -S -G app app

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy the Go binary from the build stage
COPY --from=build --chown=app:app /app/flaky-service ./flaky-service

# Expose the port your app will run on (adjust if needed)
EXPOSE 8080
EXPOSE 8081

USER app

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8081/metrics || exit 1

# Command to run the application
CMD ["./flaky-service", "--response-behavior-modifier=timestamp", "--behavior-modifier-timestamp-modulus=3"]
