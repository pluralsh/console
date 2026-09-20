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
FROM alpine:3.21.3@sha256:a8560b36e8b8210634f77d9f7f9efd7ffa463e380b75e2e74aff4511df3ef88c

# Install necessary dependencies to run Go binaries
RUN apk --no-cache add ca-certificates

# Set the Current Working Directory inside the container
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app

# Copy the Go binary from the build stage
COPY --chown=app:app --from=build /app/flaky-service .

# Expose the port your app will run on (adjust if needed)
USER app
EXPOSE 8080
EXPOSE 8081

# Command to run the application
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8081/metrics"]
CMD ["./flaky-service", "--response-behavior-modifier=timestamp", "--behavior-modifier-timestamp-modulus=3"]
