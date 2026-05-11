FROM golang:1.26.2-alpine AS builder

WORKDIR /workspace

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the MCP server binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o terraform-mcpserver cmd/mcpserver/terraform-server/main.go

# Use a minimal base image
FROM alpine:3.22.1

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /workspace/terraform-mcpserver .

# Expose stdio for MCP communication
# The MCP server uses stdio transport, so no network ports needed

# Run the MCP server
CMD ["./terraform-mcpserver"]
