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
FROM alpine:3.23.4

# Install necessary dependencies to run Go binaries
RUN apk --no-cache add ca-certificates

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy the Go binary from the build stage
COPY --chown=65532:65532 --from=build /app/flaky-service .

# Expose the port your app will run on (adjust if needed)
EXPOSE 8080
EXPOSE 8081

USER 65532:65532

# Command to run the application
CMD ["./flaky-service", "--response-behavior-modifier=timestamp", "--behavior-modifier-timestamp-modulus=3"]
